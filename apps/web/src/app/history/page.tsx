"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Home, ChevronDown, ChevronUp, Calendar, Coins } from "lucide-react"
import { useRouter } from "next/navigation"
import { useGetCrosswordHistory } from "@/hooks/useGetCrosswordHistory"
import { useGetCrosswordDetailsById, useGetCrosswordCompletions } from "@/hooks/useContract"
import FarcasterUserDisplay from "@/components/farcaster-user-display"
import { useGetCrosswordGridData } from "@/hooks/useGetCrosswordGridData"
import ReadOnlyCrosswordGrid from "@/components/readonly-crossword-grid"
import { useCrossword } from "@/contexts/crossword-context"

// Component for individual crossword history item
function CrosswordHistoryCard({ 
  crosswordId, 
  token, 
  prizePool, 
  timestamp 
}: { 
  crosswordId: `0x${string}`
  token: string
  prizePool: bigint
  timestamp?: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: details, isLoading: isDetailsLoading } = useGetCrosswordDetailsById(isExpanded ? crosswordId : undefined)
  const { data: completionsData, isLoading: isCompletionsLoading } = useGetCrosswordCompletions(isExpanded ? crosswordId : `0x0000000000000000000000000000000000000000000000000000000000000000`)
  const { gridData, isLoading: isGridLoading } = useGetCrosswordGridData(isExpanded ? crosswordId : undefined)
  const { currentCrossword } = useCrossword()
  
  // Pagination for completions
  const [customLimit, setCustomLimit] = useState<number | null>(null)
  
  // Determine number of winners based on winnerPercentages length
  const winnerCount = details && Array.isArray(details) && details[2] ? (details[2] as any[]).length : 3
  
  // Calculate effective limit: use custom limit if set, otherwise default to winner count
  const visibleCompletions = customLimit ?? winnerCount

  const handleViewMore = () => {
    if (visibleCompletions < 10) {
      setCustomLimit(10)
    } else {
      setCustomLimit(visibleCompletions + 10)
    }
  }
  
  // Fallback grid data from context if it's the current crossword
  const contextGridData = (currentCrossword?.id === crosswordId && currentCrossword?.data) 
    ? (() => {
        try {
          const parsed = JSON.parse(currentCrossword.data)
          return { clues: parsed.clues, gridSize: parsed.gridSize }
        } catch (e) { return null }
      })()
    : null

  const effectiveGridData = gridData || contextGridData

  const formatDate = (ts: number) => {
    const date = new Date(ts * 1000)
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Use prize pool from details if available, otherwise use prop
  const effectivePrizePool = details && Array.isArray(details) && details[1] ? details[1] : prizePool

  const formatPrizePool = (amount: bigint) => {
    const formatted = Number(amount) / 1e18
    return formatted.toFixed(2)
  }

  const isNativeCelo = token === "0x0000000000000000000000000000000000000000"

  // Helper functions to handle both tuple-style and object-style completion data
  const getCompletionUser = (completion: any): string => {
    return completion.user ?? completion[0]
  }

  const getCompletionTimestamp = (completion: any): bigint => {
    return completion.timestamp ?? completion[1] ?? completion.completionTimestamp
  }

  const getCompletionRank = (completion: any): bigint => {
    return completion.rank ?? completion[2]
  }

  const getCompletionDuration = (completion: any): bigint => {
    // Duration might not be available in all contexts, fallback to 0
    return completion.durationMs ?? 0n;
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
    return "bg-white"
  }

  // Sort completions by timestamp
  const sortedCompletions = completionsData 
    ? [...(Array.isArray(completionsData) ? completionsData : [])].sort((a, b) => {
        const timeA = getCompletionTimestamp(a)
        const timeB = getCompletionTimestamp(b)
        return Number(timeA - timeB)
      })
    : []

  return (
    <Card className="border-4 border-black bg-card shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
      <div className="p-4 sm:p-6">
        {/* Header - Always visible */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap gap-3 text-xs font-bold sm:text-sm text-muted-foreground">
              <p className="text-sm font-black sm:text-base">
                 {crosswordId.substring(0, 12)}..{crosswordId.substring(crosswordId.length - 6)}
              </p>
              {timestamp && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(timestamp)}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-4 border-black bg-primary font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                View Details <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pt-4 mt-4 space-y-6 border-t-4 border-black">
            {/* Grid Section */}
            <div>
              {isGridLoading && !effectiveGridData ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
                  <p className="mt-2 text-sm font-bold">Loading grid...</p>
                </div>
              ) : effectiveGridData ? (
                <div className="flex justify-center">
                  <ReadOnlyCrosswordGrid clues={effectiveGridData.clues} gridSize={effectiveGridData.gridSize} />
                </div>
              ) : (
                <p className="py-4 text-sm font-bold text-center text-muted-foreground">
                  Grid data not available
                </p>
              )}
            </div>
            {!isCompletionsLoading && (
              <div className="flex items-center gap-1.5 bg-yellow-100 px-2 py-0.5 rounded-full border-2 border-black">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="text-yellow-800">
                  Prize Pool: {formatPrizePool(effectivePrizePool)} {isNativeCelo ? " CELO" : "tokens"}
                </span>
              </div>
            )}

            {/* Completions Section */}
            <div>
              <h4 className="mb-3 text-sm font-black uppercase sm:text-base">Completions</h4>
              {isCompletionsLoading ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-8 h-8 border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
                  <p className="mt-2 text-sm font-bold">Loading</p>
                </div>
              ) : sortedCompletions.length > 0 ? (
                <>
                  <div className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {/* Table Header */}
                    <div className="flex items-center justify-between border-b-4 border-black bg-muted/50 p-2 text-xs font-black uppercase sm:p-3">
                      <div className="w-8 text-center">#</div>
                      <div className="flex-1 px-2">User</div>
                    </div>
                    
                    {/* Table Body */}
                    <div>
                      {sortedCompletions.slice(0, visibleCompletions).map((completion: any, index: number) => {
                        const userAddress = getCompletionUser(completion)
                        const rank = index + 1
                        const isWinner = rank <= winnerCount
                        
                        return (
                          <div
                            key={`${userAddress}-${index}`}
                            className={cn(
                              "flex items-center justify-between border-b-2 border-black p-2 last:border-0 sm:p-3",
                              isWinner ? "bg-yellow-50" : "bg-white"
                            )}
                          >
                            {/* Rank */}
                            <div className="flex w-8 flex-col items-center justify-center">
                              <span className={cn(
                                "text-sm font-black",
                                rank === 1 ? "text-yellow-600" : 
                                rank === 2 ? "text-gray-500" : 
                                rank === 3 ? "text-amber-700" : "text-black"
                              )}>
                                {rank}
                              </span>
                              {isWinner && (
                                <Trophy className="mt-0.5 h-3 w-3 text-yellow-500" />
                              )}
                            </div>

                            {/* User */}
                            <div className="flex-1 min-w-0 px-2 text-sm overflow-hidden">
                              <FarcasterUserDisplay
                                address={userAddress}
                                fallbackUsername={
                                  userAddress.substring(0, 6) +
                                  ".." +
                                  userAddress.substring(userAddress.length - 4)
                                }
                                size="sm"
                              />
                            </div>                
                          </div>
                        )
                      })}
                    </div>
                  </div>
                    
                  {sortedCompletions.length > visibleCompletions && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={handleViewMore}
                        variant="outline"
                        className="h-8 border-2 border-black text-xs font-bold uppercase sm:h-10 sm:text-sm"
                      >
                        View More <ChevronDown className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-4 text-sm font-bold text-center text-muted-foreground">
                  No completions yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function HistoryPage() {
  const router = useRouter()
  const { currentCrossword } = useCrossword()
  const crosswordIds: `0x${string}`[] = ['0xdb4764000c54b9390a601e96783d76e3e3e9d06329637cdd119045bf32624e32']
  const { crosswords, isLoading, isError, hasMore, loadMore } = useGetCrosswordHistory({
    crosswordIds
  })

  
  if (isLoading && crosswords.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen p-4 bg-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 mb-4 border-t-2 border-b-2 rounded-full animate-spin border-primary"></div>
          <p className="text-lg font-bold">Loading crossword history...</p>
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Crossword History
            </h1>
          </div>

          <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="mt-4 font-bold text-destructive">
              Error loading crossword history
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
              onClick={() => window.location.href = "/"}
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

  return (
    <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
            Crossword History
          </h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground sm:text-base">
            Browse past crosswords and their winners
          </p>
        </div>

        {crosswords.length === 0 ? (
          <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="mt-4 font-bold text-muted-foreground">
              No crossword history found
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {crosswords.map((crossword) => (
              <CrosswordHistoryCard
                key={crossword.crosswordId}
                crosswordId={crossword.crosswordId}
                token={crossword.token}
                prizePool={crossword.prizePool}
                timestamp={crossword.timestamp}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && crosswords.length > 0 && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={loadMore}
              disabled={isLoading}
              className="border-4 border-black bg-purple-500 font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-purple-600 hover:shadow-none disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Load More"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        <div className="flex justify-center mt-8">
          <Button
            onClick={() =>   window.location.href = "/"}
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
