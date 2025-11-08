"use client"

import { useState, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Menu } from "lucide-react";
import { useMiniApp } from "@/contexts/miniapp-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasManuallyDisconnected, setHasManuallyDisconnected] = useState(false);
  const [manualConnecting, setManualConnecting] = useState(false);
  const { address, isConnected, isConnecting: isAccountConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { context, isMiniAppReady } = useMiniApp();
  
  // Use refs to store connector and avoid re-rendering when connector objects change
  const farcasterConnectorRef = useRef(connectors.find(c => c.id === 'farcaster'));
  const hasFarcasterConnectorRef = useRef(!!farcasterConnectorRef.current);
  
  // Update refs when connectors change
  useEffect(() => {
    farcasterConnectorRef.current = connectors.find(c => c.id === 'farcaster');
    hasFarcasterConnectorRef.current = !!farcasterConnectorRef.current;
  }, [connectors]);

  // Handle manual disconnect to prevent auto-reconnect
  const handleDisconnect = async () => {
    await disconnect();
    setHasManuallyDisconnected(true);
  };

  // Set mounted state on component mount to ensure proper rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-connect wallet when miniapp is ready, but only if user hasn't manually disconnected
  useEffect(() => {
    const farcasterConnector = farcasterConnectorRef.current;
    if (isMiniAppReady && !isConnected && !isAccountConnecting && hasFarcasterConnectorRef.current && !hasManuallyDisconnected && farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  }, [isMiniAppReady, isConnected, isAccountConnecting, connect, hasManuallyDisconnected]);


  // Get frame connector for manual connection
  const farcasterConnector = connectors.find(connector => connector.id === 'farcaster');


  // Extract user data from context
  const user = context?.user;
  const walletAddress = address || user?.custody || user?.verifications?.[0] || "0x1e4B...605B";
  const pfpUrl = user?.pfpUrl;
  const displayName = user?.displayName || user?.username || "User";
  const username = user?.username || "@user";


  // Format wallet address to show first 6 and last 4 characters
  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderWalletButton = (isMobile = false) => {
    if (!mounted) {
      return (
        <button
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-6 sm:text-base'}`}
        >
          Connect Wallet
        </button>
      );
    }

    // Combine both manual and wagmi connection states
    const isConnecting = manualConnecting || isAccountConnecting;

    if (!isConnected) {
      return (
        <button
          onClick={async () => {
            setManualConnecting(true);
            const currentFarcasterConnector = connectors.find(c => c.id === 'farcaster');
            try {
              if (currentFarcasterConnector) {
                await connect({ connector: currentFarcasterConnector });
              }
            } finally {
              setManualConnecting(false);
            }
          }}
          disabled={isConnecting}
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-6 sm:text-base'} ${isConnecting ? 'opacity-70' : ''}`}
        >
          {isConnecting && (
            <svg className="inline-block w-4 h-4 mr-2 -ml-1 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      );
    }

    return (
      <div className={`flex ${isMobile ? 'flex-row gap-2' : 'items-center gap-2'} max-w-full`}>
        <button
          type="button"
          disabled
          className={`bg-[#27F52A] px-3 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${isMobile ? 'flex-1' : 'sm:px-4 sm:text-base'} cursor-default opacity-90`}
        >
          {formatAddress(address || "0x0000...0000")}
        </button>

        <button
          onClick={handleDisconnect}
          type="button"
          className={`bg-red-500 px-3 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-red-600 hover:shadow-none ${isMobile ? 'flex-1' : 'sm:px-4 sm:text-base'}`}
        >
          Disconnect
        </button>
      </div>
    );
  };



  return (
    <nav className="border-b-4 border-black bg-[#AD27F5] p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] relative">
      <div className="container grid items-center grid-cols-3 mx-auto max-w-7xl">
        {/* Menu button - far left */}
        <div className="flex justify-start">
          <button
            className="p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
            <span className="sr-only">Toggle menu</span>
          </button>
        </div>

        {/* Title - centered */}
        <div className="flex justify-center">
          {/* <h1 className="text-xl font-black text-foreground sm:text-2xl md:text-3xl">Onchain Crossword</h1> */}
        </div>

        {/* Desktop wallet button and avatar - far right */}
        <div className="flex items-center justify-end hidden gap-12 md:flex">
          {renderWalletButton(false)}
          {isMiniAppReady && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-gray-800 hover:border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.3)] transition-all">
                  {pfpUrl ? (
                    <img
                      src={pfpUrl}
                      alt="Profile"
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-800 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-2 border-gray-800 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.5)]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{displayName}</DialogTitle>
                  <DialogDescription>
                    {username.startsWith('@') ? username : `@${username}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-4">
                  <div className="flex items-center justify-center w-16 h-16 mb-4 overflow-hidden border-2 border-gray-800 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                    {pfpUrl ? (
                      <img
                        src={pfpUrl}
                        alt="Profile"
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="mb-2 text-sm text-gray-600">
                    Wallet: {formatAddress(walletAddress)}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    isConnected ? 'text-green-600' : isAccountConnecting ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : isAccountConnecting ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    {isConnected ? 'Connected' : isAccountConnecting ? 'Connecting...' : 'Disconnected'}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 font-medium transition-colors border-2 border-gray-300 rounded-lg hover:border-gray-400">
                    Cerrar
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* For mobile: avatar in the right column with md:hidden */}
        <div className="flex justify-end md:hidden">
          {isMiniAppReady && (
            <Dialog>
              <DialogTrigger asChild>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center overflow-hidden cursor-pointer border-2 border-gray-800 hover:border-gray-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,0.3)] transition-all">
                  {pfpUrl ? (
                    <img
                      src={pfpUrl}
                      alt="Profile"
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-800 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-2 border-gray-800 shadow-[5px_5px_0px_0px_rgba(0,0,0,0.5)]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">{displayName}</DialogTitle>
                  <DialogDescription>
                    {username.startsWith('@') ? username : `@${username}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-4">
                  <div className="flex items-center justify-center w-16 h-16 mb-4 overflow-hidden border-2 border-gray-800 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
                    {pfpUrl ? (
                      <img
                        src={pfpUrl}
                        alt="Profile"
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="mb-2 text-sm text-gray-600">
                    Wallet: {formatAddress(walletAddress)}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    isConnected ? 'text-green-600' : isAccountConnecting ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : isAccountConnecting ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}></div>
                    {isConnected ? 'Connected' : isAccountConnecting ? 'Connecting...' : 'Disconnected'}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 font-medium transition-colors border-2 border-gray-300 rounded-lg hover:border-gray-400">
                    Cerrar
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu that expands downward */}
      {isMenuOpen && (
        <div className="container mx-auto mt-3 max-w-7xl">
          <div className="flex flex-col gap-3 p-3 bg-[#AD27F5]">
            {renderWalletButton(true)}
            <div className="pt-3 mt-3 border-t border-white/30">
              {/* <div className="font-medium text-white">
                {displayName}
              </div> */}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}