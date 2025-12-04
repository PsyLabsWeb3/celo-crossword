"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ReadOnlyCrosswordGridProps {
  clues: any[];
  gridSize: { rows: number; cols: number };
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

export default function ReadOnlyCrosswordGrid({ clues, gridSize }: ReadOnlyCrosswordGridProps) {
  const [grid, setGrid] = useState<(string | null)[][]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (clues && gridSize) {
      const builtGrid = buildGridFromClues(clues, gridSize)
      setGrid(builtGrid)
    }
  }, [clues, gridSize])

  // Calculate cell size based on container width
  const [cellSize, setCellSize] = useState(30)

  useEffect(() => {
    const updateCellSize = () => {
      if (containerRef.current && gridSize) {
        const containerWidth = containerRef.current.offsetWidth
        // Calculate max cell size that fits in container
        // Account for gap (2px) and padding
        const gap = 2
        const padding = 16 // p-2 on outer container = 8px each side, plus inner padding
        const availableWidth = containerWidth - (gridSize.cols - 1) * gap - padding
        const calculatedSize = Math.floor(availableWidth / gridSize.cols)
        // Clamp size between 15px and 40px (reduced min from 20px to 15px for narrow screens)
        setCellSize(Math.max(15, Math.min(40, calculatedSize)))
      }
    }

    updateCellSize()
    window.addEventListener("resize", updateCellSize)
    return () => window.removeEventListener("resize", updateCellSize)
  }, [gridSize])

  if (!grid.length) return null

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <div className="bg-black p-2 w-fit">
        <div
          className="grid gap-[2px] bg-black p-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize.cols}, ${cellSize}px)`,
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isBlack = cell === null

              // Find clue number for this cell
              let clueNumber = null
              if (!isBlack) {
                const clue = clues.find(
                  (c) => c.row === rowIndex && c.col === colIndex
                )
                if (clue) {
                  clueNumber = clue.number
                }
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "relative aspect-square flex items-center justify-center text-sm font-bold select-none",
                    isBlack ? "bg-black" : "bg-white"
                  )}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    fontSize: `${cellSize * 0.6}px`
                  }}
                >
                  {!isBlack && (
                    <>
                      {clueNumber && (
                        <span
                          className="absolute top-[2px] left-[2px] text-[8px] leading-none text-gray-500 font-normal"
                          style={{ fontSize: `${Math.max(8, cellSize * 0.25)}px` }}
                        >
                          {clueNumber}
                        </span>
                      )}
                      <span className="mt-1">{cell}</span>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
