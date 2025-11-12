"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi";
import CrosswordGame from "@/components/crossword-game"
import { Button } from "@/components/ui/button"
import { AlertCircle, Wallet } from "lucide-react"
import { useCrossword } from "@/contexts/crossword-context";
import { useCeloNetworkValidation } from "@/hooks/useCeloNetworkValidation";
import { CeloNetworkButton } from "@/components/celo-network-button";

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
    <div className="w-12 h-12 mx-auto text-foreground flex items-center justify-center text-4xl font-black">
      {alphabet[currentLetter]}
    </div>
  );
};

export default function Page() {
  const [walletConnected, setWalletConnected] = useState(false)
  
  // Verificar si hay progreso guardado del usuario en localStorage
  const hasSavedUserProgress = typeof window !== 'undefined' && localStorage.getItem("crossword_user_progress") !== null;
  
  // Verificar si hay crucigrama guardado en admin
  const hasSavedCrosswordData = typeof window !== 'undefined' && localStorage.getItem("crossword_admin_data") !== null;
  
  // Considerar que hay un crucigrama para continuar si hay progreso guardado del usuario
  const hasSavedCrossword = hasSavedUserProgress && hasSavedCrosswordData;
  
  const [gameStarted, setGameStarted] = useState(false)
  // Estado para controlar si se debe ignorar los datos guardados
  const [ignoreSavedData, setIgnoreSavedData] = useState(false)

  // Use actual wallet connection state
  const { isConnected } = useAccount();
  const { refetchCrossword } = useCrossword();
  
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
    // No borrar el crucigrama guardado en admin_data - este contiene el crucigrama actual
    // Solo limpiar el progreso del usuario, no el crucigrama base
    if (typeof window !== 'undefined') {
      localStorage.removeItem("crossword_user_progress");
    }
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
                Daily Crossword
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Click a cell to select, then start typing. Use arrow keys to navigate.
              </p>
            </div>
            <CrosswordGame 
              ignoreSavedData={ignoreSavedData} 
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
                className="bg-white border-2 border-black animate-pulse"
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
              Crucigrama Web3
            </h1>

            <p className="max-w-lg mx-auto text-lg font-bold text-pretty text-muted-foreground md:text-xl">
              Completa el crucigrama y compite por premios increíbles. ¡Los primeros 10 ganadores se llevan todo!
            </p>
          </div>

          <div className="space-y-4">
            <CeloNetworkButton
              onClick={handleStartNewGame}
              className="h-auto w-full border-4 border-black bg-accent px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-accent active:bg-accent hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto"
            >
              Iniciar Crucigrama
            </CeloNetworkButton>
            {hasSavedCrossword && (
              <CeloNetworkButton
                variant="secondary"
                onClick={handleContinueGame}
                className="h-auto w-full border-4 border-black bg-primary px-8 py-6 text-2xl font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-2 hover:translate-y-2 active:translate-x-2 active:translate-y-2 hover:bg-primary active:bg-primary hover:shadow-none active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:w-auto"
              >
                Continuar Crucigrama
              </CeloNetworkButton>
            )}
          </div>

          {/* Features */}
          <div className="grid gap-4 mt-12 sm:grid-cols-3">
            {[
              { emoji: "🏆", text: "Premios para top 10" },
              { emoji: "⚡", text: "Respuestas instantáneas" },
              { emoji: "🎯", text: "Desafíos diarios" },
            ].map((feature, i) => (
              <div
                key={i}
                className="border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
              >
                <div className="text-3xl">{feature.emoji}</div>
                <p className="mt-2 text-sm font-black uppercase text-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
