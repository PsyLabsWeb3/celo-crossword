"use client"

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useMiniApp } from '@/contexts/miniapp-context';
import { Menu } from "lucide-react";

export default function NavbarNeo() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { context } = useMiniApp();

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderWalletButton = (isMobile = false) => {
    if (!mounted) {
      return (
        <button
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-6 sm:text-base'}`}
        >
          Conect Wallet
        </button>
      );
    }

    if (!isConnected) {
      const frameConnector = connectors.find(connector => connector.id === 'frameWallet');

      return (
        <button
          onClick={() => frameConnector && connect({ connector: frameConnector })}
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-6 sm:text-base'}`}
        >
          Conect Wallet
        </button>
      );
    }

    return (
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-2'}`}>
        <button
          type="button"
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-4 sm:text-base'}`}
        >
          Celo
        </button>

        <button
          onClick={() => disconnect()}
          type="button"
          className={`bg-[#27F52A] px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-[#27F52A] hover:shadow-none ${isMobile ? 'w-full' : 'sm:px-6 sm:text-base'}`}
        >
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
        </button>
      </div>
    );
  };

  return (
    <nav className="border-b-4 border-black bg-[#AD27F5] p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)] relative">
      <div className="container flex items-center justify-between mx-auto max-w-7xl">
        {/* Mobile menu button - positioned in top-left corner */}
        <div className="flex items-center gap-3">
          <button 
            className="p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
            <span className="sr-only">Toggle menu</span>
          </button>
          <h1 className="text-xl font-black uppercase text-foreground sm:text-2xl md:text-3xl">Defi Crossword</h1>
        </div>

        {/* Desktop wallet button - hidden on mobile */}
        <div className="hidden md:flex">
          {renderWalletButton(false)}
        </div>
      </div>

      {/* Mobile dropdown menu that expands downward */}
      {isMenuOpen && (
        <div className="container mx-auto mt-3 max-w-7xl">
          <div className="flex flex-col gap-3 p-3 bg-[#AD27F5]">
            {renderWalletButton(true)}
          </div>
        </div>
      )}
    </nav>
  )
}