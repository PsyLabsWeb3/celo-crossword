"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RotateCcw, X, Trophy, Save, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useCrossword } from "@/contexts/crossword-context"
import { useAccount, useChainId } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { defineChain } from "viem";
import { useCompleteCrossword, useUserCompletedCrossword, useGetCurrentCrossword } from "@/hooks/useContract";
import { readContract } from 'wagmi/actions';
import { config } from '@/contexts/frame-wallet-context';
import { CONTRACTS } from "@/lib/contracts";

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



const buildGridFromClues = (clues: any[], gridSize: { rows: number; cols: number }) => {
  const grid: (string | null)[][] = Array(gridSize.rows)
    .fill(null)
    .map(() => Array(gridSize.cols).fill(null))

  clues.forEach((clue) => {
    if (clue.direction === "across") {
      for (let i = 0; i < clue.answer.length; i++) {
        if (clue.col + i < gridSize.cols) {
          grid[clue.row][clue.col + i] = clue.answer[i]
        }
      }
    } else {
      for (let i = 0; i < clue.answer.length; i++) {
        if (clue.row + i < gridSize.rows) {
          grid[clue.row + i][clue.col] = clue.answer[i]
        }
      }
    }
  })

  return grid
}

type Direction = "across" | "down"

interface SelectedCell {
  row: number
  col: number
  direction: Direction
}

interface MobileInputPopup {
  clue: { number: number; clue: string; answer: string; row: number; col: number; direction: Direction }
  direction: Direction
}



interface CrosswordGameProps {
  ignoreSavedData?: boolean;
}

