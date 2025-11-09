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
    console.log("Connectors disponibles:", connectors.map(c => ({ id: c.id, name: c.name }))); // Línea de depuración
    
    // Buscar el conector de frame si está disponible (en entorno de Farcaster)
    const frameConnector = connectors.find(connector => connector.id === 'frameWallet')
    // Buscar el conector inyectado (como MetaMask) si está disponible
    const injectedConnector = connectors.find(connector => connector.id === 'injected')
    
    // En algunos casos, el conector inyectado puede tener un ID diferente como 'metaMask'
    const metamaskConnector = connectors.find(connector => connector.id === 'metaMask')

    // Priorizar frameConnector, luego injected, luego metamask como fallback
    const connectorToUse = frameConnector || injectedConnector || metamaskConnector

    return (
      <button
        onClick={() => connectorToUse && connect({ connector: connectorToUse })}
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
