"use client"

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { toast } from 'sonner'

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
        Connect Wallet
      </button>
    )
  }

  if (!isConnected) {
    // En entornos de Farcaster, priorizar el conector de Farcaster
    // En desarrollo, permitir otros conectores como MetaMask
    const isDevelopment = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1' ||
       process.env.NODE_ENV === 'development');
    
    let connectorToUse;
    
    if (isDevelopment) {
      // En desarrollo: buscar múltiples opciones para permitir pruebas con MetaMask
      connectorToUse = connectors.find(connector => connector.id === 'injected') ||  // Wallets inyectadas (MetaMask, etc.)
                connectors.find(connector => connector.id === 'metaMask') ||        // MetaMask específico
                connectors.find(connector => connector.id === 'farcaster') ||       // Farcaster como fallback
                connectors.find(connector => connector.id.includes('meta')) ||      // Alternativa MetaMask
                connectors.find(connector => connector.name.toLowerCase().includes('meta')); // Alternativa por nombre
    } else {
      // En producción o entornos de Farcaster: usar principalmente el conector de Farcaster
      connectorToUse = connectors.find(connector => connector.id === 'farcaster') ||      // Farcaster
                connectors.find(connector => connector.id === 'frameWallet') ||      // Frame wallet
                connectors.find(connector => connector.id === 'injected') ||         // Inyectado como fallback
                connectors.find(connector => connector.id === 'metaMask');           // MetaMask como último recurso
    }

    return (
      <button
        onClick={async () => {
          if (connectorToUse) {
            try {
              await connect({ connector: connectorToUse });
            } catch (error) {
              // En entornos de desarrollo, mostrar más información para depuración
              if (typeof window !== 'undefined' &&
                  (window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1' ||
                   process.env.NODE_ENV === 'development')) {
                toast.error(`Error al conectar: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          } else {
            toast.error("No se encontró ningún conector disponible. Asegúrate de tener instalada una wallet como MetaMask.");
          }
        }}
        type="button"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3 py-2"
      >
        Celo
      </button>

      <span className="text-sm font-medium text-foreground">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
      </span>

      <button
        onClick={() => disconnect()}
        type="button"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-destructive/90 hover:text-destructive-foreground h-10 px-3 py-2 text-destructive-foreground bg-destructive"
      >
        Disconnect
      </button>
    </div>
  )
}

export function WalletDisconnectButton() {
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  if (!isConnected) {
    return null
  }

  return (
    <button
      onClick={() => disconnect()}
      type="button"
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-destructive/90 hover:text-destructive-foreground h-10 px-4 py-2 text-destructive-foreground bg-destructive"
    >
      Disconnect
    </button>
  )
}
