"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Home, Clock, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCrossword } from "@/contexts/crossword-context"
import { useGetCrosswordCompletions, useClaimPrize, useCrosswordPrizesDetails } from "@/hooks/useContract"
import { useAccount } from "wagmi";
import { sdk } from "@farcaster/frame-sdk";
import FarcasterUserDisplay from "@/components/farcaster-user-display";
import { readContract } from 'wagmi/actions';
import { CONTRACTS } from '@/lib/contracts';
import { config } from '@/contexts/frame-wallet-context';
import { useChainId } from "wagmi";

export default function LeaderboardPage() {
  const [completions, setCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userHasClaimed, setUserHasClaimed] = useState<boolean | null>(null); // null = not checked yet
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const { currentCrossword } = useCrossword()
  const { address: connectedAddress, isConnected } = useAccount();
  const { claimPrize, isLoading: isClaiming, isSuccess: isClaimSuccess, isError: isClaimError, error: claimError } = useClaimPrize();
  const router = useRouter()
  const chainId = useChainId();

  // Effect to check if user has already claimed their prize by calling the contract function
  useEffect(() => {
    const checkClaimStatus = async () => {
      if (!connectedAddress || !currentCrossword?.id || !isConnected) {
        setUserHasClaimed(null);
        return;
      }

      setCheckingClaimStatus(true);

      try {
        const contractInfo = (CONTRACTS as any)[chainId]?.['CrosswordBoard'];
        if (contractInfo) {
          // Define the ABI for the hasClaimedPrize function
          const getCrosswordBoardABI = () => {
            return [
              {
                inputs: [
                  {
                    internalType: "bytes32",
                    name: "crosswordId",
                    type: "bytes32"
                  },
                  {
                    internalType: "address",
                    name: "user",
                    type: "address"
                  }
                ],
                name: "hasClaimedPrize",
                outputs: [
                  {
                    internalType: "bool",
                    name: "",
                    type: "bool"
                  }
                ],
                stateMutability: "view",
                type: "function"
              }
            ];
          };

          const abi = getCrosswordBoardABI();

          const hasClaimed = await readContract(config, {
            address: contractInfo.address as `0x${string}`,
            abi: abi,
            functionName: 'hasClaimedPrize',
            args: [currentCrossword.id as `0x${string}`, connectedAddress as `0x${string}`],
          });


          setUserHasClaimed(Boolean(hasClaimed));
        }
      } catch (error) {
        // If there's an error checking the contract, we'll keep the state as null to try again later
        setUserHasClaimed(null);
      } finally {
        setCheckingClaimStatus(false);
      }
    };

    // Always check the contract state when the dependencies change
    // This ensures the state is updated after reload
    if (connectedAddress && currentCrossword?.id && isConnected) {
      checkClaimStatus();
    } else {
      setUserHasClaimed(null);
    }
  }, [connectedAddress, currentCrossword?.id, isConnected, chainId, isClaimSuccess]); // Added isClaimSuccess to trigger recheck when claim succeeds

  // Get the specific crossword details that includes the actual winners (completions array with ranks)
  const { data: crosswordDetails, isLoading: isCrosswordDetailsLoading } = useCrosswordPrizesDetails(currentCrossword?.id as `0x${string}` || undefined);

  // Helper functions to handle both tuple-style and object-style completion data
  const getCompletionTimestamp = useCallback((completion: any): bigint => {
    // Handle both named properties and array indices
    return completion.completionTimestamp ?? completion[1];
  }, []); // Empty dependency array since the function doesn't change

  const getCompletionUser = useCallback((completion: any): string => {
    return completion.user ?? completion[0];
  }, []); // Empty dependency array since the function doesn't change

  const getCompletionDuration = useCallback((completion: any): bigint => {
    return completion.durationMs ?? completion[2];
  }, []); // Empty dependency array since the function doesn't change

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
    data: onChainCompletions,
    isLoading: isCompletionsLoading,
    isError,
    refetch
  } = useGetCrosswordCompletions(currentCrossword?.id as `0x${string}` || `0x0000000000000000000000000000000000000000000000000000000000000000`)

  // Calculate max winners allowed based on crossword details
  const maxWinnersAllowed = (() => {
    if (crosswordDetails) {
      // The winnerPercentages array at index 2 indicates how many winners are allowed
      const winnerPercentages = Array.isArray(crosswordDetails) ? crosswordDetails[2] : null;
      if (Array.isArray(winnerPercentages)) {
        return winnerPercentages.length;
      }
    }
    return 0;
  })();

  // Handle claim prize errors
  useEffect(() => {
    if (isClaimError) {
      // Debug logs removed - Claim transaction failed

      const errorMessage = claimError?.message || claimError?.name || 'Unknown error';

      if (errorMessage.toLowerCase().includes('crossword not complete') || errorMessage.toLowerCase().includes('prizes already distributed')) {
        // Debug log removed - Prizes already distributed or crossword not complete
        alert("Cannot claim prize: " + errorMessage +
              "\nThis means:\n" +
              "- The prizes have already been distributed to winners\n" +
              "- You may have already claimed your prize\n" +
              "- The claiming period has ended\n\n" +
              "Note: You are seeing this message because the contract has already processed prize distribution.");
      } else if (errorMessage.toLowerCase().includes('insufficient funds') || errorMessage.toLowerCase().includes('gas')) {
        // Debug log removed - Insufficient funds error
        alert("Insufficient CELO for gas fees. Please get some CELO on Celo Sepolia testnet to claim your prize.");
      } else {
        // Debug log removed - Other claim error
        alert("Error claiming prize: " + errorMessage);
      }
    } else if (isClaimSuccess) {
      // Debug log removed - Prize claimed successfully
      alert("Prize claimed successfully!");
      // Refetch the completions to update the UI after claiming
      refetch();
    }
  }, [isClaimError, isClaimSuccess, claimError, refetch]);

  useEffect(() => {
    if (currentCrossword?.id) {
      setLoading(true);
      setError(null);

      refetch().finally(() => {
        setLoading(false);
      });
    }
  }, [currentCrossword?.id]); // Removed refetch from dependencies to prevent infinite loop

  // When we get the on-chain data, sort by completion timestamp (earliest first)
  useEffect(() => {
    // Debug log removed - On-chain completions received

    if (onChainCompletions && !isCompletionsLoading) {
      // Create a copy and sort completions by timestamp (earliest completion = better rank)
      const completionsCopy = Array.isArray(onChainCompletions) ? [...onChainCompletions] : [];
      // Debug log removed - Found completions

      const sorted = completionsCopy.sort((a, b) => {
        // Extract timestamps using helper functions
        const timeA = getCompletionTimestamp(a);
        const timeB = getCompletionTimestamp(b);
        return Number(timeA - timeB);
      });
      setCompletions(sorted);
      // Debug log removed - Set sorted completions
    }
  }, [onChainCompletions, isCompletionsLoading]); // Removed getCompletionTimestamp to prevent infinite loop

  const formatDate = (timestamp: bigint) => {
    // Convert from seconds to milliseconds for Date constructor
    const date = new Date(Number(timestamp) * 1000)
    return new Intl.DateTimeFormat("es-MX", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-8 h-8 text-yellow-500" />
    if (index === 1) return <Medal className="w-8 h-8 text-gray-400" />
    if (index === 2) return <Award className="w-8 h-8 text-amber-600" />
    return <span className="text-2xl font-black text-primary">{index + 1}</span>
  }

  const getRankColor = (index: number) => {
    if (index === 0) return "bg-yellow-300"
    if (index === 1) return "bg-gray-300"
    if (index === 2) return "bg-amber-300"
    return "bg-white"
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

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => {
                // Use window.location to navigate instead of router.push to ensure proper navigation
                window.location.href = "/";
              }}
              className="border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </main>
    )
  }



  

  // Function to handle prize claiming for user's own completion
  const handleClaimPrize = async () => {
    // Debug logs removed - handleClaimPrize called

    if (!currentCrossword?.id) {
      // Debug log removed - No current crossword id
      alert("No active crossword to claim prize for.");
      return;
    }

    if (!connectedAddress) {
      // Debug log removed - No connected address
      alert("Please connect your wallet to claim your prize.");
      return;
    }

    if (isClaiming) {
      // Debug log removed - Already claiming
      alert("Already processing a claim transaction. Please wait.");
      return;
    }

    // With the updated contract, users can try to claim again for UX feedback
    // The contract handles duplicate payment prevention internally
    // Reset success state to allow new claim attempt
    // Note: We don't reset the state here as it's handled by the hook's useEffect

    // Since the button appears based on the completions array, allow the claim attempt
    // Let the contract handle the validation and provide feedback
    // This improves UX by allowing claim attempts for feedback purposes
    // Debug log removed - Proceeding with claim attempt

    // Verify if the current crossword is still active for claiming
    // This is just a pre-check - the actual validation happens in the contract
    // Debug log removed - Pre-claim validation passed

    try {
      const txPromise = claimPrize([currentCrossword.id as `0x${string}`]);
      // Debug log removed - Claim prize transaction initiated
    } catch (error) {
      // Debug log removed - Error initiating claim transaction
      const errorMessage = (error instanceof Error ? error.message : "Unknown error");
      alert("Error initiating prize claim: " + errorMessage);
    }
  };

  return (
    <>
      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Winners (On-Chain)
            </h1>
            <p className="mt-2 text-sm font-bold text-muted-foreground sm:text-base">
              The first 10 users to complete the current crossword (stored on blockchain)
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
              {completions.slice(0, visibleCount).map((completion, index) => {
                const userAddress = getCompletionUser(completion);
                
                return (
                  <Card
                    key={`${userAddress}-${getCompletionTimestamp(completion).toString()}`}
                    className={cn(
                      "border-4 border-black p-4 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
                      getRankColor(index),
                    )}
                  >
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center self-center rounded-none border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:self-auto">
                        {getRankIcon(index)}
                      </div>
                      <div className="flex-1">
                        <FarcasterUserDisplay
                          address={userAddress}
                          fallbackUsername={
                            userAddress.substring(0, 6) +
                            "..." +
                            userAddress.substring(userAddress.length - 4)
                          }
                          size="md"
                        />
                        <div className="flex flex-wrap items-center mt-1 text-sm font-bold gap-x-2 gap-y-1 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatDate(getCompletionTimestamp(completion))}
                            </span>
                          </div>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            Duration: {Number(getCompletionDuration(completion))}
                            ms
                          </span>
                        </div>
                      </div>
                      {index < maxWinnersAllowed && (
                        <div className="hidden flex-shrink-0 self-end rounded-none border-4 border-black bg-primary px-4 py-2 font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:self-auto sm:block">
                          Winner
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* See More Button */}
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

          {/* Claim Prize Button - Check against the actual displayed completions to ensure consistency */}
          <div className="flex justify-center mt-4">
            {(() => {
              // Debug logs removed - Claim button main check

              // Check if user is connected and we have necessary data
              if (!isConnected || !connectedAddress || !currentCrossword) {
                // Debug logs removed - Not showing claim button - missing connection/data
                return null;
              }

              // Check if user is among the displayed completions (these are the prize winners)
              // Use the same array that's used to display the leaderboard
              let isPrizeWinner = false;
              let userRankFromDisplayedCompletions = 0;

              if (Array.isArray(completions) && completions.length > 0) {
                // Normalize addresses for comparison (handle potential case differences)
                const normalizedConnectedAddress = connectedAddress.toLowerCase();

                const userCompletionIndex = completions.findIndex(completion => {
                  const completionUser = getCompletionUser(completion).toLowerCase();
                  return completionUser === normalizedConnectedAddress;
                });

                if (userCompletionIndex !== -1) {
                  isPrizeWinner = true;
                  userRankFromDisplayedCompletions = userCompletionIndex + 1; // 1-indexed
                }

                // Debug logs removed - Prize winner check against displayed completions
              } else {
                // Debug logs removed - No completions array available yet
              }

              // Additionally, check how many winners are allowed for this crossword
              // maxWinnersAllowed is already calculated above

              // Show the button for prize winners who are within the allowed number of winners
              if (isPrizeWinner && userRankFromDisplayedCompletions <= maxWinnersAllowed) {
                // Use the contract state to determine if the user has already claimed
                // Prioritize the contract state over the local transaction state
                const contractHasClaimed = userHasClaimed === true;
                const checkingClaimStatusFromContract = userHasClaimed === null && checkingClaimStatus;

                // Use contract state as the primary source of truth, fallback to local state if contract check is still pending
                const userHasAlreadyClaimed = contractHasClaimed || (checkingClaimStatusFromContract ? isClaimSuccess : contractHasClaimed);

                // Show "Claiming..." when processing, "Claimed!" when confirmed from contract,
                // "Checking..." when verifying contract status, "Claim Prize" when available
                const buttonLabel = isClaiming ? 'Claiming...' :
                                  contractHasClaimed ? 'Claimed!' :
                                  checkingClaimStatusFromContract ? 'Checking...' :
                                  'Claim Prize';

                const buttonDisabled = isClaiming || contractHasClaimed || checkingClaimStatusFromContract;

                return (
                  <Button
                    onClick={handleClaimPrize}
                    disabled={buttonDisabled}
                    className="border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {buttonLabel}
                  </Button>
                );
              }

              // Debug logs removed - Not showing claim button - user is not in displayed completions
              return null;
            })()}
          </div>

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => {
                // Use window.location to navigate instead of router.push to ensure proper navigation
                window.location.href = "/";
              }}
              className="border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}