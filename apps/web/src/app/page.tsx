"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import CrosswordGame from "@/components/crossword-game"
import { Button } from "@/components/ui/button"
import { AlertCircle, Wallet } from "lucide-react"
import { useCrossword } from "@/contexts/crossword-context";
import { useCeloNetworkValidation } from "@/hooks/useCeloNetworkValidation";
import { CeloNetworkButton } from "@/components/celo-network-button";
import { useUserCompletedCrossword, useGetCrosswordCompletions } from "@/hooks/useContract";

const AlphabetAnimation = () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
  const [currentLetter, setCurrentLetter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLetter((prevLetter) => (prevLetter + 1) % alphabet.length);
    }, 100); // Change letter every 100ms

    return () => clearInterval(interval);
  }, [alphabet.length]);

  return (
    <div className="flex items-center justify-center w-12 h-12 mx-auto text-4xl font-black text-foreground">
      {alphabet[currentLetter]}
    </div>
  );
};

export default function Page() {
  const [walletConnected, setWalletConnected] = useState(false)

  // We no longer check for saved user progress in localStorage - all data is on-chain
  const hasSavedUserProgress = false;

  // We no longer check for saved crossword data in localStorage - all data is on-chain
  const hasSavedCrosswordData = false;

  // No saved crossword to continue since we're using on-chain only
  const hasSavedCrossword = false;

  const [gameStarted, setGameStarted] = useState(false)
  // Estado para controlar si se debe ignorar los datos guardados
  const [ignoreSavedData, setIgnoreSavedData] = useState(false)
  const [alreadyCompletedLocal, setAlreadyCompleted] = useState(false)

  // Use actual wallet connection state
  const { isConnected, address } = useAccount();
  const { refetchCrossword, currentCrossword } = useCrossword();

  // Check completions for the current crossword to see if user has completed it
  const { data: onChainCompletions, isLoading: isCompletionsLoading } = useGetCrosswordCompletions(
    currentCrossword?.id as `0x${string}` || `0x0000000000000000000000000000000000000000000000000000000000000000`
  );

  // Helper functions to handle both tuple-style and object-style completion data (same as in leaderboard)
  const getCompletionUser = useCallback((completion: any): string => {
    return completion.user ?? completion[0];
  }, []);

  // Check if user is in the completions list
  const userHasCompletedCrossword = useMemo(() => {
    if (!isConnected || !address || !Array.isArray(onChainCompletions) || onChainCompletions.length === 0) {
      return false;
    }

    // Normalize addresses for comparison (handle potential case differences)
    const normalizedAddress = address.toLowerCase();

    return onChainCompletions.some(completion => {
      const completionUser = getCompletionUser(completion).toLowerCase();
      return completionUser === normalizedAddress;
    });
  }, [isConnected, address, onChainCompletions]);

  // For strict requirement (only after completing current crossword), check if user is in completions
  const alreadyCompleted = (currentCrossword?.id && userHasCompletedCrossword) || alreadyCompletedLocal;


  // Validate Celo network connection
  const {
    isOnCeloNetwork,
    currentChainName,
    requiredNetworks
  } = useCeloNetworkValidation();

  // Forzar refresco del crucigrama del contrato cuando se monta la página
  useEffect(() => {
    refetchCrossword();
  }, []);

  const handleStartNewGame = () => {
    // Establecer que NO se debe ignorar los datos guardados (queremos el crucigrama actual)
    setIgnoreSavedData(false);
    setGameStarted(true)
  }

  const handleContinueGame = () => {
    // No ignorar los datos guardados al continuar
    setIgnoreSavedData(false);
    // Continuar con el crucigrama guardado
    setGameStarted(true)
  }

  if (gameStarted) {
    return (
      <>
        <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 text-center md:mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                DeFi Crossword
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Click a cell to select, then start typing.
              </p>
            </div>
            <CrosswordGame
              ignoreSavedData={ignoreSavedData}
              onCrosswordCompleted={() => setAlreadyCompleted(true)}
            />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <main className="relative flex items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
        {/* Animated crossword grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid w-full h-full grid-cols-12 gap-2 p-8 md:grid-cols-20">
            {Array.from({ length: 240 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border-4 border-black animate-pulse"
                style={{
                  animationDelay: `${(i * 50) % 3000}ms`,
                  animationDuration: "3s",
                }}
              />
            ))}
          </div>
        </div>



        {/* Main content */}
        <div className="relative z-10 w-full max-w-2xl text-center">
          <div className="mb-8 space-y-4">
            <div className="inline-block animate-bounce border-4 border-black bg-green-500 px-6 py-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <AlphabetAnimation />
            </div>

            <h1 className="text-4xl font-black leading-tight uppercase text-balance text-foreground sm:text-5xl md:text-7xl">
              Onchain Crossword
            </h1>

            <p className="max-w-lg mx-auto text-lg font-bold text-pretty text-muted-foreground md:text-xl">
              Complete the crossword and compete for amazing rewards. The winners take it all!
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 md:flex-row">
            <CeloNetworkButton
              onClick={handleStartNewGame}
              className="h-auto w-80 border-4 border-black bg-accent px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-accent active:bg-accent hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Start
            </CeloNetworkButton>


            <Link href="/history" passHref>
              <CeloNetworkButton
                variant="secondary"
                className="h-auto w-80 border-4 border-black bg-purple-500 px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-purple-500 active:bg-purple-500 hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                History
              </CeloNetworkButton>
            </Link>
            {isConnected && (hasSavedCrossword || alreadyCompleted) && currentCrossword?.id && (
              <Link href="/leaderboard" passHref>
                <CeloNetworkButton
                  variant="secondary"
                  className="h-auto w-80 border-4 border-black bg-blue-500 px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-blue-500 active:bg-blue-500 hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Leaderboard
                </CeloNetworkButton>
              </Link>
            )}
            {hasSavedCrossword && (
              <CeloNetworkButton
                variant="secondary"
                onClick={handleContinueGame}
                className="h-auto w-80 border-4 border-black bg-primary px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-primary active:bg-primary hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Continue Crossword
              </CeloNetworkButton>
            )}
          </div>

          {/* Features */}
          <div className="grid gap-4 mt-12 sm:grid-cols-3">
            {[
              {
                emoji: (
                  <div className="flex items-center justify-center">
                    <Image
                      src="/celo-logo-new.png"
                      alt="Celo Logo"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                ),
                text: "Powered by CELO"
              },
              { emoji: "🏆", text: "Prizes for the first solves" },
              {
                emoji: (
                  <div className="relative w-full h-12">
                    <Image
                      src="/psylabs-logo.webp"
                      alt="Psylabs Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                ),
                text: "Built by"
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
              >
                <div className="text-3xl flex justify-center">{feature.emoji}</div>
                <p className="mt-2 text-sm font-black uppercase text-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
