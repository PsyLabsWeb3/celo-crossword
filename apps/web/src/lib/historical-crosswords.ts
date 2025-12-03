// Historical crossword data for crosswords that are no longer active
// This is needed because querying old events from RPC providers causes errors

interface HistoricalCrosswordData {
  clues: any[];
  gridSize: { rows: number; cols: number };
}

export const HISTORICAL_CROSSWORDS: Record<string, HistoricalCrosswordData> = {
  // First crossword - Nov 2025
  '0xdb4764000c54b9390a601e96783d76e3e3e9d06329637cdd119045bf32624e32': {
    gridSize: { rows: 9, cols: 10 },
    clues: [
      {
        number: 1,
        clue: "Ethereum creator",
        answer: "VITALIK",
        row: 0,
        col: 1,
        direction: "across"
      },
      {
        number: 2,
        clue: "Node participating in on-chain elections and PoS consensus.",
        answer: "VALIDATOR",
        row: 0,
        col: 1,
        direction: "down"
      },
      {
        number: 3,
        clue: "Fee measuring computational cost; on Celo can be paid using cUSD or cEUR.",
        answer: "GAS",
        row: 5,
        col: 0,
        direction: "across"
      },
      {
        number: 4,
        clue: "Ethereum L2 powering fast, low-cost payments, native stablecoins, and DeFi apps",
        answer: "CELO",
        row: 2,
        col: 4,
        direction: "across"
      },
      {
        number: 5,
        clue: "Celo's native stablecoin backed by a diversified reserve.",
        answer: "CUSD",
        row: 2,
        col: 4,
        direction: "down"
      },
      {
        number: 6,
        clue: "Service that supplies verifiable off-chain data (e.g., price feeds) so smart contracts can maintain stability or external logic.",
        answer: "ORACLE",
        row: 2,
        col: 7,
        direction: "down"
      },
      {
        number: 7,
        clue: "Deterministic virtual machine that runs Solidity bytecode; Celo is fully compatible so contracts deploy without changes.",
        answer: "EVM",
        row: 7,
        col: 7,
        direction: "across"
      }
    ]
  }
};

export function getHistoricalCrosswordData(crosswordId: string): HistoricalCrosswordData | null {
  return HISTORICAL_CROSSWORDS[crosswordId] || null;
}
