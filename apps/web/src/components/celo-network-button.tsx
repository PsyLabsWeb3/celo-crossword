'use client';

import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { celo, celoAlfajores } from 'wagmi/chains';
import { defineChain } from 'viem';
import { Wallet, AlertCircle } from 'lucide-react';
import { useCeloNetworkValidation } from '@/hooks/useCeloNetworkValidation';
import { useEffect, useState } from 'react';

// Define Celo Sepolia chain
const celoSepolia = defineChain({
  id: 11142220,
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

interface CeloNetworkButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
}

export function CeloNetworkButton({
  children,
  onClick,
  disabled,
  className,
  variant = 'default'
}: CeloNetworkButtonProps) {
  const { isConnected, isConnecting } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { switchChain, isPending } = useSwitchChain();
  const { 
    isOnCeloNetwork, 
    currentChainId,
    celoChainIds 
  } = useCeloNetworkValidation();
  
  const [isSwitching, setIsSwitching] = useState(false);

  const handleConnect = () => {
    if (!isConnected) {
      // Prefer connecting to Celo Sepolia by default
      const injectedConnector = connectors.find(c => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      } else if (connectors.length > 0) {
        connect({ connector: connectors[0] });
      }
    }
  };

  const handleSwitchToCelo = () => {
    if (isConnected && !isOnCeloNetwork) {
      setIsSwitching(true);
      // Try to switch to Celo Sepolia first, then Celo mainnet, then Alfajores
      const preferredChainId = celoSepolia.id;
      switchChain({ chainId: preferredChainId as any });
    }
  };

  // Reset switching state when network changes
  useEffect(() => {
    if (isSwitching && isOnCeloNetwork) {
      setIsSwitching(false);
    }
  }, [isOnCeloNetwork, isSwitching]);

  // Determine button behavior based on current state
  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={disabled || isConnecting}
        className={className}
        variant={variant}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  if (!isOnCeloNetwork) {
    return (
      <Button
        onClick={handleSwitchToCelo}
        disabled={disabled || isPending || isSwitching}
        className={className}
        variant={variant}
      >
        <AlertCircle className="mr-2 h-4 w-4" />
        {isSwitching ? 'Changing network...' : 'Switch to Celo'}
      </Button>
    );
  }

  // If connected to Celo network, render the original button
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={className}
      variant={variant}
    >
      {children}
    </Button>
  );
}