"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RotateCcw, X, Trophy, Save, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useCrossword } from "@/contexts/crossword-context"
import { useAccount, useChainId } from "wagmi";
import { celo, celoAlfajores } from "wagmi/chains";
import { defineChain } from "viem";
import { useCompleteCrossword, useUserCompletedCrossword } from "@/hooks/useContract";

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

const DEFAULT_CROSSWORD = {
  gridSize: { rows: 6, cols: 10 },
  clues: [
    {
      number: 1,
      clue: "Popular JavaScript library for building UIs",
      answer: "REACT",
      row: 0,
      col: 0,
      direction: "across",
    },
    {
      number: 5,
      clue: "Programming language from Sun Microsystems",
      answer: "JAVA",
      row: 1,
      col: 6,
      direction: "across",
    },
    { number: 6, clue: "Typed superset of JavaScript", answer: "TYPESCRIPT", row: 3, col: 0, direction: "across" },
    { number: 8, clue: "React function for side effects", answer: "HOOK", row: 5, col: 2, direction: "across" },
    {
      number: 1,
      clue: "Defines paths for navigating between pages",
      answer: "ROUTER",
      row: 0,
      col: 0,
      direction: "down",
    },
    { number: 2, clue: "Static type checking for JavaScript", answer: "TYPE", row: 0, col: 4, direction: "down" },
    { number: 3, clue: "JavaScript XML syntax extension", answer: "JSX", row: 1, col: 6, direction: "down" },
  ],
}

const getStoredCrossword = () => {
  if (typeof window === "undefined") return null
  const saved = localStorage.getItem("crossword_admin_data")
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      return null
    }
  }
  return null
}

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

// Modificar CrosswordGame para aceptar una prop que indique si debe ignorar los datos guardados
interface CrosswordGameProps {
  ignoreSavedData?: boolean;
}

