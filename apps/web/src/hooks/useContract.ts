import { useContractRead, useWriteContract, useAccount, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { CONTRACTS } from '../lib/contracts';
import { celo, celoAlfajores } from 'wagmi/chains';
import { defineChain } from 'viem';
import { toast } from 'sonner';
import { useEffect, useRef, useMemo } from 'react';
import { getHistoricalCrosswordData } from '@/lib/historical-crosswords';
import CrosswordBoardArtifact from '@/lib/abis/CrosswordBoard.json';
import CrosswordCoreArtifact from '@/lib/abis/CrosswordCore.json';
import CrosswordPrizesArtifact from '@/lib/abis/CrosswordPrizes.json';
import PublicCrosswordManagerArtifact from '@/lib/abis/PublicCrosswordManager.json';
import AdminManagerArtifact from '@/lib/abis/AdminManager.json';
import { useCallback } from 'react';

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

// Define Celo Sepolia chain
const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia Testnet',
  nativeCurrency: { name: 'CELO', symbol: 'A-CELO', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://forno.celo-sepolia.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Celo Explorer', url: 'https://sepolia.celoscan.io' },
  },
  testnet: true,
});

// Helper function to extract meaningful error messages
const getErrorMessage = (error: any): string => {
  try {
    // Handle different error formats
    if (error?.shortMessage) {
      return error.shortMessage;
    }
    if (error?.message) {
      // Extract specific error details from revert reasons
      if (error.message.includes('execution reverted:')) {
        const match = error.message.match(/execution reverted:\s*(.+)/i);
        if (match) {
          return match[1];
        }
      }
      return error.message;
    }
    if (error?.details) {
      return error.details;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unknown error occurred';
  } catch (e) {
    console.error('Error processing error message:', e);
    return 'An unknown error occurred';
  }
};

// Helper function to get contract config based on chain
const getContractConfig = (contractName: 'CrosswordBoard' | 'CrosswordCore' | 'CrosswordPrizes' | 'PublicCrosswordManager' | 'AdminManager', chainId: number | undefined): { address: `0x${string}`, abi: any } => {
  if (typeof window === 'undefined') {
    // We are on the server, return a dummy config to prevent crash
    return { address: '0x0000000000000000000000000000000000000000', abi: [] };
  }

  // Determine which chain configuration to use based on environment
  // PRIORITIZE CELO MAINNET (42220) for production stability
  let chainConfig = (CONTRACTS as any)[celo.id] || (CONTRACTS as any)[11142220]; 

  if (chainId === celo.id) {
    chainConfig = (CONTRACTS as any)[celo.id];
  } else if (chainId === celoAlfajores.id || chainId === 44787) {
    chainConfig = (CONTRACTS as any)[celoAlfajores.id];
  } else if (chainId === 11142220) { // Celo Sepolia testnet
    chainConfig = (CONTRACTS as any)[11142220];
  } else if (chainId === 31337) { // Local hardhat chain ID
    const localContracts = {
      CrosswordBoard: { address: '0x5fbdb2315678afecb367f032d93f642f64180aa3' },
      CrosswordCore: { address: '0x5fbdb2315678afecb367f032d93f642f64180aa3' },
      CrosswordPrizes: { address: '0x5fbdb2315678afecb367f032d93f642f64180aa3' },
      PublicCrosswordManager: { address: '0x5fbdb2315678afecb367f032d93f642f64180aa3' },
      AdminManager: { address: '0x5fbdb2315678afecb367f032d93f642f64180aa3' }
    };
    chainConfig = localContracts;
  }

  // Remove the dangerous fallback to CrosswordBoard when the specific contract name is missing.
  // If a contract is not in the config for the current chain, it should return a null address.
  const contract = chainConfig[contractName];

  const address = contract?.address || '0x0000000000000000000000000000000000000000';

  let abi;
  if (contractName === 'CrosswordBoard') {
    abi = CrosswordBoardArtifact.abi;
  } else if (contractName === 'CrosswordCore') {
    abi = CrosswordCoreArtifact.abi;
  } else if (contractName === 'CrosswordPrizes') {
    abi = CrosswordPrizesArtifact.abi;
  } else if (contractName === 'PublicCrosswordManager') {
    abi = PublicCrosswordManagerArtifact.abi;
  } else if (contractName === 'AdminManager') {
    abi = AdminManagerArtifact.abi;
  } else {
    abi = CrosswordBoardArtifact.abi; // Fallback
  }

  // Ensure the address is properly typed as a hex string
  const typedAddress = (address.startsWith('0x') ? address : '0x0000000000000000000000000000000000000000') as `0x${string}`;

  return {
    address: typedAddress,
    abi: abi,
  };
};

// Helper function to get the CrosswordBoard ABI
// In a real implementation, this would import from the artifacts
function getCrosswordBoardABI() {
  return CrosswordBoardArtifact.abi;
}

export const useGetCrosswordCompletions = (crosswordId: `0x${string}`, overrideContractAddress?: `0x${string}`) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const contractConfig = getContractConfig('CrosswordCore', chainId);
  const targetAddress = overrideContractAddress || contractConfig.address;

  const { data, isError, isLoading, error } = useContractRead({
    address: targetAddress,
    abi: contractConfig.abi,
    functionName: 'getCrosswordCompletions',
    args: [crosswordId],
    chainId: chainId,
    query: {
      enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && !!address && targetAddress !== '0x0000000000000000000000000000000000000000',
      staleTime: 0, // Always refetch on mount to ensure fresh data
    }
  });

  const toastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (isError) {
      const msg = getErrorMessage(error);
      toastId.current = toast.error(`Error fetching crossword completions: ${msg}`, { id: toastId.current });
    }
  }, [isError, error]);

  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: ['readContract', targetAddress, 'getCrosswordCompletions', crosswordId] }), [queryClient, targetAddress, crosswordId]);

  return {
    completions: data as { user: `0x${string}`, completionTimestamp: bigint, durationMs: bigint }[],
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useCrosswordPrizesDetails = (crosswordId: `0x${string}` | undefined) => {
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const contractConfig = getContractConfig('CrosswordPrizes', chainId);

  const { data, isError, isLoading, error } = useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCrosswordDetails',
    args: crosswordId ? [crosswordId] : undefined,
    chainId: chainId,
    query: {
      enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && contractConfig.address !== '0x0000000000000000000000000000000000000000',
      staleTime: 0, // Always refetch on mount
    }
  });

  const toastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (isError) {
      const msg = getErrorMessage(error);
      toastId.current = toast.error(`Error fetching prize details: ${msg}`, { id: toastId.current });
    }
  }, [isError, error]);

  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: ['readContract', contractConfig.address, 'getCrosswordDetails', crosswordId] }), [queryClient, contractConfig.address, crosswordId]);

  // The contract returns a tuple (token, totalPrizePool, winnerPercentages, winners, activationTime, endTime, state, isFinalized)
  return {
    prizeDetails: data as [
      `0x${string}`, // token
      bigint,       // totalPrizePool
      bigint[],     // winnerPercentages
      `0x${string}`[], // winners
      bigint,       // activationTime
      bigint,       // endTime
      number,       // state (enum CrosswordPrizes.CrosswordState)
      boolean       // isFinalized
    ],
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useUnifiedCrosswordPrizes = (crosswordId: `0x${string}` | undefined, isPublic: boolean = false) => {
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const prizesConfig = getContractConfig('CrosswordPrizes', chainId);
  const publicManagerConfig = getContractConfig('PublicCrosswordManager', chainId);

  // Fetch from CrosswordPrizes (Core)
  const { data: coreData, isLoading: isCoreLoading, isError: isCoreError, error: coreError } = useContractRead({
    address: prizesConfig.address,
    abi: prizesConfig.abi,
    functionName: 'getCrosswordDetails',
    args: crosswordId ? [crosswordId] : undefined,
    chainId: chainId,
    query: {
      enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && !isPublic && prizesConfig.address !== '0x0000000000000000000000000000000000000000' && !!prizesConfig.abi,
      staleTime: 0,
    }
  });

  // Fetch from PublicCrosswordManager
  const { data: publicData, isLoading: isPublicLoading, isError: isPublicError, error: publicError } = useContractRead({
    address: publicManagerConfig.address,
    abi: publicManagerConfig.abi,
    functionName: 'getCrosswordDetails',
    args: crosswordId ? [crosswordId] : undefined,
    chainId: chainId,
    query: {
      enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && isPublic && publicManagerConfig.address !== '0x0000000000000000000000000000000000000000' && !!publicManagerConfig.abi,
      staleTime: 0,
    }
  });

  // CRITICAL: Even for public crosswords, we need to fetch from CrosswordPrizes to get the winners list
  const { data: winnersData, isLoading: isWinnersLoading } = useContractRead({
    address: prizesConfig.address,
    abi: prizesConfig.abi,
    functionName: 'getCrosswordDetails',
    args: crosswordId ? [crosswordId] : undefined,
    chainId: chainId,
    query: {
      enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && isPublic && prizesConfig.address !== '0x0000000000000000000000000000000000000000' && !!prizesConfig.abi,
      staleTime: 0,
    }
  });

  const isLoading = isPublic ? (isPublicLoading || isWinnersLoading) : isCoreLoading;
  const isError = isPublic ? isPublicError : isCoreError;
  const error = isPublic ? publicError : coreError;

  const data = isPublic ? publicData : coreData;

  // Transform data to a unified format
  // CrosswordPrizes return: (token, totalPrizePool, winnerPercentages, winners, activationTime, endTime, state, isFinalized)
  // PublicCrosswordManager return: (name, sponsoredBy, crosswordData, token, totalPrizePool, maxWinners, winnerPercentages, activationTime, endTime, createdAt, isActive, isCompleted, creator)
  
  const prizeDetails = useMemo(() => {
    if (!data) return null;

    if (isPublic) {
      const d = data as any;
      
      // Extract winners from winnersData if available
      let winners: `0x${string}`[] = [];
      let totalPrizePool = d.totalPrizePool ?? d[4];
      let winnerPercentages = Array.isArray(d.winnerPercentages ?? d[6]) 
        ? (d.winnerPercentages ?? d[6]).map((p: any) => BigInt(p)) 
        : [];

      if (winnersData) {
        const wd = winnersData as any;
        winners = wd.winners ?? wd[3] ?? [];
        
        // CRITICAL: For coordinated crosswords, the actual prize pool and percentages 
        // are stored in CrosswordPrizes. We should prioritize these if they are non-zero.
        const coreTotalPrizePool = wd.totalPrizePool ?? wd[1];
        if (coreTotalPrizePool > 0n) {
          totalPrizePool = coreTotalPrizePool;
        }

        const corePercentages = wd.winnerPercentages ?? wd[2];
        if (Array.isArray(corePercentages) && corePercentages.length > 0) {
          winnerPercentages = corePercentages.map((p: any) => BigInt(p));
        }
      }

      return {
        token: d.token ?? d[3],
        totalPrizePool,
        winnerPercentages,
        winners: Array.isArray(winners) ? winners : [],
        activationTime: d.activationTime ?? d[7],
        endTime: d.endTime ?? d[8],
        isActive: d.isActive ?? d[10],
        isCompleted: d.isCompleted ?? d[11],
        maxWinners: d.maxWinners ?? d[5]
      };
    } else {
       const d = data as any;
       const token = d.token ?? d[0];
       const totalPrizePool = d.totalPrizePool ?? d[1];
       const winnerPercentages = d.winnerPercentages ?? d[2];
       const winners = d.winners ?? d[3];
       const activationTime = d.activationTime ?? d[4];
       const endTime = d.endTime ?? d[5];
       const state = d.state ?? d[6];
       const isFinalized = d.isFinalized ?? d[7];

       return {
         token,
         totalPrizePool,
         winnerPercentages: Array.isArray(winnerPercentages) ? winnerPercentages.map((p: any) => BigInt(p)) : [],
         winners: Array.isArray(winners) ? winners : [],
         activationTime,
         endTime,
         isActive: Number(state) === 1,
         isCompleted: isFinalized || Number(state) === 2,
       };
    }
  }, [data, isPublic, winnersData]);

  const refetch = useCallback(() => {
    if (isPublic) {
      return queryClient.invalidateQueries({ queryKey: ['readContract', publicManagerConfig.address, 'getCrosswordDetails', crosswordId] });
    } else {
      return queryClient.invalidateQueries({ queryKey: ['readContract', prizesConfig.address, 'getCrosswordDetails', crosswordId] });
    }
  }, [queryClient, isPublic, publicManagerConfig.address, prizesConfig.address, crosswordId]);

  return {
    prizeDetails,
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useClaimPrize = () => {
  const { writeContract, data: hash, isPending, error: writeError, isError: isWriteError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } =
    useWaitForTransactionReceipt({
      hash,
    });
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const toastId = useRef<string | number | undefined>(undefined);

  const contractConfig = getContractConfig('CrosswordPrizes', chainId);

  const claimPrize = async (args: [`0x${string}`]) => {
    if (contractConfig.address === '0x0000000000000000000000000000000000000000') {
      toastId.current = toast.error('Contract not deployed on this network.', { id: toastId.current });
      return;
    }
    try {
      toastId.current = toast.loading('Claiming prize...', { id: toastId.current });
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'claimPrize',
        args: args,
        chainId: chainId,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      toastId.current = toast.error(`Error initiating prize claim: ${msg}`, { id: toastId.current });
    }
  };

  useEffect(() => {
    if (isPending) {
      toastId.current = toast.loading('Waiting for wallet confirmation...', { id: toastId.current });
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming) {
      toastId.current = toast.loading('Transaction confirming...', { id: toastId.current });
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isConfirmed) {
      toastId.current = toast.success('Prize claimed successfully!', { id: toastId.current });
      // Invalidate cache for prize details and user's completion status to reflect changes
      queryClient.invalidateQueries({ queryKey: ['readContract', contractConfig.address, 'getCrosswordDetails'] });
      // Potentially invalidate user's balance if prize is in CELO or ERC20
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    }
    if (isConfirmError || isWriteError) {
      const error = confirmError || writeError;
      const msg = getErrorMessage(error);
      toastId.current = toast.error(`Prize claim failed: ${msg}`, { id: toastId.current });
    }
  }, [isConfirmed, isConfirmError, isWriteError, confirmError, writeError, queryClient, contractConfig.address]);

  return {
    claimPrize,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError || isWriteError,
    error: confirmError || writeError,
    txHash: hash,
  };
};

export const useGetActivePublicCrosswords = () => {
  const chainId = useChainId();
  const queryClient = useQueryClient();

  const contractConfig = getContractConfig('PublicCrosswordManager', chainId);

  const { data, isError, isLoading, isFetching, error, refetch } = useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getActiveCrosswordIds',
    args: [],
    chainId: chainId,
    query: {
      enabled: !!contractConfig.address && contractConfig.address !== '0x0000000000000000000000000000000000000000',
      staleTime: 1000 * 30, // Data considered fresh for 30 seconds
    }
  });

  const toastId = useRef<string | number | undefined>(undefined);

  useEffect(() => {
    if (isError) {
      const msg = getErrorMessage(error);
      toastId.current = toast.error(`Error fetching active crosswords: ${msg}`, { id: toastId.current });
    }
  }, [isError, error]);

  const memoizedRefetch = useCallback(() => refetch(), [refetch]);

  return {
    data: data as `0x${string}`[] | undefined,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: memoizedRefetch,
  };
};

export const useGetPublicCrosswordDetails = (crosswordId: `0x${string}` | undefined, overrideContractAddress?: `0x${string}`) => {
    const chainId = useChainId();

    const managerConfig = getContractConfig('PublicCrosswordManager', chainId);
    const prizesConfig = getContractConfig('CrosswordPrizes', chainId);
    
    // For heritage contracts, we might need to target the board address directly
    const targetManagerAddress = overrideContractAddress || managerConfig.address;
    const targetPrizesAddress = overrideContractAddress || prizesConfig.address;

    // Fetch primary metadata from PublicCrosswordManager
    const { data: managerData, isError: isManagerError, isLoading: isManagerLoading, error: managerError, refetch: refetchManager } = useContractRead({
        address: targetManagerAddress,
        abi: managerConfig.abi,
        functionName: 'getCrosswordDetails',
        args: crosswordId ? [crosswordId] : undefined,
        chainId: chainId,
        query: {
            enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && targetManagerAddress !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 5,
        }
    });

    // Fetch actual prize data from CrosswordPrizes (in case of coordination mismatch)
    const { data: prizesData, isLoading: isPrizesLoading } = useContractRead({
        address: targetPrizesAddress,
        abi: prizesConfig.abi,
        functionName: 'getCrosswordDetails',
        args: crosswordId ? [crosswordId] : undefined,
        chainId: chainId,
        query: {
            enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && targetPrizesAddress !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 5,
        }
    });

    const mergedData = useMemo(() => {
        if (!managerData) return undefined;
        
        const d = [...(managerData as any[])];
        
        // If we have prize data and the manager says 0 prize pool, patch it
        if (prizesData) {
            const pd = prizesData as any[];
            const corePrizePool = pd[1]; // Index 1 in CrosswordPrizes is totalPrizePool
            const corePercentages = pd[2]; // Index 2 in CrosswordPrizes is winnerPercentages
            const isFinalized = pd[7]; // Index 7 in CrosswordPrizes is isFinalized
            
            if (corePrizePool > 0n && (d[4] === 0n || d[4] === 0)) {
                d[4] = corePrizePool;
                d[6] = corePercentages;
            }
            
            // Always sync the overall completion status from the prizes contract
            if (isFinalized === true) {
                d[11] = true;
            }
        }
        
        return d;
    }, [managerData, prizesData]);

    const toastId = useRef<string | number | undefined>(undefined);

    useEffect(() => {
        if (isManagerError) {
            const msg = getErrorMessage(managerError);
            toastId.current = toast.error(`Error fetching crossword details: ${msg}`, { id: toastId.current });
        }
    }, [isManagerError, managerError]);

    const memoizedRefetch = useCallback(() => refetchManager(), [refetchManager]);

    return {
        data: mergedData,
        isLoading: isManagerLoading || isPrizesLoading,
        isError: isManagerError,
        error: managerError,
        refetch: memoizedRefetch,
    };
};

export const useUserCompletedCrossword = (crosswordId: `0x${string}`, userAddress: `0x${string}`) => {
    const chainId = useChainId();
    const queryClient = useQueryClient();

    const contractConfig = getContractConfig('CrosswordCore', chainId);

    const { data, isError, isLoading, error, refetch } = useContractRead({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'userCompletedCrossword',
        args: [crosswordId, userAddress],
        chainId: chainId,
        query: {
            enabled: !!crosswordId && crosswordId !== ZERO_BYTES32 && !!userAddress && userAddress !== '0x0000000000000000000000000000000000000000' && contractConfig.address !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 5, // 5 minutes
        }
    });

    const toastId = useRef<string | number | undefined>(undefined);

    useEffect(() => {
        if (isError) {
            const msg = getErrorMessage(error);
            toastId.current = toast.error(`Error checking if user completed crossword: ${msg}`, { id: toastId.current });
        }
    }, [isError, error]);

    const memoizedRefetch = useCallback(() => refetch(), [refetch]);

    return {
        data: data as boolean | undefined,
        isLoading,
        isError,
        error,
        refetch: memoizedRefetch,
    };
};

export const useCompleteCrossword = () => {
    const { writeContract, data: hash, isPending, error: writeError, isError: isWriteError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } =
        useWaitForTransactionReceipt({
            hash,
        });
    const chainId = useChainId();
    const queryClient = useQueryClient();
    const toastId = useRef<string | number | undefined>(undefined);

    const contractConfig = getContractConfig('CrosswordBoard', chainId); // Use CrosswordBoard as coordinator

    const completeCrossword = async (args: [`0x${string}`, bigint, string, string, string, `0x${string}`]) => {
        if (contractConfig.address === '0x0000000000000000000000000000000000000000') {
            toastId.current = toast.error('Contract not deployed on this network.', { id: toastId.current });
            return;
        }
        try {
            toastId.current = toast.loading('Completing crossword...', { id: toastId.current });
            writeContract({
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: 'completeCrossword',
                args: args,
                chainId: chainId,
                gas: BigInt(500000)
            });
        } catch (err) {
            const msg = getErrorMessage(err);
            toastId.current = toast.error(`Error completing crossword: ${msg}`, { id: toastId.current });
        }
    };

    useEffect(() => {
        if (isPending) {
            toastId.current = toast.loading('Waiting for wallet confirmation...', { id: toastId.current });
        }
    }, [isPending]);

    useEffect(() => {
        if (isConfirming) {
            toastId.current = toast.loading('Transaction confirming...', { id: toastId.current });
        }
    }, [isConfirming]);

    useEffect(() => {
        if (isConfirmed) {
            toastId.current = toast.success('Crossword completed successfully!', { id: toastId.current });
            // Invalidate coordinators and downstream contracts
            queryClient.invalidateQueries({ queryKey: ['readContract', contractConfig.address] });
            
            // ALSO invalidate Core contract as it's the actual source of truth for completion status
            const coreConfig = getContractConfig('CrosswordCore', chainId);
            queryClient.invalidateQueries({ queryKey: ['readContract', coreConfig.address] });
            
            // ALSO invalidate prize details on Prizes contract as it contains the winners array
            const prizesConfig = getContractConfig('CrosswordPrizes', chainId);
            queryClient.invalidateQueries({ queryKey: ['readContract', prizesConfig.address] });
        }
        if (isConfirmError || isWriteError) {
            const error = confirmError || writeError;
            const msg = getErrorMessage(error);
            toastId.current = toast.error(`Crossword completion failed: ${msg}`, { id: toastId.current });
        }
    }, [isConfirmed, isConfirmError, isWriteError, confirmError, writeError, queryClient, contractConfig.address]);

    return {
        completeCrossword,
        isLoading: isPending || isConfirming,
        isSuccess: isConfirmed,
        isError: isConfirmError || isWriteError,
        error: confirmError || writeError,
        txHash: hash,
    };
};

export const useGetCurrentCrossword = () => {
    const chainId = useChainId();
    const contractConfig = getContractConfig('CrosswordCore', chainId);

    const { data, isError, isLoading, error, refetch } = useContractRead({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'getCurrentCrossword',
        args: [],
        chainId: chainId,
        query: {
            enabled: contractConfig.address !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 5, // 5 seconds
        }
    });

    const toastId = useRef<string | number | undefined>(undefined);

    useEffect(() => {
        if (isError) {
            const msg = getErrorMessage(error);
            toastId.current = toast.error(`Error fetching current crossword: ${msg}`, { id: toastId.current });
        }
    }, [isError, error]);

    const memoizedRefetch = useCallback(() => refetch(), [refetch]);

    return {
        data: data as [`0x${string}`, string, bigint] | undefined,
        isLoading,
        isError,
        error,
        refetch: memoizedRefetch,
    };
};

export const useGetUserProfile = (userAddress: `0x${string}`) => {
    const chainId = useChainId();
    const contractConfig = getContractConfig('CrosswordCore', chainId);

    const { data, isError, isLoading, error, refetch } = useContractRead({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'getUserProfile',
        args: [userAddress],
        chainId: chainId,
        query: {
            enabled: !!userAddress && userAddress !== '0x0000000000000000000000000000000000000000' && contractConfig.address !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 5, // 5 minutes
        }
    });

    const toastId = useRef<string | number | undefined>(undefined);

    useEffect(() => {
        if (isError) {
            const msg = getErrorMessage(error);
            toastId.current = toast.error(`Error fetching user profile: ${msg}`, { id: toastId.current });
        }
    }, [isError, error]);

    const memoizedRefetch = useCallback(() => refetch(), [refetch]);

    return {
        data: data as [string, string, string, bigint] | undefined,
        isLoading,
        isError,
        error,
        refetch: memoizedRefetch,
    };
};

export const useIsAdmin = () => {
    const { address } = useAccount();
    const chainId = useChainId();

    const contractConfig = getContractConfig('AdminManager', chainId);

    const { data, isError, isLoading, error, refetch } = useContractRead({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'isAdmin',
        args: address ? [address] : undefined,
        chainId: chainId,
        query: {
            enabled: !!address && contractConfig.address !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 5, // 5 minutes
        }
    });

    const toastId = useRef<string | number | undefined>(undefined);

    useEffect(() => {
        if (isError) {
            const msg = getErrorMessage(error);
            toastId.current = toast.error(`Error checking admin status: ${msg}`, { id: toastId.current });
        }
    }, [isError, error]);

    const memoizedRefetch = useCallback(() => refetch(), [refetch]);

    return {
        data: data as boolean | undefined,
        isLoading,
        isError,
        error,
        refetch: memoizedRefetch,
    };
};

const useGenericCreateCrossword = (functionName: string) => {
  const { writeContract, data: hash, isPending, error: writeError, isError: isWriteError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError } =
    useWaitForTransactionReceipt({
      hash,
    });
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const toastId = useRef<string | number | undefined>(undefined);

  const contractConfig = getContractConfig('CrosswordBoard', chainId); // Use CrosswordBoard as coordinator


  const createCrossword = async (args: any[], value: bigint | undefined = undefined) => {
    if (contractConfig.address === '0x0000000000000000000000000000000000000000') {
      toastId.current = toast.error('Contract not deployed on this network.', { id: toastId.current });
      return;
    }
    try {
      toastId.current = toast.loading('Creating crossword...', { id: toastId.current });
      console.log("useGenericCreateCrossword calling writeContract with:", JSON.stringify({
        address: contractConfig.address,
        functionName,
        args,
        value: value?.toString(),
        chainId
      }, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName,
        args,
        value,
        chainId,
      });
    } catch (err) {
      const msg = getErrorMessage(err);
      toastId.current = toast.error(`Error creating crossword: ${msg}`, { id: toastId.current });
    }
  };
  
  useEffect(() => {
    if (isPending) {
      toastId.current = toast.loading('Waiting for wallet confirmation...', { id: toastId.current });
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming) {
      toastId.current = toast.loading('Transaction confirming...', { id: toastId.current });
    }
  }, [isConfirming]);
  
  useEffect(() => {
    if (isConfirmed) {
      toastId.current = toast.success('Crossword created successfully!', { id: toastId.current });
      // Invalidate the coordinator
      queryClient.invalidateQueries({ queryKey: ['readContract', contractConfig.address] });
      
      // ALSO invalidate the PublicCrosswordManager as it holds the actual list of crosswords
      const managerConfig = getContractConfig('PublicCrosswordManager', chainId);
      queryClient.invalidateQueries({ queryKey: ['readContract', managerConfig.address] });
    }
    if (isConfirmError || isWriteError) {
      const error = confirmError || writeError;
      const msg = getErrorMessage(error);
      toastId.current = toast.error(`Crossword creation failed: ${msg}`, { id: toastId.current });
    }
  }, [isConfirmed, isConfirmError, isWriteError, confirmError, writeError, queryClient, contractConfig.address]);

  return {
    createCrossword,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError || isWriteError,
    error: confirmError || writeError,
    contractAddress: contractConfig.address,
    txHash: hash,
  };
};

export const useCreatePublicCrossword = () => {
    const { createCrossword, ...rest } = useGenericCreateCrossword('createCrossword');
    return { createPublicCrossword: createCrossword, ...rest };
};

export const useCreatePublicCrosswordWithPrizePool = () => {
    const { createCrossword, ...rest } = useGenericCreateCrossword('createCrosswordWithPrizePool');
    return { createPublicCrosswordWithPrizePool: createCrossword, ...rest };
};

export const useCreatePublicCrosswordWithNativeCELOPrizePool = () => {
    const { createCrossword, ...rest } = useGenericCreateCrossword('createPublicCrosswordWithNativeCELOPrizePool');
    return { createPublicCrosswordWithNativeCELOPrizePool: createCrossword, ...rest };
};

export const useActivateCrossword = () => {
    const { createCrossword, ...rest } = useGenericCreateCrossword('activateCrossword');
    return { activateCrossword: createCrossword, ...rest };
};

export const useGetCrosswordDetailsById = (crosswordId: `0x${string}` | undefined, overrideContractAddress?: `0x${string}`) => {
  return useGetPublicCrosswordDetails(crosswordId, overrideContractAddress);
};

// Compatibility hooks for older versions
export const useSetCrossword = () => {
    const { createCrossword, ...rest } = useGenericCreateCrossword('createCrossword');
    return { setCrossword: createCrossword, ...rest };
};

export const useGetCrosswordDetails = useGetCrosswordDetailsById;

export const useGetMaxWinnersConfig = () => {
    const chainId = useChainId();
    const contractConfig = getContractConfig('PublicCrosswordManager', chainId);

    const { data, isError, isLoading, error, refetch } = useContractRead({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'MAX_WINNERS',
        args: [],
        chainId: chainId,
        query: {
            enabled: contractConfig.address !== '0x0000000000000000000000000000000000000000',
            staleTime: 1000 * 60 * 60, // 1 hour, it's a constant
        }
    });

    return {
        data: data as bigint | undefined,
        isLoading,
        isError,
        error,
        refetch,
    };
};

export const useSetConfig = () => {
    const toastId = useRef<string | number | undefined>(undefined);

    const setConfig = async (args: any) => {
        toastId.current = toast.warning(
            'Setting global config is deprecated. Max winners are now set per crossword.',
            { id: toastId.current }
        );
    };

    return {
        setConfig,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        txHash: null,
    };
};

