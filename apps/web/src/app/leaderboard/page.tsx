"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Home, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCrossword } from "@/contexts/crossword-context"
import { useGetCrosswordCompletions } from "@/hooks/useContract"
import { sdk } from "@farcaster/frame-sdk";
import FarcasterUserDisplay from "@/components/farcaster-user-display";

export default function LeaderboardPage() {
  const [completions, setCompletions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentCrossword } = useCrossword()
  const router = useRouter()
  

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

  

  // Get completions for the current crossword from blockchain
  const {
    data: onChainCompletions,
    isLoading: isCompletionsLoading,
    isError,
    refetch
  } = useGetCrosswordCompletions(currentCrossword?.id as `0x${string}` || `0x0000000000000000000000000000000000000000000000000000000000000000`)

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
    console.log("Debug Leaderboard: On-chain completions received", {
      onChainCompletions,
      isCompletionsLoading,
      currentCrosswordId: currentCrossword?.id
    });

    if (onChainCompletions && !isCompletionsLoading) {
      // Create a copy and sort completions by timestamp (earliest completion = better rank)
      const completionsCopy = Array.isArray(onChainCompletions) ? [...onChainCompletions] : [];
      console.log("Debug Leaderboard: Found completions", {
        count: completionsCopy.length,
        completions: completionsCopy.map((comp, index) => ({
          index,
          user: getCompletionUser(comp),
          timestamp: Number(getCompletionTimestamp(comp)),
          duration: Number(getCompletionDuration(comp))
        }))
      });

      const sorted = completionsCopy.sort((a, b) => {
        // Extract timestamps using helper functions
        const timeA = getCompletionTimestamp(a);
        const timeB = getCompletionTimestamp(b);
        return Number(timeA - timeB);
      });
      setCompletions(sorted);
      console.log("Debug Leaderboard: Set sorted completions", {
        count: sorted.length,
        sortedExample: sorted.slice(0, 3).map((comp, index) => ({
          index,
          user: getCompletionUser(comp)
        }))
      });
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
    return <span className="text-2xl font-black text-primary">#{index + 1}</span>
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
              Top 10 Winners (On-Chain)
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
              Return to Crossword
            </Button>
          </div>
        </div>
      </main>
    )
  }



  

  return (
    <>
      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Top 10 Winners (On-Chain)
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
              {completions.slice(0, 10).map((completion, index) => {
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
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
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
                      {index < 3 && (
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

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => {
                // Use window.location to navigate instead of router.push to ensure proper navigation
                window.location.href = "/";
              }}
              className="border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Crossword
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}