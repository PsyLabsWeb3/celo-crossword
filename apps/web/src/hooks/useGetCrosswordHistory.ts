import { useState, useEffect, useRef, useMemo } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import { getHistoricalCrosswordData, HISTORICAL_CROSSWORDS } from '@/lib/historical-crosswords';

interface CrosswordHistoryItem {
  crosswordId: `0x${string}`;
  token: string;
  prizePool: bigint;
  creator: string;
  blockNumber: bigint;
  timestamp: number;
  contractAddress: `0x${string}`;
  coreAddress?: `0x${string}`; // Separate core address for completions on modularized contracts
  isLegacy?: boolean; // New property
  name?: string;
  sponsoredBy?: string;
  gridData?: { clues: any[]; gridSize: { rows: number; cols: number }; isTest?: boolean };
  isActive?: boolean;
  isCompleted?: boolean;
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
  const crosswordIdsFilter = useMemo(() => options?.crosswordIds || [], [options?.crosswordIds]);
  const [crosswords, setCrosswords] = useState<CrosswordHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publicClient = usePublicClient();
  const chainId = useChainId();

  // Get board history for current chain
  const boardHistory = (CONTRACTS as any)[chainId]?.['BoardHistory'] as `0x${string}`[] || [];
  const currentContractAddress = (CONTRACTS as any)[chainId]?.['CrosswordBoard']?.address as `0x${string}` | undefined;
  const publicManagerAddress = (CONTRACTS as any)[chainId]?.['PublicCrosswordManager']?.address as `0x${string}` | undefined;
  
  // Build list of contracts to query:
  // 1. Current PublicCrosswordManager (for new crosswords)
  // 2. BoardHistory (for old crosswords)
  // 3. Current CrosswordBoard as fallback
  const contractAddresses = useMemo(() => {
    const addresses: `0x${string}`[] = [];
    
    // Always add PublicCrosswordManager first if available (most recent crosswords)
    if (publicManagerAddress && publicManagerAddress !== '0x0000000000000000000000000000000000000000') {
      addresses.push(publicManagerAddress);
    }
    
    // Add board history
    if (boardHistory.length > 0) {
      addresses.push(...boardHistory);
    }
    
    // Add current board as fallback if not already included
    if (currentContractAddress && !addresses.includes(currentContractAddress)) {
      addresses.push(currentContractAddress);
    }
    
    return addresses;
  }, [boardHistory, currentContractAddress, publicManagerAddress]);

  // Refs to prevent unnecessary re-execution
  const prevChainId = useRef(chainId);
  const prevContractAddresses = useRef(contractAddresses);
  const prevCrosswordIdsFilter = useRef(crosswordIdsFilter);
  
  // Check if dependencies have actually changed
  const hasChanged = useRef(false);
  if (
    prevChainId.current !== chainId ||
    JSON.stringify(prevContractAddresses.current) !== JSON.stringify(contractAddresses) ||
    JSON.stringify(prevCrosswordIdsFilter.current) !== JSON.stringify(crosswordIdsFilter)
  ) {
    hasChanged.current = true;
    prevChainId.current = chainId;
    prevContractAddresses.current = contractAddresses;
    prevCrosswordIdsFilter.current = crosswordIdsFilter;
  }

