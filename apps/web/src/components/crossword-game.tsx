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
import { useCompleteCrossword, useUserCompletedCrossword, useGetCurrentCrossword, useGetUserProfile } from "@/hooks/useContract";
import { useQueryClient } from '@tanstack/react-query';
import { readContract } from 'wagmi/actions';
import { config } from '@/contexts/frame-wallet-context';
import { CONTRACTS } from "@/lib/contracts";
import { sdk } from "@farcaster/frame-sdk";
import { useMiniApp } from '@/contexts/miniapp-context';

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

        // Always start with a fresh grid from the contract data, no saved progress
        let updatedUserGrid = newGridFromClues.map((row) => row.map((cell) => (cell === null ? null : "")));

        setUserGrid(updatedUserGrid);
        
        // Reset the completion check flag when the crossword changes
        setHasCheckedCompletion(false);
      } catch (e) {
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [waitingForTransaction, setWaitingForTransaction] = useState(false)
  const [mobilePopup, setMobilePopup] = useState<MobileInputPopup | null>(null)
  const [mobileInput, setMobileInput] = useState("")
  const gridRef = useRef<HTMLDivElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()



  useEffect(() => {
    if (mobilePopup && mobileInputRef.current) {
      mobileInputRef.current.focus()
    }
  }, [mobilePopup])

  // The storage change listener that updates crossword from localStorage has been removed
  // to ensure the crossword data comes exclusively from the blockchain.
  // Any crossword updates should now come only through the CrosswordContext which fetches from blockchain.



  // Initialize start time for duration calculation when the crossword starts
  const startTimeRef = useRef<number>(Date.now());

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

  // Removed focus effect for username input since the dialog no longer exists

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

  // Import the miniapp context
  const { context: miniAppContext, isMiniAppReady } = useMiniApp();

  // State for full Farcaster profile
  const [farcasterProfile, setFarcasterProfile] = useState<{
    username: string | null;
    displayName: string | null;
    pfpUrl: string | null;
  } | null>(null);

  // Effect to get and log Farcaster profile using miniapp context
  useEffect(() => {
    const fetchFarcasterProfile = async () => {
      try {
        console.log("Debug: Checking MiniApp context", { isMiniAppReady, miniAppContext });

        if (isMiniAppReady && miniAppContext?.user) {
          const user = miniAppContext.user;
          const profile = {
            username: user.username || null,
            displayName: user.displayName || user.username || null,
            pfpUrl: user.pfpUrl || null
          };

          console.log("Debug: Setting Farcaster profile from MiniApp context", profile);
          setFarcasterProfile(profile);
        } else {
          console.log("Debug: No MiniApp context or user found", { isMiniAppReady, user: miniAppContext?.user });

          // In development or when not in Farcaster context, provide fallback data for testing
          if (process.env.NODE_ENV === 'development') {
            console.log("Debug: In development mode, setting test profile data");
            setFarcasterProfile({
              username: "testuser",
              displayName: "Test User",
              pfpUrl: "https://placehold.co/200x200.png"
            });
          } else {
            setFarcasterProfile(null);
          }
        }
      } catch (error) {
        console.error("Debug: Error fetching Farcaster profile", error);
        setFarcasterProfile(null);
      }
    };

    fetchFarcasterProfile();
  }, [isMiniAppReady, miniAppContext]);

  // Log when farcasterProfile changes
  useEffect(() => {
    console.log("Debug: Farcaster profile updated", farcasterProfile);
  }, [farcasterProfile]);

  const queryClient = useQueryClient();

  // Effect to show username popup after transaction confirmation
  useEffect(() => {
    if (waitingForTransaction && isCompleteSuccess && txHash && address) {
      console.log("Debug: Transaction successful", { txHash, address, farcasterProfile });

      // Transaction confirmed, store the Farcaster profile info and redirect to leaderboard
      setWaitingForTransaction(false);

      // Store the Farcaster profile associated with this address
      const storeFarcasterProfile = async () => {
        try {
          // Get the user's Farcaster profile info from the SDK context
          if (farcasterProfile && farcasterProfile.username) {
            console.log("Debug: Storing Farcaster profile", {
              address,
              username: farcasterProfile.username,
              displayName: farcasterProfile.displayName,
              pfpUrl: farcasterProfile.pfpUrl,
              txHash
            });

            const response = await fetch('/api/store-farcaster-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: address,
                username: farcasterProfile.username,
                displayName: farcasterProfile.displayName,
                pfpUrl: farcasterProfile.pfpUrl,
                txHash: txHash,
                timestamp: Date.now()
              }),
            });

            if (!response.ok) {
              console.error('Failed to store Farcaster profile:', response.status);
            } else {
              console.log('Successfully stored Farcaster profile');
            }
          } else {
            console.log('Debug: No Farcaster profile to store or username is empty', { farcasterProfile });
          }
        } catch (error) {
          console.error('Error storing Farcaster profile:', error);
        }
      };

      storeFarcasterProfile();

      // Wait a bit for the blockchain transaction to be processed and indexed before invalidating cache
      // This helps ensure the new profile data is available when the leaderboard loads
      setTimeout(() => {
        console.log("Debug: Starting cache invalidation after transaction confirmation", {
          txHash,
          address,
          farcasterProfile
        });

        // Invalidate both getUserProfile and getCrosswordCompletions caches to ensure fresh data when going to leaderboard
        // Use the same approach as in useGetUserProfile hook to get the contract config
        const contractInfo = (CONTRACTS as any)[chainId]?.['CrosswordBoard'];
        const promises = [];

        // Invalidate user profile cache for this specific user
        // Using a predicate to match the query more reliably
        promises.push(queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return (
              Array.isArray(queryKey) &&
              queryKey[0] === 'readContract' &&
              typeof queryKey[1] === 'object' &&
              queryKey[1]?.address === contractInfo?.address &&
              queryKey[1]?.functionName === 'getUserProfile' &&
              queryKey[1]?.args?.[0]?.toLowerCase() === address?.toLowerCase()
            );
          }
        }));

        // Invalidate crossword completions cache for the current crossword
        promises.push(queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return (
              Array.isArray(queryKey) &&
              queryKey[0] === 'readContract' &&
              typeof queryKey[1] === 'object' &&
              queryKey[1]?.address === contractInfo?.address &&
              queryKey[1]?.functionName === 'getCrosswordCompletions' &&
              queryKey[1]?.args?.[0] === currentCrossword?.id
            );
          }
        }));

        // Also invalidate userCompletedCrossword cache to ensure it updates
        promises.push(queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return (
              Array.isArray(queryKey) &&
              queryKey[0] === 'readContract' &&
              typeof queryKey[1] === 'object' &&
              queryKey[1]?.address === contractInfo?.address &&
              queryKey[1]?.functionName === 'userCompletedCrossword' &&
              queryKey[1]?.args?.[0] === currentCrossword?.id &&
              queryKey[1]?.args?.[1]?.toLowerCase() === address?.toLowerCase()
            );
          }
        }));

        // Wait for cache invalidation to complete before redirecting
        Promise.all(promises).then(() => {
          console.log("Debug: All caches invalidated, preparing to redirect to leaderboard");
          // Add a small additional delay to ensure cache invalidation propagates
          setTimeout(() => {
            console.log("Debug: Redirecting to leaderboard now");
            // After cache is invalidated, redirect to leaderboard
            router.push("/leaderboard");
          }, 1000); // 1 second delay to allow cache to refresh and blockchain propagation
        }).catch(error => {
          console.error('Error invalidating cache:', error);
          // Still redirect even if cache invalidation fails
          console.log("Debug: Cache invalidation failed, but redirecting anyway");
          router.push("/leaderboard");
        });
      }, 2000); // 2 second delay to allow blockchain transaction to be confirmed before cache invalidation
    } else if (waitingForTransaction && isCompleteError) {
      // Transaction failed, reset waiting state and show error
      console.log("Debug: Transaction failed", { isCompleteError, txHash, error: txHash });
      setWaitingForTransaction(false);
      alert("Error completing the crossword on the blockchain. Transaction failed.");
    }
  }, [waitingForTransaction, isCompleteSuccess, isCompleteError, txHash, address, farcasterProfile, queryClient, chainId])

  const handleCellClick = (row: number, col: number) => {
    if (alreadyCompleted) {
      alert("You have already completed this crossword. You cannot edit answers.");
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
      alert("You have already completed this crossword. You cannot edit answers.");
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

    if (isCompleting || waitingForTransaction || isSubmitting) {
      return;
    }
    setIsSubmitting(true);

    const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
    const isValid = CROSSWORD_GRID.every((row, rowIdx) =>
      row.every((cell, colIdx) => {
        if (cell === null) return true;
        return userGrid[rowIdx][colIdx]?.toUpperCase() === cell;
      })
    );

    if (!isValid) {
      alert("The crossword is not complete or has errors. Please check your answers.");
      setIsSubmitting(false);
      return;
    }

    if (!isConnected) {
      alert("Please connect your wallet to save your result.");
      setIsSubmitting(false);
      return;
    }

    // Refetch the current crossword to make sure it hasn't been updated since we loaded it
    const currentCrosswordFromContract = await getCurrentCrosswordHook.refetch();

    // Check if we have a valid crossword from the contract
    let contractCrosswordId = null;
    if (currentCrosswordFromContract.data && Array.isArray(currentCrosswordFromContract.data) && currentCrosswordFromContract.data.length >= 3) {
      const [id, data, updatedAt] = currentCrosswordFromContract.data as [string, string, bigint];
      contractCrosswordId = id;

      // IMPORTANT: Check if the crossword has been updated since we started solving it
      if (currentCrossword?.id && currentCrossword.id !== contractCrosswordId) {
        alert("The crossword has been updated by an administrator. You cannot complete an outdated crossword.");
        setIsSubmitting(false);
        setAlreadyCompleted(false);
        setIsComplete(false);
        return;
      }
    } else {
      alert("No current crossword found on the blockchain. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (contractCrosswordId && address) {
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
          alert("You have already completed this crossword. You can only submit it once.");
          setAlreadyCompleted(true);
          setIsComplete(true);
          setIsSubmitting(false);
          return;
        }
      } else {
        // No currentCrossword.id found, skipping completion check.
      }
    } catch (error) {
      setIsSubmitting(false);
      alert("There was an unexpected error checking if you have completed this crossword. Please try again.");
      return;
    }

    setAlreadyCompleted(true);
    setIsComplete(true);

    if (contractCrosswordId && address) {
      // Calculate duration using the ref that was initialized when the crossword started
      const durationMs = Date.now() - startTimeRef.current;
      const crosswordId = contractCrosswordId as `0x${string}`;
      const durationBigInt = BigInt(durationMs);

      // Use Farcaster profile data if available, otherwise use empty strings
      const username = farcasterProfile?.username || "";
      const displayName = farcasterProfile?.displayName || "";
      const pfpUrl = farcasterProfile?.pfpUrl || "";

      // Debug logs to check what values are being sent
      console.log("Debug: Sending to completeCrossword", {
        crosswordId,
        durationBigInt,
        username,
        displayName,
        pfpUrl,
        farcasterProfile
      });

      // Validate that we have at least a username before sending to contract
      if (!username || username.trim() === "") {
        console.warn("Debug: No username available, sending empty values to contract", { farcasterProfile });
        // Optionally, we could prompt the user or use a default
      }

      // Call completeCrossword and log the result
      const txPromise = completeCrossword([crosswordId, durationBigInt, username, displayName, pfpUrl]);
      console.log("Debug: Transaction initiated", txPromise);
      setWaitingForTransaction(true);
    } else {
      setIsSubmitting(false);
    }
  }

  // handleSaveUsername is no longer needed since we use Farcaster username directly

  const handleReset = () => {
    if (crosswordData) {
      const CROSSWORD_GRID = buildGridFromClues(crosswordData.clues, crosswordData.gridSize)
      setUserGrid(CROSSWORD_GRID.map((row) => row.map((cell) => (cell === null ? null : ""))))
    }
    setSelectedCell(null)
    setIsComplete(false)
    setShowUsernamePopup(false)
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
          <p className="text-lg font-bold">Loading crossword from the blockchain...</p>
          {timeoutReached && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">The connection is taking longer than usual or no crossword is configured</p>
              <p className="mt-1 text-xs text-muted-foreground">(This can happen in the Farcaster environment)</p>
              <button 
                onClick={() => {
                  refetchCrosswordFromContext();
                }}
                className="px-4 py-2 mt-3 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Try again
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
        <h2 className="mb-4 text-xl font-bold">Connect Celo Wallet</h2>
        <p className="mb-4">
          Please connect your wallet to play and take advantage of smart contracts on the Celo blockchain.
        </p>
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Requirements:</p>
          <ul className="max-w-md mx-auto mt-2 text-left list-disc list-inside">
            <li>Celo compatible wallet (MetaMask, Valora, etc.)</li>
            <li>Connected to Celo Sepolia network</li>
          </ul>
        </div>
      </div>
    );
  }
  
  // Show network switch message if connected but not on Celo network
  if (!isOnCeloNetwork) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">Incompatible Network</h2>
        <p className="mb-4">
          This application requires the Celo network. Please switch to Celo Sepolia Testnet.
        </p>
        <div className="mb-4 text-sm text-muted-foreground">
          <p>Current network: {chainId}</p>
          <p>Compatible networks: Celo Mainnet, Celo Alfajores, Celo Sepolia</p>
        </div>
      </div>
    );
  }

  // After loading, if no crossword data, show message
  if (!crosswordData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h2 className="mb-4 text-xl font-bold">No Active Crossword</h2>
        <p className="mb-4">
          Currently there is no crossword available on the blockchain.
        </p>
        <p className="text-sm text-muted-foreground">
          An administrator needs to configure a new crossword to be able to play.
        </p>
      </div>
    );
  }

  const acrossClues = crosswordData?.clues.filter((c: any) => c.direction === "across") || [];
  const downClues = crosswordData?.clues.filter((c: any) => c.direction === "down") || [];
  const currentGrid = buildGridFromClues(crosswordData.clues, crosswordData.gridSize);

  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6 md:gap-8">
        {/* Crossword Grid */}
        <div className="px-2 overflow-x-auto">
          <Card className="border-4 border-black bg-card p-1 sm:p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div ref={gridRef} className="mx-auto w-fit overflow-x-auto" onKeyDown={handleKeyDown} tabIndex={0}>
              <div className="grid gap-0 p-1 sm:p-2" style={{ gridTemplateColumns: `repeat(${currentGrid[0].length}, 1fr)` }}>
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
                          "relative h-7 w-7 border-2 border-black transition-all max-[400px]:h-6 max-[400px]:w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 lg:h-11 lg:w-11",
                          isBlocked && "bg-foreground",
                          !isBlocked &&
                            "cursor-pointer bg-white hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:shadow-none active:shadow-none",
                          isHighlighted && !isSelected && "bg-secondary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                          isSelected && "bg-primary shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                          isCorrect && !isBlocked && "bg-accent",
                        )}
                      >
                        {cellNumber && (
                          <span className="absolute left-0.5 top-0.5 text-[6px] font-bold text-foreground max-[400px]:text-[5px] sm:text-[7px]">
                            {cellNumber}
                          </span>
                        )}
                        {!isBlocked && (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-[11px] font-black uppercase text-foreground max-[400px]:text-[10px] sm:text-sm">
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
                Reset
              </Button>
              <Button
                onClick={handleSaveCompletion}
                disabled={!isComplete || alreadyCompleted || isCompleting || isSubmitting}
                className="w-full md:w-auto border-4 border-black bg-primary font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 sm:hover:translate-x-1 sm:hover:translate-y-1 active:translate-x-0.5 active:translate-y-0.5 sm:active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {isSubmitting || isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isCompleting ? "Saving..." : "Verifying..."}
                  </>
                ) : isCompleteSuccess ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {alreadyCompleted ? "Completed!" : (isComplete ? "Save Result" : "Mark as Complete")}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Clues Panel */}
        <div className="px-2 space-y-4 sm:space-y-6">
          <Card className="border-4 border-black bg-popover p-3 sm:p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-2 sm:mb-3 md:mb-4 text-lg sm:text-xl font-black uppercase text-foreground">Horizontal</h2>
            <div className="space-y-2 sm:space-y-3">
              {acrossClues.map((clue: any) => (
                <div
                  key={`across-${clue.number}`}
                  className="cursor-pointer border-2 border-black bg-white p-2 sm:p-3 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
                  onClick={() => handleMobileClueClick(clue, "across")}
                >
                  <span className="font-black text-primary">{clue.number}.</span>{" "}
                  <span className="text-[11px] max-[400px]:text-[10px] sm:text-sm text-foreground">{clue.clue}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-4 border-black bg-card p-3 sm:p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-2 sm:mb-3 md:mb-4 text-lg sm:text-xl font-black uppercase text-foreground">Vertical</h2>
            <div className="space-y-2 sm:space-y-3">
              {downClues.map((clue: any) => (
                <div
                  key={`down-${clue.number}`}
                  className="cursor-pointer border-2 border-black bg-white p-2 sm:p-3 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 hover:bg-secondary active:bg-secondary hover:shadow-none active:shadow-none"
                  onClick={() => handleMobileClueClick(clue, "down")}
                >
                  <span className="font-black text-primary">{clue.number}.</span>{" "}
                  <span className="text-[11px] max-[400px]:text-[10px] sm:text-sm text-foreground">{clue.clue}</span>
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
            className="w-full max-w-md p-6 border-4 border-black bg-popover"
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
                placeholder={`${mobilePopup.clue.answer.length} words`}
                className="w-full border-4 border-black bg-white p-4 text-center text-2xl font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => setMobilePopup(null)}
                  variant="outline"
                  className="flex-1 border-4 border-black bg-white font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-white active:bg-white hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMobileSubmit}
                  className="flex-1 border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-1 active:translate-y-1 hover:bg-primary active:bg-primary hover:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Removed the username input popup since we now use Farcaster username */}
    </>
  )
}