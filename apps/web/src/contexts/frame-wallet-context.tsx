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
  useAccount,
  useDisconnect
} from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
  const { isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  // Determine allowed chains based on environment
  // In production, strictly force Celo Mainnet (42220)
  // In development, allow Celo, Alfajores, and Sepolia
  const allowedChains = isDevelopment 
    ? [celo.id, celoAlfajores.id, celoSepolia.id] 
    : [celo.id];

  const isWrongNetwork = isConnected && !allowedChains.includes(chainId as any);

  useEffect(() => {
    // Only switch if on wrong network and we haven't already tried too many times (optional logic, but basic is fine)
    if (isWrongNetwork) {
      try {
        switchChain({ chainId: celo.id });
      } catch (error) {
        console.warn("Failed to switch to Celo Mainnet:", error);
      }
    }
  }, [isWrongNetwork, switchChain]);

  // Blocking UI if on wrong network
  if (isWrongNetwork) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <div className="mx-auto bg-amber-100 dark:bg-amber-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
          </div>
          
          <h2 className="text-2xl font-black mb-2 tracking-tight">Wrong Network</h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
            You are connected to {chain?.name || "an unsupported network"}.<br/> 
            Access is restricted to <strong>Celo Mainnet</strong>.
          </p>
          
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full font-bold h-12 text-base transition-all hover:scale-[1.02]" 
              onClick={() => switchChain({ chainId: celo.id })}
            >
              Switch to Celo Mainnet
            </Button>

            <Button 
              variant="outline" 
              size="lg" 
              className="w-full font-bold h-12 text-base" 
              onClick={() => disconnect()}
            >
              Disconnect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
