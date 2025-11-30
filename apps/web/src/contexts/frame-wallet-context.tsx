"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useEffect } from "react";
import { 
  WagmiProvider, 
  createConfig, 
  http,
  useSwitchChain,
  useChainId,
  useAccount
} from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";

// Define Celo Sepolia chain based on the RPC URL provided
const celoSepolia = defineChain({
  id: 11142220, // Celo Sepolia Testnet chain ID
  name: 'Celo Sepolia Testnet',
  nativeCurrency: { name: 'CELO', symbol: 'A-CELO', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://forno.celo-sepolia.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Celo Explorer', url: 'https://sepolia.celoscan.io' },
  },
  testnet: true,
});

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
  } else {
    // En desarrollo o en entornos no Farcaster: permitir wallets externas como MetaMask
    return [
      injected({
        // Opciones para manejar mejor el conflicto con otras extensiones
        shimDisconnect: true,
      }),
      farcasterMiniApp() // Incluir también el conector de Farcaster como opción
    ];
  }
};

const connectors = getConnectors(); // Usar MetaMask como fallback

export const config = createConfig({
  chains: [celo, celoAlfajores, celoSepolia],
  connectors: getConnectors(),
  transports: {
    [celo.id]: http("https://celo.drpc.org", {
      batch: true,
      retryCount: 3,
    }),
    [celoAlfajores.id]: http(),
    [celoSepolia.id]: http(),
  },
  // Set Celo Mainnet as the default chain, particularly in Farcaster frame context
  ...(isFarcasterFrame ? { 
    chainId: celo.id,
    reconnectOnMount: true
  } : {}),
});

// Component to enforce network switching to Celo Mainnet
function NetworkEnforcer() {
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  useEffect(() => {
    // Only switch to Celo Mainnet if the user is connected and not already on that network
    if (isConnected && chainId !== celo.id) {
      // Switch to Celo Mainnet automatically
      try {
        switchChain({ chainId: celo.id });
      } catch (error) {
        console.warn("Failed to switch to Celo Mainnet:", error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  return null;
}

const queryClient = new QueryClient();

export default function FrameWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
        <NetworkEnforcer />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