export default function CrosswordGame({ ignoreSavedData = false }: CrosswordGameProps) {
  const { currentCrossword, isLoading: crosswordLoading, refetchCrossword: refetchCrosswordFromContext } = useCrossword();
  const { address, isConnected } = useAccount();
  const { completeCrossword, isLoading: isCompleting, isSuccess: isCompleteSuccess, isError: isCompleteError, txHash } = useCompleteCrossword();
  const getCurrentCrosswordHook = useGetCurrentCrossword(); // This hook will be used to refetch immediately before submission
  const chainId = useChainId();
  
  const [crosswordData, setCrosswordData] = useState<any | null>(null);

  // Efecto para actualizar crosswordData cuando cambia el currentCrossword del contexto
  useEffect(() => {
    if (currentCrossword?.data) {
      try {
        const parsedData = JSON.parse(currentCrossword.data);
        setCrosswordData(parsedData);
      } catch (e) {
        console.error("Error parsing crossword data from contract:", e);
        setCrosswordData(null);
      }
    } else {
      setCrosswordData(null);
    }
  }, [currentCrossword]);

  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [checkingCompletionStatus, setCheckingCompletionStatus] = useState(false);

  // Verificar si el usuario ya completó este crucigrama específico
  const {
    data: userCompletedData,
    isLoading: isLoadingCompletionStatus,
    refetch: refetchCompletionStatus
  } = useUserCompletedCrossword(
    currentCrossword?.id as `0x${string}` || `0x0000000000000000000000000000000000000000000000000000000000000000`,
    address as `0x${string}` || `0x0000000000000000000000000000000000000000`
  );

  // Efecto para actualizar los datos si hay nuevos datos del contrato
  useEffect(() => {
    if (currentCrossword?.data) {
      try {
        const stored = JSON.parse(currentCrossword.data);
        setCrosswordData(stored);
        const newGridFromClues = buildGridFromClues(stored.clues, stored.gridSize);

        // Intentar cargar el progreso del usuario compatible
        let updatedUserGrid = newGridFromClues.map((row) => row.map((cell) => (cell === null ? null : "")));

        // Cargar progreso del usuario si existe y es compatible (unless ignoreSavedData is true)
        if (!ignoreSavedData && typeof window !== 'undefined') {
          const savedUserProgress = localStorage.getItem("crossword_user_progress");
          if (savedUserProgress) {
            try {
              const savedGrid = JSON.parse(savedUserProgress);
              // Verificar que el tamaño del grid guardado coincida con el nuevo
              if (savedGrid.length === newGridFromClues.length &&
                  savedGrid[0]?.length === newGridFromClues[0]?.length) {
                updatedUserGrid = savedGrid;
              }
            } catch (e) {
              console.error("Error loading user progress:", e);
            }
          }
        }

        setUserGrid(updatedUserGrid);
        
        // Reset the completion check flag when the crossword changes
        setHasCheckedCompletion(false);
      } catch (e) {
        console.error("Error parsing crossword data from contract:", e);
        setCrosswordData(null); // Ensure state is null on error
      }
    } else {
      // If there's no crossword from the context, ensure our local state is null
      setCrosswordData(null);
    }
  }, [currentCrossword, ignoreSavedData]);

  // Efecto para actualizar el estado de completado desde el contrato
  // Only run once when the crossword is loaded to check completion status
  const [hasCheckedCompletion, setHasCheckedCompletion] = useState(false);
  
  useEffect(() => {
    if (isConnected && currentCrossword?.id && address && !hasCheckedCompletion) {
      refetchCompletionStatus();
      setHasCheckedCompletion(true); // Set flag to prevent repeated checks
    }
  }, [isConnected, currentCrossword?.id, address, refetchCompletionStatus, hasCheckedCompletion]);

  useEffect(() => {
    if (userCompletedData !== undefined) {
      setAlreadyCompleted(!!userCompletedData);
      if (userCompletedData) {
        setIsComplete(true);
      }
    }
  }, [userCompletedData]);




  const [userGrid, setUserGrid] = useState<(string | null)[][]>([[]]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [showUsernamePopup, setShowUsernamePopup] = useState(false)
  const [username, setUsername] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [waitingForTransaction, setWaitingForTransaction] = useState(false)
  const [mobilePopup, setMobilePopup] = useState<MobileInputPopup | null>(null)
  const [mobileInput, setMobileInput] = useState("")
  const gridRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()



  useEffect(() => {
    if (mobilePopup && mobileInputRef.current) {
      mobileInputRef.current.focus()
    }
  }, [mobilePopup])

  // The storage change listener that updates crossword from localStorage has been removed
  // to ensure the crossword data comes exclusively from the blockchain.
  // Any crossword updates should now come only through the CrosswordContext which fetches from blockchain.

  // Efecto para guardar el progreso del usuario cada vez que cambia el userGrid
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("crossword_user_progress", JSON.stringify(userGrid));
    }
  }, [userGrid])

  // Efecto para establecer el tiempo de inicio cuando se carga el juego por primera vez
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('crossword_start_time')) {
      localStorage.setItem('crossword_start_time', Date.now().toString());
    }
  }, []);

  useEffect(() => {
    if (!crosswordData) return;
    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
    const complete = CROSSWORD_GRID.every((row, rowIdx) =>
      row.every((cell, colIdx) => {
        if (cell === null) return true
        return userGrid[rowIdx][colIdx]?.toUpperCase() === cell
      }),
    )

    setIsComplete(complete)
  }, [userGrid, crosswordData])

  useEffect(() => {
    if (showUsernamePopup && usernameInputRef.current) {
      usernameInputRef.current.focus()
    }
  }, [showUsernamePopup])

  useEffect(() => {
    if (isCompleteSuccess || isCompleteError) {
      setIsSubmitting(false);
    }
  }, [isCompleteSuccess, isCompleteError]);

  useEffect(() => {
    if (isCompleteError) {
      setAlreadyCompleted(false);
      setIsComplete(false);
    }
  }, [isCompleteError]);

  // Effect to show username popup after transaction confirmation
  useEffect(() => {
    if (waitingForTransaction && isCompleteSuccess) {
      // Transaction confirmed, show the popup
      setShowUsernamePopup(true);
      setWaitingForTransaction(false);
    } else if (waitingForTransaction && isCompleteError) {
      // Transaction failed, reset waiting state and show error
      setWaitingForTransaction(false);
      alert("Error al completar el crucigrama en la blockchain. La transacción falló.");
    }
  }, [waitingForTransaction, isCompleteSuccess, isCompleteError])

  const handleCellClick = (row: number, col: number) => {
    if (alreadyCompleted) {
      alert("Ya has completado este crucigrama. No puedes editar respuestas.");
      return;
    }
    if (!crosswordData) return;
    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)

    if (CROSSWORD_GRID[row][col] === null) return

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Find which clue this cell belongs to
      let clue = null
      let direction: Direction = "across"

      // Check across clues first
      const acrossClue = crosswordData.clues.find(
        (c: any) => c.direction === "across" && c.row === row && c.col <= col && c.col + c.answer.length > col,
      )

      if (acrossClue) {
        clue = acrossClue
        direction = "across"
      } else {
        // Check down clues
        const downClue = crosswordData.clues.find(
          (c: any) => c.direction === "down" && c.col === col && c.row <= row && c.row + c.answer.length > row,
        )
        if (downClue) {
          clue = downClue
          direction = "down"
        }
      }

      if (clue) {
        // Get current answer from grid
        let currentAnswer = ""
        if (direction === "across") {
          for (let i = 0; i < clue.answer.length; i++) {
            currentAnswer += userGrid[clue.row][clue.col + i] || ""
          }
        } else {
          for (let i = 0; i < clue.answer.length; i++) {
            currentAnswer += userGrid[clue.row + i][clue.col] || ""
          }
        }
        setMobileInput(currentAnswer)
        // Ensure the clue direction is properly typed as Direction
        setMobilePopup({ 
          clue: { 
            ...clue, 
            direction: direction 
          } as { number: number; clue: string; answer: string; row: number; col: number; direction: Direction }, 
          direction 
        })
        return
      }
    }

    if (selectedCell?.row === row && selectedCell?.col === col) {
      // Toggle direction if clicking the same cell
      setSelectedCell({
        row,
        col,
        direction: selectedCell.direction === "across" ? "down" : "across",
      })
    } else {
      setSelectedCell({ row, col, direction: "across" })
    }
  }

  const handleMobileClueClick = (clue: any, direction: Direction) => {
    // Check if mobile view (screen width < 1024px)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Get current answer from grid
      let currentAnswer = ""
      if (direction === "across") {
        for (let i = 0; i < clue.answer.length; i++) {
          currentAnswer += userGrid[clue.row][clue.col + i] || ""
        }
      } else {
        for (let i = 0; i < clue.answer.length; i++) {
          currentAnswer += userGrid[clue.row + i][clue.col] || ""
        }
      }
      setMobileInput(currentAnswer)
      // Ensure the clue direction is properly typed as Direction
      setMobilePopup({ 
        clue: { 
          ...clue, 
          direction: direction 
        } as { number: number; clue: string; answer: string; row: number; col: number; direction: Direction }, 
        direction 
      })
    } else {
      // Desktop behavior - just select the cell
      setSelectedCell({ row: clue.row, col: clue.col, direction })
    }
  }

  const handleMobileSubmit = () => {
    // If already solved this crossword, prevent any interaction
    if (alreadyCompleted) {
      alert("Ya has completado este crucigrama. No puedes editar respuestas.");
      setMobilePopup(null)
      setMobileInput("")
      return;
    }

    if (!mobilePopup) return

    const { clue, direction } = mobilePopup
    const newGrid = userGrid.map((r) => [...r])

    // Fill in the answer
    const answer = mobileInput.toUpperCase().slice(0, clue.answer.length)
    if (direction === "across") {
      for (let i = 0; i < clue.answer.length; i++) {
        newGrid[clue.row][clue.col + i] = answer[i] || ""
      }
    } else {
      for (let i = 0; i < clue.answer.length; i++) {
        newGrid[clue.row + i][clue.col] = answer[i] || ""
      }
    }

    setUserGrid(newGrid)
    setMobilePopup(null)
    setMobileInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (alreadyCompleted) {
      return;
    }

    if (!selectedCell || !crosswordData) return

    const { row, col, direction } = selectedCell

    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
      // Update the cell value
      const newGrid = userGrid.map((r) => [...r])
      newGrid[row][col] = e.key.toUpperCase()
      setUserGrid(newGrid)

      // Move to next cell
      moveToNextCell(row, col, direction)
    } else if (e.key === "Backspace") {
      e.preventDefault()
      const newGrid = userGrid.map((r) => [...r])
      if (newGrid[row][col]) {
        newGrid[row][col] = ""
        setUserGrid(newGrid)
      } else {
        moveToPreviousCell(row, col, direction)
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      moveToNextCell(row, col, "across")
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      moveToPreviousCell(row, col, "across")
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      moveToNextCell(row, col, "down")
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      moveToPreviousCell(row, col, "down")
    }
  }

  const moveToNextCell = (row: number, col: number, dir: Direction) => {
    if (!crosswordData) return;
    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
    const [nextRow, nextCol] = dir === "across" ? [row, col + 1] : [row + 1, col]

    if (
      nextRow < CROSSWORD_GRID.length &&
      nextCol < CROSSWORD_GRID[0].length &&
      CROSSWORD_GRID[nextRow][nextCol] !== null
    ) {
      setSelectedCell({ row: nextRow, col: nextCol, direction: dir })
    }
  }

  const moveToPreviousCell = (row: number, col: number, dir: Direction) => {
    if (!crosswordData) return;
    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
    const [prevRow, prevCol] = dir === "across" ? [row, col - 1] : [row - 1, col]

    if (prevRow >= 0 && prevCol >= 0 && CROSSWORD_GRID[prevRow][prevCol] !== null) {
      setSelectedCell({ row: prevRow, col: prevCol, direction: dir })
    }
  }

  const getCellNumber = (row: number, col: number): number | null => {
    if (!crosswordData) return null
    const clueAtCell = crosswordData.clues.find((c: any) => c.row === row && c.col === col)
    return clueAtCell?.number || null
  }

  const isInSelectedWord = (row: number, col: number): boolean => {
    if (!selectedCell || !crosswordData) return false

    const { row: selRow, col: selCol, direction } = selectedCell

    if (direction === "across") {
      if (row !== selRow) return false
      const clue = crosswordData.clues.find(
        (c: any) => c.direction === "across" && c.row === selRow && c.col <= selCol && c.col + c.answer.length > selCol,
      )
      if (!clue) return false
      return col >= clue.col && col < clue.col + clue.answer.length
    } else {
      if (col !== selCol) return false
      const clue = crosswordData.clues.find(
        (c: any) => c.direction === "down" && c.col === selCol && c.row <= selRow && c.row + c.answer.length > selRow,
      )
      if (!clue) return false
      return row >= clue.row && row < clue.row + clue.answer.length
    }
  }

  const handleSaveCompletion = async () => {
    if (!crosswordData) return;
    console.log("handleSaveCompletion called.");

    if (isCompleting || waitingForTransaction || isSubmitting) {
      console.log("handleSaveCompletion aborted: Transaction already in progress.", { isCompleting, waitingForTransaction, isSubmitting });
      return;
    }
    setIsSubmitting(true);
    console.log("Submitting state set to true.");

    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
    const isValid = CROSSWORD_GRID.every((row, rowIdx) =>
      row.every((cell, colIdx) => {
        if (cell === null) return true;
        return userGrid[rowIdx][colIdx]?.toUpperCase() === cell;
      })
    );

    if (!isValid) {
      console.log("handleSaveCompletion aborted: Crossword is not valid.");
      alert("El crucigrama no está completo o tiene errores. Por favor revisa tus respuestas.");
      setIsSubmitting(false);
      return;
    }
    console.log("Crossword is valid.");

    if (!isConnected) {
      console.log("handleSaveCompletion aborted: Wallet not connected.");
      alert("Por favor conecta tu wallet para guardar tu resultado.");
      setIsSubmitting(false);
      return;
    }
    console.log("Wallet is connected.", { address });

    // Refetch the current crossword to make sure it hasn't been updated since we loaded it
    const currentCrosswordFromContract = await getCurrentCrosswordHook.refetch();
    
    // Check if we have a valid crossword from the contract
    let contractCrosswordId = null;
    if (currentCrosswordFromContract.data && Array.isArray(currentCrosswordFromContract.data) && currentCrosswordFromContract.data.length >= 3) {
      const [id, data, updatedAt] = currentCrosswordFromContract.data as [string, string, bigint];
      contractCrosswordId = id;
      
      // IMPORTANT: Check if the crossword has been updated since we started solving it
      if (currentCrossword?.id && currentCrossword.id !== contractCrosswordId) {
        console.log("Crossword has been updated since the user started solving. Cannot submit completion for outdated crossword.", {
          uiCrosswordId: currentCrossword.id,
          contractCrosswordId: contractCrosswordId
        });
        alert("El crucigrama ha sido actualizado por un administrador. No puedes completar un crucigrama desactualizado.");
        setIsSubmitting(false);
        setAlreadyCompleted(false);
        setIsComplete(false);
        return;
      }
    } else {
      console.log("No current crossword found on contract. Cannot submit completion.");
      alert("No se encontró un crucigrama actual en la blockchain. Por favor, inténtalo de nuevo.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (contractCrosswordId && address) {
        console.log("Checking if user has already completed this crossword...", { crosswordId: contractCrosswordId });

        // Use readContract for a direct, non-cached check
        const contractInfo = (CONTRACTS as any)[chainId]?.['CrosswordBoard'];
        if (!contractInfo) {
          throw new Error(`Contract configuration not found for chain ID: ${chainId}`);
        }

        const hasCompleted = await readContract(config, {
          address: contractInfo.address as `0x${string}`,
          abi: contractInfo.abi,
          functionName: 'userCompletedCrossword',
          args: [contractCrosswordId as `0x${string}`, address],
        });

        if (hasCompleted) {
          console.log("handleSaveCompletion aborted: User has already completed this crossword.");
          alert("Ya has completado este crucigrama. Solo puedes enviarlo una vez.");
          setAlreadyCompleted(true);
          setIsComplete(true);
          setIsSubmitting(false);
          return;
        }
        console.log("User has not completed this crossword yet.");
      } else {
        console.log("No currentCrossword.id found, skipping completion check.");
      }
    } catch (error) {
      console.error("An unexpected error occurred while checking completion status:", error);
      setIsSubmitting(false);
      alert("Hubo un error inesperado al verificar si ya has completado este crucigrama. Por favor, inténtalo de nuevo.");
      return;
    }

    console.log("Setting UI to completed state.");
    setAlreadyCompleted(true);
    setIsComplete(true);

    if (contractCrosswordId && address) {
      const startTime = localStorage.getItem('crossword_start_time');
      let durationMs = 0;
      if (startTime) {
        durationMs = Date.now() - parseInt(startTime, 10);
      }

      const crosswordId = contractCrosswordId as `0x${string}`;
      const durationBigInt = BigInt(durationMs);

      console.log("Calling completeCrossword contract function with args:", { crosswordId, duration: durationBigInt.toString() });
      completeCrossword([crosswordId, durationBigInt]);
      setWaitingForTransaction(true);
    } else {
      console.log("handleSaveCompletion: No crossword ID or address found. Showing username popup instead of calling contract.", { crosswordId: contractCrosswordId, address });
      setShowUsernamePopup(true);
      setIsSubmitting(false);
    }
  }

  const handleSaveUsername = () => {
    if (!username.trim()) {
      alert("Por favor ingresa tu nombre")
      return
    }

    // Get existing winners from localStorage
    const winners = JSON.parse(localStorage.getItem("crossword_winners") || "[]")

    // Add new winner with timestamp and address
    const newWinner = {
      username: username.trim(),
      address: address, // Save the wallet address
      completedAt: new Date().toISOString(),
      timestamp: Date.now(),
    }

    winners.push(newWinner)

    // Save to localStorage
    localStorage.setItem("crossword_winners", JSON.stringify(winners))

    // Limpiar el progreso guardado ya que se completó el crucigrama
    if (typeof window !== 'undefined') {
      localStorage.removeItem("crossword_user_progress");
      localStorage.removeItem("crossword_start_time"); // Also remove start time
    }

    // Redirect to leaderboard
    router.push("/leaderboard")
  }

  const handleReset = () => {
    if (crosswordData) {
      const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
      setUserGrid(CROSSWORD_GRID.map((row) => row.map((cell) => (cell === null ? null : ""))))
    }
    setSelectedCell(null)
    setIsComplete(false)
    setShowUsernamePopup(false)
    setUsername("")
    // Limpiar el progreso guardado
    if (typeof window !== 'undefined') {
      localStorage.removeItem("crossword_user_progress");
    }
  }

  // Create a state to manage timeout for the loading state
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [timeoutIdRef, setTimeoutIdRef] = useState<NodeJS.Timeout | null>(null);
  
  // Set up timeout to indicate that loading is taking too long
  useEffect(() => {
    if (crosswordLoading) {
      // Clear any existing timeout
      if (timeoutIdRef) {
        clearTimeout(timeoutIdRef);
      }
      
      const timeoutId = setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log("Crossword loading timeout reached, showing extended loading");
        }
        setTimeoutReached(true);
      }, 15000); // 15 seconds timeout
      
      setTimeoutIdRef(timeoutId);
    } else {
      // Reset timeout state when not loading
      setTimeoutReached(false);
      if (timeoutIdRef) {
        clearTimeout(timeoutIdRef);
        setTimeoutIdRef(null);
      }
    }
  }, [crosswordLoading]);



  // The refetchCrossword function is already obtained from context at the top of the component
  // No need to destructure it again here

  // Show loading state if fetching crossword from contract
  if (crosswordLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 mb-4 border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
          <p className="text-lg font-bold">Cargando crucigrama desde la blockchain...</p>
          {timeoutReached && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">La conexión está tomando más tiempo de lo habitual o no hay crucigrama configurado</p>
              <p className="mt-1 text-xs text-muted-foreground">(Esto puede suceder en el entorno de Farcaster)</p>
              <button 
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("Attempting to refetch crossword from the blockchain after timeout");
                  }
                  refetchCrosswordFromContext();
                }}
                className="px-4 py-2 mt-3 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Check if user is connected and on correct Celo network
  const isOnCeloNetwork = chainId === celo.id || chainId === celoAlfajores.id || chainId === celoSepolia.id;

  // Show network connection message if not connected to Celo
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">Conectar Wallet Celo</h2>
        <p className="mb-4">
          Por favor conecta tu wallet para jugar y aprovechar los contratos inteligentes en la blockchain Celo.
        </p>
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Requisitos:</p>
          <ul className="max-w-md mx-auto mt-2 text-left list-disc list-inside">
            <li>Wallet compatible con Celo (MetaMask, Valora, etc.)</li>
            <li>Conectada a la red Celo Sepolia</li>
          </ul>
        </div>
      </div>
    );
  }
  
  // Show network switch message if connected but not on Celo network
  if (!isOnCeloNetwork) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">Red No Compatible</h2>
        <p className="mb-4">
          Esta aplicación requiere la red Celo. Por favor cambia a Celo Sepolia Testnet.
        </p>
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Red actual: {chainId}</p>
          <p>Redes compatibles: Celo Mainnet, Celo Alfajores, Celo Sepolia</p>
        </div>
      </div>
    );
  }

  // After loading, if no crossword data, show message
  if (!crosswordData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">No Hay Crucigrama Activo</h2>
        <p className="mb-4">
          Actualmente no hay ningún crucigrama disponible en la blockchain.
        </p>
        <p className="text-sm text-muted-foreground">
          Un administrador necesita configurar un nuevo crucigrama para poder jugar.
        </p>
      </div>
    );
  }

  const acrossClues = crosswordData?.clues.filter((c: any) => c.direction === "across") || [];
  const downClues = crosswordData?.clues.filter((c: any) => c.direction === "down") || [];
  const currentGrid = buildGridFromClues(crosswordData.clues, crosswordData.gridSize);

  return (
    <>
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_400px]">
        {/* Crossword Grid */}
        <div className="px-2 overflow-x-auto">
          <Card className="border-4 border-black bg-card p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:p-4 md:p-6">
            <div ref={gridRef} className="mx-auto w-fit" onKeyDown={handleKeyDown} tabIndex={0}>
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${currentGrid[0].length}, 1fr)` }}>
                {currentGrid.map((row, rowIdx) =>
                  row.map((cell, colIdx) => {
                    const cellNumber = getCellNumber(rowIdx, colIdx)
                    const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                    const isHighlighted = isInSelectedWord(rowIdx, colIdx)
                    const isBlocked = cell === null
                    const userValue = userGrid[rowIdx][colIdx]
                    const isCorrect = userValue && userValue.toUpperCase() === cell

                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        onClick={() => handleCellClick(rowIdx, colIdx)}
                        className={cn(
                          "relative h-8 w-8 border-2 border-black transition-all sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14",
                          isBlocked && "bg-foreground",
                          !isBlocked &&
                            "cursor-pointer bg-white hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:shadow-none active:shadow-none",
                          isHighlighted && !isSelected && "bg-secondary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                          isSelected && "bg-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                          isCorrect && !isBlocked && "bg-accent",
                        )}
                      >
                        {cellNumber && (
                          <span className="absolute left-0.5 top-0.5 text-[6px] font-bold text-foreground sm:text-[8px] md:text-[10px]">
                            {cellNumber}
                          </span>
                        )}
                        {!isBlocked && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-xs font-black uppercase text-foreground sm:text-sm md:text-base lg:text-lg">
                              {userValue}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }),
                )}
              </div>
            </div>

            <div className="flex flex-col w-full gap-3 px-2 mt-6 md:flex-row">
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full md:w-auto border-4 border-black bg-white font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-y-1 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar
              </Button>
              <Button
                onClick={handleSaveCompletion}
                disabled={!isComplete || alreadyCompleted || isCompleting || isSubmitting}
                className="w-full md:w-auto border-4 border-black bg-primary font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isSubmitting || isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isCompleting ? "Guardando..." : "Verificando..."}
                  </>
                ) : isCompleteSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    ¡Guardado!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {alreadyCompleted ? "¡Completado!" : (isComplete ? "Guardar Resultado" : "Completa el Crucigrama")}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Clues Panel */}
        <div className="px-2 space-y-6">
          <Card className="border-4 border-black bg-popover p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-4 text-xl font-black uppercase text-foreground">Horizontal</h2>
            <div className="space-y-3">
              {acrossClues.map((clue: any) => (
                <div
                  key={`across-${clue.number}`}
                  className="cursor-pointer border-2 border-black bg-white p-3 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
                  onClick={() => handleMobileClueClick(clue, "across")}
                >
                  <span className="font-black text-primary">{clue.number}.</span>{" "}
                  <span className="text-sm text-foreground">{clue.clue}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-4 border-black bg-card p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-4 text-xl font-black uppercase text-foreground">Vertical</h2>
            <div className="space-y-3">
              {downClues.map((clue: any) => (
                <div
                  key={`down-${clue.number}`}
                  className="cursor-pointer border-2 border-black bg-white p-3 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
                  onClick={() => handleMobileClueClick(clue, "down")}
                >
                  <span className="font-black text-primary">{clue.number}.</span>{" "}
                  <span className="text-sm text-foreground">{clue.clue}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {mobilePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setMobilePopup(null)}
        >
          <Card
            className="w-full max-w-md border-4 border-black bg-popover p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black uppercase text-foreground">
                  {mobilePopup.direction === "across" ? "Horizontal" : "Vertical"} {mobilePopup.clue.number}
                </h3>
                <p className="mt-2 text-sm font-bold text-muted-foreground">{mobilePopup.clue.clue}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobilePopup(null)}
                className="border-2 border-black hover:bg-secondary active:bg-secondary"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <input
                ref={mobileInputRef}
                type="text"
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleMobileSubmit()
                  }
                }}
                maxLength={mobilePopup.clue.answer.length}
                placeholder={`${mobilePopup.clue.answer.length} letras`}
                className="w-full border-4 border-black bg-white p-4 text-center text-2xl font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => setMobilePopup(null)}
                  variant="outline"
                  className="flex-1 border-4 border-black bg-white font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleMobileSubmit}
                  className="flex-1 border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showUsernamePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowUsernamePopup(false)}
        >
          <Card
            className="w-full max-w-md border-4 border-black bg-accent p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <Trophy className="w-16 h-16 mx-auto text-primary" />
              <h3 className="mt-4 text-2xl font-black uppercase text-foreground">¡Felicidades!</h3>
              <p className="mt-2 text-sm font-bold text-muted-foreground">
                Completaste el crucigrama. Ingresa tu nombre para participar por el premio.
              </p>
            </div>

            <div className="space-y-4">
              <input
                ref={usernameInputRef}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveUsername()
                  }
                }}
                placeholder="Tu nombre o wallet"
                className="w-full border-4 border-black bg-white p-4 text-center text-xl font-black text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowUsernamePopup(false)}
                  variant="outline"
                  className="flex-1 border-4 border-black bg-white font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveUsername}
                  className="flex-1 border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}