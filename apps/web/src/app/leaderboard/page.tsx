"use client"

import { cn } from "@/lib/utils"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, Home, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

interface Winner {
  username: string
  completedAt: string
  timestamp: number
}

export default function LeaderboardPage() {
  const [winners, setWinners] = useState<Winner[]>([])
  const router = useRouter()

  useEffect(() => {
    // Load winners from localStorage
    const storedWinners = JSON.parse(localStorage.getItem("crossword_winners") || "[]")
    // Sort by timestamp (earliest first) and take top 10
    const sortedWinners = storedWinners.sort((a: Winner, b: Winner) => a.timestamp - b.timestamp).slice(0, 10)
    setWinners(sortedWinners)
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
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

  return (
    <>
      <main className="min-h-screen p-4 bg-background sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <Trophy className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-foreground sm:text-4xl md:text-5xl">
              Top 10 Ganadores
            </h1>
            <p className="mt-2 text-sm font-bold text-muted-foreground sm:text-base">
              Los primeros 10 usuarios en completar el crucigrama
            </p>
          </div>

          {winners.length === 0 ? (
            <Card className="border-4 border-black bg-card p-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="mt-4 font-bold text-muted-foreground">
                Aún no hay ganadores. ¡Sé el primero en completar el crucigrama!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {winners.map((winner, index) => (
                <Card
                  key={index}
                  className={cn(
                    "border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
                    getRankColor(index),
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-none border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black uppercase text-foreground sm:text-2xl">{winner.username}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm font-bold text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(winner.completedAt)}</span>
                      </div>
                    </div>
                    {index < 3 && (
                      <div className="hidden flex-shrink-0 rounded-none border-4 border-black bg-primary px-4 py-2 font-black uppercase text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:block">
                        Ganador
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => router.push("/")}
              className="border-4 border-black bg-accent font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:bg-accent hover:shadow-none"
            >
              <Home className="w-4 h-4 mr-2" />
              Volver al Crucigrama
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}
