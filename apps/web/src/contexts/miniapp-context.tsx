"use client";
import { sdk } from "@farcaster/frame-sdk";
// Use any types for Farcaster SDK compatibility
type FrameContext = any;
type AddFrameResult = any;
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import FrameWalletProvider from "./frame-wallet-context";

interface MiniAppContextType {
  isMiniAppReady: boolean;
  context: FrameContext | null;
  setMiniAppReady: () => void;
  addMiniApp: () => Promise<AddFrameResult | null>;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

interface MiniAppProviderProps {
  addMiniAppOnLoad?: boolean;
  children: ReactNode;
}

export function MiniAppProvider({ children, addMiniAppOnLoad }: MiniAppProviderProps) {
  const [context, setContext] = useState<FrameContext | null>(null);
  const [isMiniAppReady, setIsMiniAppReady] = useState(false);

  const setMiniAppReady = useCallback(async () => {
    try {
      // Verificar que el SDK esté disponible antes de usarlo
      if (!sdk || !sdk.context || !sdk.actions) {
        console.warn("SDK no está completamente disponible");
        return;
      }
      
      const context = await sdk.context;
      if (context) {
        setContext(context);
      }
      
      await sdk.actions.ready();
    } catch (err) {
      console.error("SDK initialization error:", err);
    } finally {
      setIsMiniAppReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady().then(() => {
        console.log("MiniApp loaded");
      });
    }
  }, [isMiniAppReady, setMiniAppReady]);

  const handleAddMiniApp = useCallback(async () => {
    if (!sdk || !sdk.actions) {
      console.warn("SDK is not available to add a frame.");
      return null;
    }
  
    try {
      console.log("Attempting to call sdk.actions.addFrame()...");
      const addFrameResult = await sdk.actions.addFrame();
      console.log("sdk.actions.addFrame() result:", addFrameResult);
  
      // Defensive check to ensure the result is an object with a 'result' property
      if (addFrameResult && typeof addFrameResult === 'object' && 'result' in addFrameResult) {
        return addFrameResult;
      }
      
      console.warn("addFrame() did not return the expected object structure.");
      return null;
    } catch (error) {
      console.error("[error] adding frame:", error);
      // Log the full error object for more details
      if (error instanceof TypeError) {
        console.error("TypeError details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    // on load, set the frame as ready
    if (isMiniAppReady && !context?.client?.added && addMiniAppOnLoad) {
      // Usar setTimeout para asegurar que no se actualice durante la hidratación
      const addMiniAppTimeout = setTimeout(() => {
        handleAddMiniApp().catch(error => {
          console.error("Error adding mini app:", error);
        });
      }, 0);

      return () => clearTimeout(addMiniAppTimeout);
    }
  }, [
    isMiniAppReady,
    context?.client?.added,
    handleAddMiniApp,
    addMiniAppOnLoad,
  ]);

  return (
    <MiniAppContext.Provider
      value={{
        isMiniAppReady,
        setMiniAppReady,
        addMiniApp: handleAddMiniApp,
        context,
      }}
    >
      <FrameWalletProvider>{children}</FrameWalletProvider>
    </MiniAppContext.Provider>
  );
}

export function useMiniApp(): MiniAppContextType {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}