export default function CrosswordGame({ ignoreSavedData = false }: CrosswordGameProps) {
  const { currentCrossword, isLoading: crosswordLoading } = useCrossword();
  const { address, isConnected } = useAccount();
  const { completeCrossword, isLoading: isCompleting, isSuccess: isCompleteSuccess } = useCompleteCrossword();

  // Debug logs para entender el estado de carga del crucigrama
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("CrosswordGame - currentCrossword:", currentCrossword, "crosswordLoading:", crosswordLoading, "ignoreSavedData:", ignoreSavedData);
    }
  }, [currentCrossword, crosswordLoading, ignoreSavedData]);
  
  const [crosswordData, setCrosswordData] = useState(DEFAULT_CROSSWORD);

  // Efecto para actualizar crosswordData cuando cambia el currentCrossword del contexto
  useEffect(() => {
    if (!ignoreSavedData && currentCrossword?.data) {
      try {
        const parsedData = JSON.parse(currentCrossword.data);
        setCrosswordData(parsedData);
      } catch (e) {
        console.error("Error parsing crossword data from contract:", e);
        // Si falla el parsing, usar el crucigrama predeterminado en lugar de localStorage
        setCrosswordData(DEFAULT_CROSSWORD);
      }
    } else if (ignoreSavedData) {
      setCrosswordData(DEFAULT_CROSSWORD);
    } else if (!ignoreSavedData && !currentCrossword?.data) {
      // Si no hay datos del contrato y no se ignora los datos guardados, usar el default
      setCrosswordData(DEFAULT_CROSSWORD);
    }
  }, [currentCrossword, ignoreSavedData]); // Use entire currentCrossword object in dependency array

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
    if (!ignoreSavedData && currentCrossword?.data) {
      try {
        const stored = JSON.parse(currentCrossword.data);
        setCrosswordData(stored);
        const newGridFromClues = buildGridFromClues(stored.clues, stored.gridSize);

        // Intentar cargar el progreso del usuario compatible
        let updatedUserGrid = newGridFromClues.map((row) => row.map((cell) => (cell === null ? null : "")));

        // Cargar progreso del usuario si existe y es compatible
        if (typeof window !== 'undefined') {
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
      }
    }
  }, [currentCrossword, ignoreSavedData]); // Se ejecuta cuando cambia el crucigrama del contrato

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

  const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)

  const [userGrid, setUserGrid] = useState<(string | null)[][]>(() => {
    // Primero intentar cargar el progreso guardado del usuario
    if (typeof window !== 'undefined') {
      const savedUserProgress = localStorage.getItem("crossword_user_progress");
      if (savedUserProgress) {
        try {
          const savedGrid = JSON.parse(savedUserProgress);
          // Verificar que el tamaño del grid guardado coincida con el actual
          if (savedGrid.length === CROSSWORD_GRID.length &&
              savedGrid[0]?.length === CROSSWORD_GRID[0]?.length) {
            return savedGrid;
          }
        } catch (e) {
          console.error("Error loading user progress:", e);
        }
      }
    }
    // Si no hay progreso guardado o no coincide el tamaño, usar grid vacío
    return CROSSWORD_GRID.map((row) => row.map((cell) => (cell === null ? null : "")));
  })
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [showUsernamePopup, setShowUsernamePopup] = useState(false)
  const [username, setUsername] = useState("")
  const [mobilePopup, setMobilePopup] = useState<MobileInputPopup | null>(null)
  const [mobileInput, setMobileInput] = useState("")
  const gridRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const usernameInputRef = useRef<HTMLInputElement>(null)
  const userGridRef = useRef<(string | null)[][]>([]);
  const router = useRouter()



  useEffect(() => {
    if (mobilePopup && mobileInputRef.current) {
      mobileInputRef.current.focus()
    }
  }, [mobilePopup])

  // The storage change listener that updates crossword from localStorage has been removed
  // to ensure the crossword data comes exclusively from the blockchain.
  // Any crossword updates should now come only through the CrosswordContext which fetches from blockchain.

  // Actualizar userGridRef cada vez que cambia userGrid
  useEffect(() => {
    userGridRef.current = userGrid;
  }, [userGrid]);

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
    const complete = CROSSWORD_GRID.every((row, rowIdx) =>
      row.every((cell, colIdx) => {
        if (cell === null) return true
        return userGrid[rowIdx][colIdx]?.toUpperCase() === cell
      }),
    )

    setIsComplete(complete)
  }, [userGrid])

  useEffect(() => {
    if (showUsernamePopup && usernameInputRef.current) {
      usernameInputRef.current.focus()
    }
  }, [showUsernamePopup])

  const handleCellClick = (row: number, col: number) => {
    // If already solved this crossword, prevent any interaction
    if (alreadyCompleted) {
      alert("Ya has completado este crucigrama. No puedes editar respuestas.");
      return;
    }

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
    // If already solved this crossword, prevent any interaction
    if (alreadyCompleted) {
      return;
    }

    if (!selectedCell) return

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
    const [prevRow, prevCol] = dir === "across" ? [row, col - 1] : [row - 1, col]

    if (prevRow >= 0 && prevCol >= 0 && CROSSWORD_GRID[prevRow][prevCol] !== null) {
      setSelectedCell({ row: prevRow, col: prevCol, direction: dir })
    }
  }

  const getCellNumber = (row: number, col: number): number | null => {
    const clueAtCell = crosswordData.clues.find((c: any) => c.row === row && c.col === col)
    return clueAtCell?.number || null
  }

  const isInSelectedWord = (row: number, col: number): boolean => {
    if (!selectedCell) return false

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
    const isValid = CROSSWORD_GRID.every((row, rowIdx) =>
      row.every((cell, colIdx) => {
        if (cell === null) return true
        return userGrid[rowIdx][colIdx]?.toUpperCase() === cell
      }),
    )

    if (!isValid) {
      alert("El crucigrama no está completo o tiene errores. Por favor revisa tus respuestas.")
      return
    }

    // Check if user is connected
    if (!isConnected) {
      alert("Por favor conecta tu wallet para guardar tu resultado.");
      return;
    }

    // Check if user already completed this crossword on-chain
    if (currentCrossword?.id) {
      const alreadyCompletedCheck = await refetchCompletionStatus();
      if (alreadyCompletedCheck.data) {
        alert("Ya has completado este crucigrama. Solo puedes enviarlo una vez.");
        setAlreadyCompleted(true);
        setIsComplete(true);
        return;
      }
    }

    // Submit completion to blockchain
    if (currentCrossword?.id && address) {
      const startTime = localStorage.getItem('crossword_start_time');
      let durationMs = 0;
      if (startTime) {
        durationMs = Date.now() - parseInt(startTime, 10);
      }

      try {
        // Convert the crossword ID to bytes32 and duration to bigint
        const crosswordId = currentCrossword.id as `0x${string}`;
        const durationBigInt = BigInt(durationMs);

        // Call on-chain function to complete crossword
        await completeCrossword([crosswordId, durationBigInt]);
        
        // Update state
        setAlreadyCompleted(true);
        setIsComplete(true);
      } catch (error) {
        console.error("Error submitting crossword completion to blockchain:", error);
        alert("Error al completar el crucigrama en la blockchain: " + 
              (error instanceof Error ? error.message : "Unknown error"));
      }
    }

    setShowUsernamePopup(true)
  }

  const handleSaveUsername = () => {
    if (!username.trim()) {
      alert("Por favor ingresa tu nombre")
      return
    }

    // Get existing winners from localStorage
    const winners = JSON.parse(localStorage.getItem("crossword_winners") || "[]")

    // Add new winner with timestamp
    const newWinner = {
      username: username.trim(),
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
    setUserGrid(CROSSWORD_GRID.map((row) => row.map((cell) => (cell === null ? null : ""))))
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
    if (crosswordLoading && !ignoreSavedData) {
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
  }, [crosswordLoading, ignoreSavedData]);



  const acrossClues = crosswordData.clues.filter((c: any) => c.direction === "across")
  const downClues = crosswordData.clues.filter((c: any) => c.direction === "down")

  // Importante: Obtener el hook de refetch para permitir reload manual
  const { refetchCrossword } = useCrossword();

  // Show loading state if fetching crossword from contract
  if (crosswordLoading && !ignoreSavedData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-lg font-bold">Cargando crucigrama desde la blockchain...</p>
          {timeoutReached && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">La conexión está tomando más tiempo de lo habitual o no hay crucigrama configurado</p>
              <p className="text-xs text-muted-foreground mt-1">(Esto puede suceder en el entorno de Farcaster)</p>
              <button 
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("Attempting to refetch crossword from the blockchain after timeout");
                  }
                  refetchCrossword();
                }}
                className="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mostrar un mensaje si no hay datos del contrato pero la carga ha terminado
  if (!crosswordLoading && !currentCrossword && !ignoreSavedData) {
    if (process.env.NODE_ENV === 'development') {
      console.log("No crossword data available from blockchain contract. The admin needs to set a crossword on the blockchain.");
    }
    // The user will see the default crossword, which indicates no active crossword is set on blockchain
  }

  // Check if user is connected and on correct Celo network
  const chainId = useChainId();
  const isOnCeloNetwork = chainId === celo.id || chainId === celoAlfajores.id || chainId === celoSepolia.id;
  
  // Show network connection message if not connected to Celo
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold mb-4">Conectar Wallet Celo</h2>
        <p className="mb-4">
          Por favor conecta tu wallet para jugar y aprovechar los contratos inteligentes en la blockchain Celo.
        </p>
        <div className="text-sm text-muted-foreground mb-4">
          <p>Requisitos:</p>
          <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
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
        <h2 className="text-xl font-bold mb-4">Red No Compatible</h2>
        <p className="mb-4">
          Esta aplicación requiere la red Celo. Por favor cambia a Celo Sepolia Testnet.
        </p>
        <div className="text-sm text-muted-foreground mb-4">
          <p>Red actual: {chainId}</p>
          <p>Redes compatibles: Celo Mainnet, Celo Alfajores, Celo Sepolia</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_400px]">
        {/* Crossword Grid */}
        <div className="overflow-x-auto px-2">
          <Card className="border-4 border-black bg-card p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:p-4 md:p-6">
            <div ref={gridRef} className="mx-auto w-fit" onKeyDown={handleKeyDown} tabIndex={0}>
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${CROSSWORD_GRID[0].length}, 1fr)` }}>
                {CROSSWORD_GRID.map((row, rowIdx) =>
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
                          <div className="flex h-full items-center justify-center">
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

            <div className="mt-6 flex flex-col md:flex-row gap-3 w-full px-2">
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full md:w-auto border-4 border-black bg-white font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-y-1 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reiniciar
              </Button>
              <Button
                onClick={handleSaveCompletion}
                disabled={!isComplete || alreadyCompleted || isCompleting}
                className="w-full md:w-auto border-4 border-black bg-primary font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {(isCompleting || isCompleteSuccess) ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {alreadyCompleted ? "¡Completado!" : (isComplete ? (isCompleting ? "Guardando..." : "Guardar Resultado") : "Completa el Crucigrama")}
              </Button>
            </div>
          </Card>
        </div>

        {/* Clues Panel */}
        <div className="space-y-6 px-2">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setMobilePopup(null)}
        >
          <Card
            className="w-full max-w-md border-4 border-black bg-popover p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
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
                <X className="h-4 w-4" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowUsernamePopup(false)}
        >
          <Card
            className="w-full max-w-md border-4 border-black bg-accent p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-center">
              <Trophy className="mx-auto h-16 w-16 text-primary" />
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
                  <Trophy className="mr-2 h-4 w-4" />
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