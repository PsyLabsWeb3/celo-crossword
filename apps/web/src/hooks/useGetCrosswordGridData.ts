import { useState, useEffect } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { getHistoricalCrosswordData } from '@/lib/historical-crosswords';

interface CrosswordGridData {
  clues: any[];
  gridSize: { rows: number; cols: number };
}

export function useGetCrosswordGridData(crosswordId: `0x${string}` | undefined) {
  const [gridData, setGridData] = useState<CrosswordGridData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const publicClient = usePublicClient();
  const chainId = useChainId();

  useEffect(() => {
    if (!crosswordId || !publicClient) {
      setGridData(null);
      setIsLoading(false);
      return;
    }

    const fetchGridData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const contractAddress = (CONTRACTS as any)[chainId]?.['CrosswordBoard']?.address as `0x${string}` | undefined;
        const currentCrosswordId = (CONTRACTS as any)[chainId]?.['CrosswordBoard']?.currentCrosswordId as `0x${string}` | undefined;
        
        if (!contractAddress) {
          throw new Error('Contract address not found');
        }

        // First, check if this is a known historical crossword
        const historicalData = getHistoricalCrosswordData(crosswordId);
        if (historicalData) {
          console.log(`Loading historical crossword data for ${crosswordId}`);
          setGridData(historicalData);
          setIsLoading(false);
          return;
        }

        // If it's the current crossword, try to fetch from contract
        if (crosswordId === currentCrosswordId) {
          try {
            const data = await publicClient.readContract({
              address: contractAddress,
              abi: [{
                "inputs": [],
                "name": "currentCrosswordData",
                "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
                "stateMutability": "view",
                "type": "function"
              }],
              functionName: 'currentCrosswordData'
            }) as string;

            if (data) {
              try {
                const parsedData = JSON.parse(data);
                setGridData({
                  clues: parsedData.clues,
                  gridSize: parsedData.gridSize
                });
              } catch (e) {
                console.error('Error parsing current crossword data JSON:', e);
                setError(new Error('Invalid crossword data format'));
              }
            } else {
              setGridData(null);
            }
          } catch (err) {
            console.error('Failed to fetch current crossword data:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
          }
        } else {
          // Unknown historical crossword - no data available
          console.log(`No data available for crossword ${crosswordId}`);
          setGridData(null);
        }
      } catch (err) {
        console.error('Error in crossword grid data fetch:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGridData();
  }, [crosswordId, publicClient, chainId]);

  return { gridData, isLoading, error };
}