  // Fetch all crossword events at once
  useEffect(() => {
    // Skip if nothing has changed and we've already loaded data
    if (!hasChanged.current && !isLoading) {
      return;
    }
    
    hasChanged.current = false;
    
    const fetchCrosswords = async () => {
      if (!publicClient || contractAddresses.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setIsError(false);

        // If specific crossword IDs are provided, fetch details for each
        if (crosswordIdsFilter && crosswordIdsFilter.length > 0) {
          const crosswordPromises = crosswordIdsFilter.map(async (id) => {
            try {
              // First check if this is a historical crossword with hardcoded data
              const historicalData = getHistoricalCrosswordData(id);

              if (historicalData) {
                // Use hardcoded data from historical-crosswords.ts
                return {
                  crosswordId: id,
                  token: historicalData.token || '0x0000000000000000000000000000000000000000',
                  prizePool: BigInt(historicalData.prizePool || '0'),
                  creator: '0x0000000000000000000000000000000000000000',
                  blockNumber: 0n,
                  timestamp: historicalData.timestamp || 0,
                  contractAddress: (historicalData as any).contractAddress || contractAddresses[0],
                  coreAddress: (historicalData as any).coreAddress || (historicalData as any).contractAddress,
                  isLegacy: true,
                  name: historicalData.name,
                  gridData: historicalData.gridSize && historicalData.clues ? {
                    clues: historicalData.clues,
                    gridSize: historicalData.gridSize
                  } : undefined,
                  isActive: false,
                  isCompleted: true
                } as CrosswordHistoryItem;
              }

              // Otherwise fetch details from the first contract that has this crossword
              for (const address of contractAddresses) {
                try {
                  // STRATEGY 1: Modern getCrosswordDetails
                  try {
                    const details = await publicClient.readContract({
                      address,
                      abi: [{
                        "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                        "name": "getCrosswordDetails",
                        "outputs": [
                          { "internalType": "string", "name": "name", "type": "string" },
                          { "internalType": "string", "name": "sponsoredBy", "type": "string" },
                          { "internalType": "string", "name": "crosswordData", "type": "string" },
                          { "internalType": "address", "name": "token", "type": "address" },
                          { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                          { "internalType": "uint256", "name": "maxWinners", "type": "uint256" },
                          { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                          { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                          { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                          { "internalType": "bool", "name": "isActive", "type": "bool" },
                          { "internalType": "bool", "name": "isCompleted", "type": "bool" },
                          { "internalType": "address", "name": "creator", "type": "address" }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                      }],
                      functionName: 'getCrosswordDetails',
                      args: [id]
                    }) as any;

                    if (details && typeof details[0] === 'string') {
                      const [name, sponsoredBy, gridDataStr, token, prizePool, , , activationTime, , , isActive, isCompleted] = details;
                      let gridData;
                      if (gridDataStr) {
                        try {
                          const parsedGridData = JSON.parse(gridDataStr);
                          gridData = {
                            clues: parsedGridData.clues,
                            gridSize: parsedGridData.gridSize,
                            isTest: parsedGridData.isTest
                          };
                        } catch (e) { gridData = undefined; }
                      }

                      return {
                        crosswordId: id,
                        token,
                        prizePool,
                        creator: details[12] || '0x0000000000000000000000000000000000000000',
                        blockNumber: 0n,
                        timestamp: Number(activationTime) || Number(details[9]) || 0,
                        contractAddress: address,
                        coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                        name: name || undefined,
                        sponsoredBy: sponsoredBy || undefined,
                        gridData,
                        isActive,
                        isCompleted
                      } as CrosswordHistoryItem;
                    }
                  } catch (e) { /* ignore and try next strategy */ }

                  // STRATEGY 2: Modern getPublicCrosswordDetails
                  try {
                    const details = await publicClient.readContract({
                      address,
                      abi: [{
                        "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                        "name": "getPublicCrosswordDetails",
                        "outputs": [
                          { "internalType": "string", "name": "name", "type": "string" },
                          { "internalType": "string", "name": "sponsoredBy", "type": "string" },
                          { "internalType": "string", "name": "crosswordData", "type": "string" },
                          { "internalType": "address", "name": "token", "type": "address" },
                          { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                          { "internalType": "uint256", "name": "maxWinners", "type": "uint256" },
                          { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                          { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                          { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                          { "internalType": "bool", "name": "isActive", "type": "bool" },
                          { "internalType": "bool", "name": "isCompleted", "type": "bool" },
                          { "internalType": "address", "name": "creator", "type": "address" }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                      }],
                      functionName: 'getPublicCrosswordDetails',
                      args: [id]
                    }) as any;

                    if (details && typeof details[0] === 'string') {
                      const [name, sponsoredBy, gridDataStr, token, prizePool, , , activationTime, , , isActive, isCompleted] = details;
                      let gridData;
                      if (gridDataStr) {
                        try {
                          const parsedGridData = JSON.parse(gridDataStr);
                          gridData = {
                            clues: parsedGridData.clues,
                            gridSize: parsedGridData.gridSize,
                            isTest: parsedGridData.isTest
                          };
                        } catch (e) { gridData = undefined; }
                      }

                      return {
                        crosswordId: id,
                        token,
                        prizePool,
                        creator: details[12] || '0x0000000000000000000000000000000000000000',
                        blockNumber: 0n,
                        timestamp: Number(activationTime) || Number(details[9]) || 0,
                        contractAddress: address,
                        coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                        name: name || undefined,
                        sponsoredBy: sponsoredBy || undefined,
                        gridData,
                        isActive,
                        isCompleted
                      } as CrosswordHistoryItem;
                    }
                  } catch (e) { /* ignore and try next strategy */ }

                  // STRATEGY 3: Legacy getCrosswordDetails
                  const details = await publicClient.readContract({
                    address: address,
                    abi: [{
                      "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                      "name": "getCrosswordDetails",
                      "outputs": [
                        { "internalType": "address", "name": "token", "type": "address" },
                        { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                        { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                        { "internalType": "tuple[]", "name": "completions", "type": "tuple[]", "components": [
                          { "internalType": "address", "name": "user", "type": "address" },
                          { "internalType": "uint256", "name": "completionTimestamp", "type": "uint256" },
                          { "internalType": "uint256", "name": "durationMs", "type": "uint256" }
                        ]},
                        { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                        { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                        { "internalType": "uint8", "name": "state", "type": "uint8" },
                        { "internalType": "string", "name": "name", "type": "string" },
                        { "internalType": "string", "name": "gridData", "type": "string" },
                        { "internalType": "string", "name": "sponsoredBy", "type": "string" }
                      ],
                      "stateMutability": "view",
                      "type": "function"
                    }],
                    functionName: 'getCrosswordDetails',
                    args: [id]
                  }) as any;

                  const [token, prizePool, , , activationTime, , state, name, gridDataStr, sponsoredBy] = details as [string, bigint, any[], any[], bigint, bigint, number, string, string, string];
                  const isActive = state === 1; // Assuming state 1 is active
                  const isCompleted = state === 2; // Assuming state 2 is completed

                  // If details found, parsing grid data
                  let gridData;
                  if (gridDataStr) {
                    try {
                      const parsedGridData = JSON.parse(gridDataStr);
                      gridData = {
                        clues: parsedGridData.clues,
                        gridSize: parsedGridData.gridSize,
                        isTest: parsedGridData.isTest
                      };
                    } catch (e) {
                      gridData = undefined;
                    }
                  }

                    return {
                      crosswordId: id,
                      token: token,
                      prizePool: prizePool,
                      creator: '0x0000000000000000000000000000000000000000',
                      blockNumber: 0n,
                      timestamp: Number(activationTime),
                      contractAddress: address,
                      coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                      name: name || undefined,
                      sponsoredBy: sponsoredBy || undefined,
                      gridData,
                      isActive,
                      isCompleted
                    } as CrosswordHistoryItem;
                } catch (contractErr) {
                  // If fetch fails from one contract, try next one in history
                  continue;
                }
              }

              // Fallback if not found in any contract
              return {
                crosswordId: id,
                token: '0x0000000000000000000000000000000000000000',
                prizePool: 0n,
                creator: '0x0000000000000000000000000000000000000000',
                blockNumber: 0n,
                timestamp: Math.floor(Date.now() / 1000),
                contractAddress: contractAddresses[0],
                name: undefined,
                gridData: undefined
              } as CrosswordHistoryItem;
            } catch (err) {
              console.error(`Error fetching details for crossword ${id}:`, err);
              return null;
            }
          });

          const results = (await Promise.all(crosswordPromises))
            .filter((c): c is CrosswordHistoryItem => c !== null)
            .filter(c => !c.isActive || c.isCompleted); // Filter out active crosswords (unless marked completed)
          results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setCrosswords(results);
          setIsLoading(false);
          return;
        }

        // Otherwise, fetch all completed crosswords from all configured contracts
        try {
          console.log(`Fetching completed crosswords from ${contractAddresses.length} contracts...`);
          
          const allCompletedIdsPromises = contractAddresses.map(async (address) => {
            try {
              // Try getAllPublicCrosswords first (Modern PublicCrosswordManager - returns all crosswords)
              try {
                const result = await publicClient.readContract({
                  address,
                  abi: [{
                    "inputs": [],
                    "name": "getAllPublicCrosswords",
                    "outputs": [{ "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }],
                    "stateMutability": "view",
                    "type": "function"
                  }],
                  functionName: 'getAllPublicCrosswords'
                }) as `0x${string}`[];
                console.log(`getAllPublicCrosswords from ${address}:`, result);
                return result;
              } catch (e) {
                // If fails, try getActiveCrosswordIds (Modern PublicCrosswordManager - returns active crosswords)
                try {
                  const result = await publicClient.readContract({
                    address,
                    abi: [{
                      "inputs": [],
                      "name": "getActiveCrosswordIds",
                      "outputs": [{ "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }],
                      "stateMutability": "view",
                      "type": "function"
                    }],
                    functionName: 'getActiveCrosswordIds'
                  }) as `0x${string}`[];
                  console.log(`getActiveCrosswordIds from ${address}:`, result);
                  return result;
                } catch (e2) {
                  // Finally try getCompletedCrosswords (Legacy)
                  const result = await publicClient.readContract({
                    address,
                    abi: [{
                      "inputs": [],
                      "name": "getCompletedCrosswords",
                      "outputs": [{ "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }],
                      "stateMutability": "view",
                      "type": "function"
                    }],
                    functionName: 'getCompletedCrosswords'
                  }) as `0x${string}`[];
                  console.log(`getCompletedCrosswords from ${address}:`, result);
                  return result;
                }
              }
            } catch (err) {
              console.warn(`Could not fetch crosswords from ${address}:`, err);
              return [];
            }
          });

          const completedIdSets = await Promise.all(allCompletedIdsPromises);
          // Deduplicate IDs in case they exist across contracts (unlikely but possible)
           const legacyIds = Object.keys(HISTORICAL_CROSSWORDS) as `0x${string}`[];
           const combinedIds = Array.from(new Set([...completedIdSets.flat(), ...legacyIds]));
           const uniqueCompletedIds = combinedIds;

          const crosswordPromises = uniqueCompletedIds.map(async (id) => {
            // First check if this is a historical crossword with hardcoded data
            const historicalData = getHistoricalCrosswordData(id);

            if (historicalData) {
              return {
                crosswordId: id,
                token: historicalData.token || '0x0000000000000000000000000000000000000000',
                prizePool: BigInt(historicalData.prizePool || '0'),
                creator: '0x0000000000000000000000000000000000000000',
                blockNumber: 0n,
                timestamp: historicalData.timestamp || 0,
                contractAddress: (historicalData as any).contractAddress || contractAddresses[0],
                coreAddress: (historicalData as any).coreAddress || (historicalData as any).contractAddress,
                isLegacy: true,
                name: historicalData.name,
                sponsoredBy: historicalData.sponsoredBy,
                gridData: historicalData.gridSize && historicalData.clues ? {
                  clues: historicalData.clues,
                  gridSize: historicalData.gridSize
                } : undefined,
                isActive: false,
                isCompleted: true
              } as CrosswordHistoryItem;
            }

            // Find details for each ID
            for (const address of contractAddresses) {
              try {
                // STRATEGY 1: Try getPublicCrosswordDetails or getCrosswordDetails with Modern Signature
                // (name, sponsoredBy, crosswordData, token, totalPrizePool, maxWinners, winnerPercentages, activationTime, endTime, createdAt, isActive, isCompleted, creator)
                try {
                  const details = await publicClient.readContract({
                    address,
                    abi: [{
                      "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                      "name": "getCrosswordDetails", // Modern signature has more fields
                      "outputs": [
                        { "internalType": "string", "name": "name", "type": "string" },
                        { "internalType": "string", "name": "sponsoredBy", "type": "string" },
                        { "internalType": "string", "name": "crosswordData", "type": "string" },
                        { "internalType": "address", "name": "token", "type": "address" },
                        { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                        { "internalType": "uint256", "name": "maxWinners", "type": "uint256" },
                        { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                        { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                        { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                        { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                        { "internalType": "bool", "name": "isActive", "type": "bool" },
                        { "internalType": "bool", "name": "isCompleted", "type": "bool" },
                        { "internalType": "address", "name": "creator", "type": "address" }
                      ],
                      "stateMutability": "view",
                      "type": "function"
                    }],
                    functionName: 'getCrosswordDetails',
                    args: [id]
                  }) as any;

                  if (details && typeof details[0] === 'string') {
                    const [name, sponsoredBy, gridDataStr, token, prizePool, , , activationTime, , , isActive, isCompleted] = details;
                    
                    let gridData;
                    if (gridDataStr) {
                      try {
                        const parsedGridData = JSON.parse(gridDataStr);
                        gridData = {
                          clues: parsedGridData.clues,
                          gridSize: parsedGridData.gridSize,
                          isTest: parsedGridData.isTest
                        };
                      } catch (e) { gridData = undefined; }
                    }

                    return {
                      crosswordId: id,
                      token,
                      prizePool,
                      creator: details[12] || '0x0000000000000000000000000000000000000000',
                      blockNumber: 0n,
                      timestamp: Number(activationTime) || Number(details[9]) || 0,
                      contractAddress: address,
                      coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                      isLegacy: false,
                      name: name || undefined,
                      sponsoredBy: sponsoredBy || undefined,
                      gridData,
                      isActive,
                      isCompleted
                    } as CrosswordHistoryItem;
                  }
                } catch (modernErr) {
                   // Continue to Strategy 2
                }

                // STRATEGY 2: Try getPublicCrosswordDetails (Modern CrosswordBoard signature)
                try {
                  const details = await publicClient.readContract({
                    address,
                    abi: [{
                      "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                      "name": "getPublicCrosswordDetails",
                      "outputs": [
                        { "internalType": "string", "name": "name", "type": "string" },
                        { "internalType": "string", "name": "sponsoredBy", "type": "string" },
                        { "internalType": "string", "name": "crosswordData", "type": "string" },
                        { "internalType": "address", "name": "token", "type": "address" },
                        { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                        { "internalType": "uint256", "name": "maxWinners", "type": "uint256" },
                        { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                        { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                        { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                        { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
                        { "internalType": "bool", "name": "isActive", "type": "bool" },
                        { "internalType": "bool", "name": "isCompleted", "type": "bool" },
                        { "internalType": "address", "name": "creator", "type": "address" }
                      ],
                      "stateMutability": "view",
                      "type": "function"
                    }],
                    functionName: 'getPublicCrosswordDetails',
                    args: [id]
                  }) as any;

                  if (details && typeof details[0] === 'string') {
                    const [name, sponsoredBy, gridDataStr, token, prizePool, , , activationTime, , , isActive, isCompleted] = details;
                    let gridData;
                    if (gridDataStr) {
                      try {
                        const parsedGridData = JSON.parse(gridDataStr);
                        gridData = {
                          clues: parsedGridData.clues,
                          gridSize: parsedGridData.gridSize,
                          isTest: parsedGridData.isTest
                        };
                      } catch (e) { gridData = undefined; }
                    }

                    return {
                      crosswordId: id,
                      token,
                      prizePool,
                      creator: details[12] || '0x0000000000000000000000000000000000000000',
                      blockNumber: 0n,
                      timestamp: Number(activationTime) || Number(details[9]) || 0,
                      contractAddress: address,
                      coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                      isLegacy: false,
                      name: name || undefined,
                      sponsoredBy: sponsoredBy || undefined,
                      gridData
                    } as CrosswordHistoryItem;
                  }
                } catch (modernErr2) {
                   // Continue to Strategy 3
                }

                // STRATEGY 3: Try Legacy getCrosswordDetails
                const details = await publicClient.readContract({
                  address,
                  abi: [{
                    "inputs": [{ "internalType": "bytes32", "name": "crosswordId", "type": "bytes32" }],
                    "name": "getCrosswordDetails",
                    "outputs": [
                      { "internalType": "address", "name": "token", "type": "address" },
                      { "internalType": "uint256", "name": "totalPrizePool", "type": "uint256" },
                      { "internalType": "uint256[]", "name": "winnerPercentages", "type": "uint256[]" },
                      { "internalType": "tuple[]", "name": "completions", "type": "tuple[]", "components": [
                        { "internalType": "address", "name": "user", "type": "address" },
                        { "internalType": "uint256", "name": "completionTimestamp", "type": "uint256" },
                        { "internalType": "uint256", "name": "durationMs", "type": "uint256" }
                      ]},
                      { "internalType": "uint256", "name": "activationTime", "type": "uint256" },
                      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
                      { "internalType": "uint8", "name": "state", "type": "uint8" },
                      { "internalType": "string", "name": "name", "type": "string" },
                      { "internalType": "string", "name": "gridData", "type": "string" },
                      { "internalType": "string", "name": "sponsoredBy", "type": "string" }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                  }],
                  functionName: 'getCrosswordDetails',
                  args: [id]
                }) as any;

                const [token, prizePool, , , activationTime, , state, name, gridDataStr, sponsoredBy] = details as [string, bigint, any[], any[], bigint, bigint, number, string, string, string];
                const isActive = state === 1;
                const isCompleted = state === 2;

                let gridData;
                if (gridDataStr) {
                  try {
                    const parsedGridData = JSON.parse(gridDataStr);
                    gridData = {
                      clues: parsedGridData.clues,
                      gridSize: parsedGridData.gridSize,
                      isTest: parsedGridData.isTest
                    };
                  } catch (e) {
                    gridData = undefined;
                  }
                }

                const isLegacy = !!getHistoricalCrosswordData(id);

                return {
                  crosswordId: id,
                  token,
                  prizePool,
                  creator: '0x0000000000000000000000000000000000000000',
                  blockNumber: 0n,
                  timestamp: Number(activationTime),
                  contractAddress: address,
                  coreAddress: (CONTRACTS as any)[chainId]?.['CrosswordCore']?.address as `0x${string}` | undefined,
                  isLegacy,
                  name: name || undefined,
                  sponsoredBy: sponsoredBy || undefined,
                  gridData,
                  isActive,
                  isCompleted
                } as CrosswordHistoryItem;
              } catch (e) {
                continue;
              }
            }
            return null;
          });

          const results = (await Promise.all(crosswordPromises))
            .filter((c): c is CrosswordHistoryItem => c !== null)
            .filter(c => !c.isActive || c.isCompleted); // Filter out active crosswords
          results.sort((a, b) => b.timestamp - a.timestamp);
          setCrosswords(results);
        } catch (err) {
          console.error('Error fetching completed crosswords:', err);
          setCrosswords([]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching crossword history:', err);
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    };

    fetchCrosswords();
  }, [publicClient, chainId, contractAddresses, crosswordIdsFilter, isLoading]);

  return {
    crosswords,
    isLoading,
    isError,
    error,
    hasMore: false,
    loadMore: () => {},
  };
}