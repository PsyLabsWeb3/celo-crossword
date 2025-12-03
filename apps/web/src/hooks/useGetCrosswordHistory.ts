import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { parseAbiItem } from 'viem';

interface CrosswordHistoryItem {
  crosswordId: `0x${string}`;
  token: string;
  prizePool: bigint;
  creator: string;
  blockNumber: bigint;
  timestamp?: number;
}

interface UseGetCrosswordHistoryReturn {
  crosswords: CrosswordHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function useGetCrosswordHistory(
  options?: {
    crosswordIds?: `0x${string}`[]; // Optional: filter by specific crossword IDs
  }
): UseGetCrosswordHistoryReturn {
  const crosswordIdsFilter = options?.crosswordIds;
  const [crosswords, setCrosswords] = useState<CrosswordHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const chainId = useChainId();

  // Get contract address for current chain
  const contractAddress = (CONTRACTS as any)[chainId]?.['CrosswordBoard']?.address as `0x${string}` | undefined;

  // Fetch all crossword events at once
  useEffect(() => {
    const fetchCrosswords = async () => {
      if (!publicClient || !contractAddress) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsError(false);

        // If specific crossword IDs are provided, use them
        if (crosswordIdsFilter && crosswordIdsFilter.length > 0) {
          const crosswords: CrosswordHistoryItem[] = crosswordIdsFilter.map((id) => ({
            crosswordId: id,
            token: '0x0000000000000000000000000000000000000000',
            prizePool: 0n,
            creator: '0x0000000000000000000000000000000000000000',
            blockNumber: 999999999999n,
            timestamp: Date.now() / 1000
          }));

          setCrosswords(crosswords);
          setIsLoading(false);
          return;
        }

        // Get current crossword ID from config
        const currentCrosswordId = (CONTRACTS as any)[chainId]?.['CrosswordBoard']?.currentCrosswordId as `0x${string}` | undefined;

        // For now, just show the current crossword without querying events
        // This avoids all RPC errors related to block ranges
        const crosswords: CrosswordHistoryItem[] = [];

        if (currentCrosswordId) {
          crosswords.push({
            crosswordId: currentCrosswordId,
            token: '0x0000000000000000000000000000000000000000',
            prizePool: 0n,
            creator: '0x0000000000000000000000000000000000000000',
            blockNumber: 999999999999n,
            timestamp: Date.now() / 1000
          });
        }

        setCrosswords(crosswords);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching crossword history:', err);
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    };

    fetchCrosswords();
  }, [publicClient, contractAddress, chainId, crosswordIdsFilter]);

  return {
    crosswords,
    isLoading,
    isError,
    error,
    hasMore: false, // No pagination needed
    loadMore: () => {}, // No-op
  };
}
