"use client"

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

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
    // Buscar conectores disponibles (puede variar según el entorno y las extensiones instaladas)
    const availableConnectors = [
      connectors.find(connector => connector.id === 'frameWallet'), // Farcaster frame
      connectors.find(connector => connector.id === 'injected'),    // Wallets inyectadas (MetaMask, etc.)
      connectors.find(connector => connector.id === 'metaMask'),   // MetaMask específico
      connectors.find(connector => connector.id.includes('meta')), // Alternativa MetaMask
      connectors.find(connector => connector.name.toLowerCase().includes('meta')), // Alternativa por nombre
    ].filter(Boolean); // Filtrar valores nulos/undefined

    // Tomar el primer conector disponible
    const connectorToUse = availableConnectors[0];

    return (
      <button
        onClick={() => {
          if (connectorToUse) {
            console.log("Conectando con:", connectorToUse.id, connectorToUse.name); // Depuración
            connect({ connector: connectorToUse });
          } else {
            console.log("No se encontró ningún conector disponible"); // Depuración
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
