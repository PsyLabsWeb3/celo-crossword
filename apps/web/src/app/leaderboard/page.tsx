"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Home, Clock, ChevronDown, ArrowLeft, Share2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCrossword } from "@/contexts/crossword-context"
import { useAccount } from "wagmi";
import { useUnifiedCrosswordPrizes, useClaimPrize, useGetCrosswordCompletions } from '@/hooks/useContract';
import { sdk } from "@farcaster/frame-sdk";
import FarcasterUserDisplay from "@/components/farcaster-user-display";
import { readContract } from 'wagmi/actions';
import { CONTRACTS } from '@/lib/contracts';
import { config } from '@/contexts/frame-wallet-context';
import { useChainId } from "wagmi";
import { formatEther } from "viem";
import confetti from 'canvas-confetti';
import { toast } from "sonner";

export default function LeaderboardPage() {
  const [selectedCrosswordId, setSelectedCrosswordId] = useState<string | null>(null);
  const [completions, setCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userHasClaimed, setUserHasClaimed] = useState<boolean | null>(null); // null = not checked yet
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{winner: boolean, rank: number, prize?: string} | null>(null);
  const { currentCrossword } = useCrossword()
  const { address: connectedAddress, isConnected } = useAccount();
  const { claimPrize, isLoading: isClaiming, isSuccess: isClaimSuccess, isError: isClaimError, error: claimError } = useClaimPrize();
  const router = useRouter()
  const searchParams = useSearchParams();
  const chainId = useChainId();

  useEffect(() => {
    const crosswordIdFromUrl = searchParams.get('id');
    if (crosswordIdFromUrl) {
      setSelectedCrosswordId(crosswordIdFromUrl);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  // Effect to check if user has already claimed their prize using localStorage and contract simulation
  useEffect(() => {
    async function checkClaimStatus() {
      if (!connectedAddress || !selectedCrosswordId || checkingClaimStatus) {
        return;
      }

      setCheckingClaimStatus(true);
      
      // 1. Check localStorage first (fastest)
      const claimKey = `claimed_${selectedCrosswordId}_${connectedAddress.toLowerCase()}`;
      const localStatus = localStorage.getItem(claimKey) === 'true';
      
      if (localStatus) {
        console.log(`[Claim Status] Found claimed status in localStorage for ${claimKey}`);
        setUserHasClaimed(true);
        setCheckingClaimStatus(false);
        return;
      }

      // 2. Fallback to contract simulation to check if already claimed on-chain
      // This helps if localStorage was cleared or user is on a different device
      try {
        const contractInfo = (CONTRACTS as any)[chainId]?.['CrosswordPrizes'];
        
        if (contractInfo?.address) {
          console.log(`[Claim Status] Checking on-chain status for ${selectedCrosswordId}...`);
          
          // We simulate a claimPrize call. If it reverts with "Already claimed", 
          // we know the user has already claimed it.
          await readContract(config, {
            address: contractInfo.address as `0x${string}`,
            abi: [{
              "inputs": [{"internalType": "bytes32", "name": "crosswordId", "type": "bytes32"}],
              "name": "claimPrize",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            }],
            functionName: 'claimPrize',
            args: [selectedCrosswordId as `0x${string}`],
            account: connectedAddress as `0x${string}`,
          });
          
          // If it doesn't revert, it means it's possible to claim (or other error)
          setUserHasClaimed(false);
        }
      } catch (e: any) {
        const errorMessage = e.message || "";
        console.log(`[Claim Status] Simulation result for ${selectedCrosswordId}:`, errorMessage);
        
        if (errorMessage.toLowerCase().includes("already claimed")) {
          console.log(`[Claim Status] On-chain check confirmed: Already claimed.`);
          setUserHasClaimed(true);
          // Persist to localStorage since we verified it on-chain
          localStorage.setItem(claimKey, 'true');
        } else {
          setUserHasClaimed(false);
        }
      } finally {
        setCheckingClaimStatus(false);
      }
    }

    checkClaimStatus();
  }, [connectedAddress, selectedCrosswordId, chainId]);


  // Get the specific crossword details that includes the actual winners (completions array with ranks)
  const isPublicParam = searchParams.get('isPublic') === 'true';
  const { prizeDetails: crosswordPrizesDetails, isLoading: isLoadingPrizes, error: prizesError } = useUnifiedCrosswordPrizes(
    selectedCrosswordId as `0x${string}`,
    isPublicParam
  );

  // Helper functions to handle both tuple-style and object-style completion data
  const getCompletionTimestamp = useCallback((completion: any): bigint => {
    if (!completion) return 0n;
    const timestamp = completion.completionTimestamp ?? completion[1];
    return timestamp ?? 0n;
  }, []);

  const getCompletionUser = useCallback((completion: any): string => {
    return completion.user ?? completion[0];
  }, []);

  const getCompletionDuration = useCallback((completion: any): bigint => {
    return completion.durationMs ?? completion[2];
  }, []);

  // Helper function to get winner-specific data from crosswordDetails
  const getWinnerUser = useCallback((winner: any): string => {
    return winner.user ?? winner[0];
  }, []);

  const getWinnerTimestamp = useCallback((winner: any): bigint => {
    return winner.timestamp ?? winner[1];
  }, []);

  const getWinnerRank = useCallback((winner: any): bigint => {
    return winner.rank ?? winner[2];
  }, []);



  // Get completions for the current crossword from blockchain
  const {
    completions: onChainCompletions,
    isLoading: isCompletionsLoading,
    isError,
    refetch
  } = useGetCrosswordCompletions(selectedCrosswordId as `0x${string}` || `0x0000000000000000000000000000000000000000000000000000000000000000`)

  // Calculate max winners allowed based on crossword details
  const maxWinnersAllowed = (() => {
    if (crosswordPrizesDetails?.winnerPercentages) {
      return crosswordPrizesDetails.winnerPercentages.length;
    }
    return 0;
  })();

  // Handle claim prize errors
  useEffect(() => {
    if (isClaimError) {
      const errorMessage = claimError?.message || claimError?.name || 'Unknown error';

      if (errorMessage.toLowerCase().includes('crossword not complete') || errorMessage.toLowerCase().includes('prizes already distributed')) {
        toast.error("Cannot claim prize: " + errorMessage +
          "\nThis means:\n" +
          "- The prizes have already been distributed to winners\n" +
          "- You may have already claimed your prize\n" +
          "- The claiming period has ended\n\n" +
          "Note: You are seeing this message because the contract has already processed prize distribution.");
      } else if (errorMessage.toLowerCase().includes('does not exist')) {
        toast.error("Cannot claim prize: This crossword was created using an older version of the contract that doesn't fully support the manual claim system." +
          "\n\nWait for the next crossword, it will work perfectly!");
      } else if (errorMessage.toLowerCase().includes('insufficient funds') || errorMessage.toLowerCase().includes('gas')) {
        toast.error("Insufficient CELO for gas fees. Please get some CELO on Celo Sepolia testnet to claim your prize.");
      } else {
        toast.error("Error claiming prize: " + errorMessage);
      }
    } else if (isClaimSuccess) {
      // Immediately update the claim status to prevent duplicate claims
      setUserHasClaimed(true);
      
      // Save to localStorage
      if (connectedAddress && selectedCrosswordId) {
        const claimKey = `claimed_${selectedCrosswordId}_${connectedAddress.toLowerCase()}`;
        localStorage.setItem(claimKey, 'true');
        console.log(`[Claim Success] Saved claim status to localStorage: ${claimKey}`);
      }
      
      toast.success("Prize claimed successfully!");
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClaimError, isClaimSuccess, claimError]); // Removed refetch from dependencies to avoid loop

  useEffect(() => {
    if (selectedCrosswordId) {
      setLoading(true);
      setError(null);

      refetch().finally(() => {
        setLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCrosswordId]); // Removed refetch to avoid loop

  // When we get the on-chain data, sort by completion timestamp (earliest first)
  useEffect(() => {
    if (onChainCompletions && !isCompletionsLoading) {
      const completionsCopy = Array.isArray(onChainCompletions) ? [...onChainCompletions] : [];
      const sorted = completionsCopy.sort((a, b) => {
        const timeA = getCompletionTimestamp(a);
        const timeB = getCompletionTimestamp(b);
        return Number(timeA - timeB);
      });
      setCompletions(sorted);
    }
  }, [onChainCompletions, isCompletionsLoading, getCompletionTimestamp]);

  // Effect to check URL parameters and trigger celebration
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const completed = searchParams.get('completed') === 'true';
    const winner = searchParams.get('winner') === 'true';
    const rank = parseInt(searchParams.get('rank') || '0');

    if (completed && !showCelebrationModal) {
      setCelebrationData({ winner, rank, prize: '...' });
      setShowCelebrationModal(true);

      // Trigger confetti
      const particleCount = winner ? 150 : 80;
      const spread = winner ? 70 : 50;
      const origin = { y: winner ? 0.6 : 0.7 };
      const colors = winner ? ['#27F52A', '#000000', '#FFFFFF'] : ['#27F52A', '#000000'];

      confetti({
        particleCount,
        spread,
        origin,
        colors
      });

      // Clean up URL parameters without refreshing
      const params = new URLSearchParams(searchParams.toString());
      params.delete('completed');
      params.delete('winner');
      params.delete('rank');
      const newPath = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update prize amount when crosswordDetails loads for winners
  useEffect(() => {
    if (showCelebrationModal && celebrationData?.winner && celebrationData.prize === '...' && crosswordPrizesDetails) {
      const prizePool = crosswordPrizesDetails.totalPrizePool || 0n;
      const winnerPercentages = crosswordPrizesDetails.winnerPercentages || [];

      if (celebrationData.rank > 0 && celebrationData.rank <= winnerPercentages.length) {
        const percentage = winnerPercentages[celebrationData.rank - 1];
        const prizeAmount = (BigInt(prizePool) * BigInt(percentage)) / 10000n;
        const prizeFormatted = `${formatEther(prizeAmount)} CELO`;

        setCelebrationData(prev => prev ? { ...prev, prize: prizeFormatted } : null);
      } else {
        setCelebrationData(prev => prev ? { ...prev, prize: '0 CELO' } : null);
      }
    }
  }, [crosswordPrizesDetails, celebrationData, showCelebrationModal]);

  const formatDate = (timestamp: bigint) => {
    if (!timestamp) return "Invalid Date";
    
    const date = new Date(Number(timestamp) * 1000)
    
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch (e) {
      console.error("Error formatting date:", e);
      return "Invalid Date";
    }
  }

  const getRankIcon = (index: number) => {
    const rank = index + 1;
    const fontSize = rank >= 10 ? "text-lg" : "text-2xl";
    return <span className={`${fontSize} font-black text-primary`}>{rank}</span>
  }

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-yellow-300"
    if (index === 1) return "bg-gray-300"
    if (index === 2) return "bg-amber-300"
    if (index < maxWinnersAllowed) return "bg-purple-100"
    return "bg-white"
  }

  if (!selectedCrosswordId && !loading) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="mt-4 font-bold text-muted-foreground">
            Please select a crossword to view its leaderboard.
          </p>
          <Button
            onClick={() => router.push('/active-crosswords')}
            className="w-full sm:w-auto mt-4 border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Back to Active Crosswords
          </Button>
        </Card>
      </main>
    );
  }

  if (loading || isCompletionsLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4 bg-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 mb-4 border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
          <p className="text-lg font-bold">Loading leaderboard from the blockchain...</p>
        </div>
      </main>
    )
  }

  if (error || isError) {
    return (
      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Winners (On-Chain)
            </h1>
          </div>

          <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="mt-4 font-bold text-destructive">
              Error loading leaderboard: {error || "Unknown error"}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Retry
            </Button>
          </Card>

          <div className="flex justify-center mt-8 w-full px-2">
            <Button
              onClick={() => {
                window.location.href = "/active-crosswords";
              }}
              className="w-full sm:w-auto border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Back To Active Crosswords
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Function to handle prize claiming for user's own completion
  const handleClaimPrize = async () => {
    if (!selectedCrosswordId) {
      toast.error("No active crossword to claim prize for.");
      return;
    }

    if (!connectedAddress) {
      toast.error("Please connect your wallet to claim your prize.");
      return;
    }

    if (isClaiming) {
      toast.error("Already processing a claim transaction. Please wait.");
      return;
    }

    try {
      const txPromise = claimPrize([selectedCrosswordId as `0x${string}`]);
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : "Unknown error");
      toast.error("Error initiating prize claim: " + errorMessage);
    }
  };

  // Function to share on Farcaster
  const handleFarcasterShare = async () => {
    if (!celebrationData) return;

    try {
      let shareText = '';
      
      if (celebrationData.winner && celebrationData.prize) {
        shareText = `🏆 I won ${Number(celebrationData.prize).toFixed(4)} CELO finishing #${celebrationData.rank} in the Celo Crossword! Can you beat me? 🧩`;
      } else {
        shareText = `✅ I completed the Celo Crossword, finishing #${celebrationData.rank}! Try it yourself! 🧩`;
      }

      const frameUrl = typeof window !== 'undefined' ? `${window.location.origin}/leaderboard?id=${selectedCrosswordId}` : '';
      
      const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(frameUrl)}`;
      
      await sdk.actions.openUrl(composeUrl);
    } catch (error) {
      console.error('Error sharing on Farcaster:', error);
      try {
        let shareText = '';
        if (celebrationData?.winner && celebrationData.prize) {
          shareText = `🏆 I won ${Number(celebrationData.prize).toFixed(4)} CELO finishing #${celebrationData.rank} in the Celo Crossword! Can you beat me? 🧩`;
        } else if (celebrationData) {
          shareText = `✅ I completed the Celo Crossword, finishing #${celebrationData.rank}! Try it yourself! 🧩`;
        }
        await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`);
      } catch (fallbackError) {
        console.error('Fallback share also failed:', fallbackError);
      }
    }
  };

  return (
    <>
      {showCelebrationModal && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="relative w-full max-w-md border-4 border-black bg-card p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex flex-col items-center text-center space-y-4">
              {celebrationData.winner ? (
                <>
                  <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-500 mb-2" />
                  <h2 className="text-lg font-black uppercase text-foreground">
                    Congratulations! 🎉
                  </h2>
                  <p className="text-lg sm:text-xl font-bold text-primary">
                    You won {celebrationData.prize} CELO
                  </p>
                  <p className="text-base sm:text-lg font-bold text-muted-foreground">
                    You finished in rank #{celebrationData.rank}
                  </p>
                  <p className="text-sm text-muted-foreground px-2">
                    Your prize has been recorded on the blockchain.
                  </p>
                </>
              ) : (
                <>
                  <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-primary mb-2" />
                  <h2 className="text-2xl sm:text-3xl font-black uppercase text-foreground">
                    Completed! ✅
                  </h2>
                  <p className="text-lg sm:text-xl font-bold text-muted-foreground">
                    You finished in rank #{celebrationData.rank}
                  </p>
                  <p className="text-sm text-muted-foreground px-2">
                    Good job! Your participation has been recorded on the blockchain.
                  </p>
                </>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                {/* <Button
                  onClick={handleFarcasterShare}
                  className="flex-1 border-4 border-black bg-purple-500 font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-purple-600 hover:shadow-none"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button> */}
                <Button
                  onClick={() => setShowCelebrationModal(false)}
                  className="w-full sm:flex-1 border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Winners (On-Chain)
            </h1>
            <p className="mt-2 text-sm font-bold text-muted-foreground sm:text-base">
              The first users to complete this crossword puzzle (stored on the blockchain).
            </p>
          </div>

          {completions.length === 0 ? (
            <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 font-bold text-muted-foreground">
                No winners yet. Be the first to complete the crossword!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center mb-4 w-full px-2">
                <Button
                  onClick={() => router.push('/active-crosswords')}
                  className="w-full sm:w-auto border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back To Crosswords
                </Button>
              </div>
              {crosswordPrizesDetails && crosswordPrizesDetails.totalPrizePool > 0 && (
                <Card className="border-4 border-black bg-green-100 p-4 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
                  <h2 className="text-lg font-black uppercase text-green-800 mb-2">Prize Pool</h2>
                  <p className="text-4xl font-black text-green-900">
                    {formatEther(crosswordPrizesDetails.totalPrizePool)}
                    {crosswordPrizesDetails.token === "0x0000000000000000000000000000000000000000" ? " CELO" : " Tokens"}
                  </p>
                  {crosswordPrizesDetails.winnerPercentages && crosswordPrizesDetails.winnerPercentages.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {crosswordPrizesDetails.winnerPercentages.map((pct: any, idx: number) => (
                        <span key={idx} className="rounded-full bg-green-200 px-3 py-1 text-sm font-bold text-green-900 border-2 border-green-900">
                          Rank {idx + 1}: {Number(pct) / 100}%
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              )}
              {completions.slice(0, visibleCount).map((completion, index) => {
                const userAddress = getCompletionUser(completion);

                return (
                  <Card
                    key={`${userAddress}-${getCompletionTimestamp(completion).toString()}`}
                    className={cn(
                      "relative border-4 border-black p-3 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none overflow-hidden",
                      getRankColor(index),
                    )}
                  >
                    {index < maxWinnersAllowed && (
                      <div className="absolute bottom-2 right-2 rounded-none border-2 border-black bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase leading-tight text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-[420px]:border-3 min-[420px]:px-2 min-[420px]:py-1 min-[420px]:text-xs sm:border-4 sm:px-4 sm:py-2 sm:text-base sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Winner
                      </div>
                    )}
                    <div className="flex flex-row items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-none border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:h-16 sm:w-16">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <FarcasterUserDisplay
                          address={userAddress}
                          fallbackUsername={
                            userAddress.substring(0, 6) +
                            "..." +
                            userAddress.substring(userAddress.length - 4)
                          }
                          size="md"
                        />
                        <div className="flex flex-wrap items-center mt-1.5 sm:mt-1 text-xs sm:text-sm font-bold gap-x-2 gap-y-0.5 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {formatDate(getCompletionTimestamp(completion))}
                            </span>
                          </div>
                          <span className="hidden sm:inline"></span>
                          <span>
                            Duration {(Number(getCompletionDuration(completion)) / 60000).toFixed(1)} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {completions.length > visibleCount && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="border-4 border-black bg-purple-500 font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-purple-600 hover:shadow-none"
              >
                See More
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          <div className="flex justify-center mt-4">
            {(() => {
              if (!isConnected || !connectedAddress || !selectedCrosswordId) {
                return null;
              }

              let isPrizeWinner = false;
              let userRankFromDisplayedCompletions = 0;

              // Check winners array from prizes contract first
              if (crosswordPrizesDetails && Array.isArray(crosswordPrizesDetails.winners)) {
                const winners = crosswordPrizesDetails.winners;
                const normalizedConnectedAddress = connectedAddress.toLowerCase();

                const userIndex = winners.findIndex((winnerAddress: any) => 
                  (typeof winnerAddress === 'string' ? winnerAddress : winnerAddress?.toString())?.toLowerCase() === normalizedConnectedAddress
                );

                if (userIndex !== -1) {
                  isPrizeWinner = true;
                  userRankFromDisplayedCompletions = userIndex + 1; 
                }
              }

              // Fallback: Check if user is in the displayed completions within the winners limit
              if (!isPrizeWinner && completions && Array.isArray(completions)) {
                const normalizedConnectedAddress = connectedAddress.toLowerCase();
                const userIndexInCompletions = completions.findIndex(c => 
                  getCompletionUser(c).toLowerCase() === normalizedConnectedAddress
                );

                if (userIndexInCompletions !== -1 && userIndexInCompletions < maxWinnersAllowed) {
                  isPrizeWinner = true;
                  userRankFromDisplayedCompletions = userIndexInCompletions + 1;
                }
              }

              if (isPrizeWinner && userRankFromDisplayedCompletions <= maxWinnersAllowed) {
                const contractHasClaimed = userHasClaimed === true;
                const checkingClaimStatusFromContract = userHasClaimed === null && checkingClaimStatus;

                const buttonLabel = isClaiming ? 'Claiming...' :
                  contractHasClaimed ? 'Claimed' :
                    checkingClaimStatusFromContract ? 'Checking...' :
                      'Claim Prize';

                const buttonDisabled = isClaiming || contractHasClaimed || checkingClaimStatusFromContract;

                return (
                  <Button
                    onClick={handleClaimPrize}
                    disabled={buttonDisabled}
                    className={cn(
                      "border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-100 disabled:cursor-not-allowed",
                      contractHasClaimed 
                        ? "bg-green-500 text-white disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-primary disabled:opacity-50 disabled:bg-gray-300"
                    )}
                  >
                    {buttonLabel}
                  </Button>
                );
              }

              return null;
            })()}
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => router.push('/')}
              className="border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}