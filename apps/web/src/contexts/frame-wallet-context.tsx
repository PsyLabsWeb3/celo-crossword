"use client";

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Verificar si estamos en un entorno compatible con Farcaster
const isFarcasterFrame = typeof window !== 'undefined' && 
  (window as any).frameContext !== undefined;

// Crear conectores dependiendo del entorno
const connectors = isFarcasterFrame 
  ? [farcasterMiniApp()] 
  : [
      injected({
        target: "metaMask",
        // Opciones para manejar mejor el conflicto con otras extensiones
        shimDisconnect: true,
        shimChainChangedDisconnect: false,
        unstable_shimOnConnectSelectAccount: true,
      })
    ]; // Usar MetaMask como fallback

const config = createConfig({
  chains: [celo, celoAlfajores],
  connectors,
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
