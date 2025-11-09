"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Verificar si estamos en un entorno compatible con Farcaster
// Detectar si estamos en un entorno de Farcaster
const isFarcasterFrame = typeof window !== 'undefined' && 
  (window as any).frameContext !== undefined;

// Detectar si estamos en modo desarrollo
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   process.env.NODE_ENV === 'development');

// Crear conectores dependiendo del entorno
const getConnectors = () => {
  if (isFarcasterFrame) {
    // En entorno de Farcaster: usar conector específico
    return [farcasterMiniApp()];
  } else if (isDevelopment) {
    // En desarrollo: permitir MetaMask para pruebas
    // En desarrollo: permitir MetaMask para pruebas
    return [
      injected({
        // Opciones para manejar mejor el conflicto con otras extensiones
        shimDisconnect: true,
      })
    ];
  } else {
    // En producción pero fuera de Farcaster: usar conector de Farcaster como fallback
    return [farcasterMiniApp()];
  }
};

const connectors = getConnectors(); // Usar MetaMask como fallback

const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors: getConnectors(),
  transports: {
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function FrameWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
