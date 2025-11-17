import { useContractRead, useWriteContract, useAccount, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { CONTRACTS } from '../lib/contracts';
import { celo, celoAlfajores } from 'wagmi/chains';
import { defineChain } from 'viem';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';

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

// Helper function to get contract config based on chain
const getContractConfig = (contractName: 'CrosswordBoard' | 'CrosswordPrizes') => {
  const chainId = useChainId();

  // Determine which chain configuration to use based on environment
  let chainConfig = CONTRACTS[celo.id]; // default to mainnet

  if (chainId === celo.id) {
    chainConfig = CONTRACTS[celo.id];
  } else if (chainId === celoAlfajores.id) {
    chainConfig = CONTRACTS[celoAlfajores.id];
  } else if (chainId === 11142220 || chainId === celoSepolia.id) { // Celo Sepolia testnet
    chainConfig = CONTRACTS[11142220];
  } else if (chainId === 44787) { // Legacy testnet ID
    chainConfig = CONTRACTS[celoAlfajores.id];
  }

  const contract = chainConfig[contractName];

  return {
    address: contract.address as `0x${string}`,
    abi: contract.abi,
  };
};

// Helper function to get error message from error object
const getErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  // Check for common error properties
  if (error.shortMessage) return error.shortMessage;
  if (error.message) return error.message;
  if (error.reason) return error.reason;

  return 'Transaction failed. Please try again.';
};

// CrosswordBoard contract hooks
export const useGetCurrentCrossword = () => {
  const contractConfig = getContractConfig('CrosswordBoard');
  const queryClient = useQueryClient();

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCurrentCrossword',
    blockTag: 'latest', // Use latest instead of safe for real-time updates
    query: {
      // Minimal caching for real-time updates
      retry: 1,
      retryDelay: 3000,
      staleTime: 0, // Data becomes stale immediately, forcing refetch
      gcTime: 2000, // Garbage collect quickly
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: 5000, // Regular refresh for real-time updates
    }
  });
};

export const useSetCrossword = () => {
  const { address, isConnected } = useAccount();
  const contractConfig = getContractConfig('CrosswordBoard');
  const queryClient = useQueryClient();

  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Transaction confirmed', {
        description: 'Your crossword has been successfully saved on the blockchain.',
      });
      // Invalidar directamente la consulta para forzar una actualización inmediata
      queryClient.invalidateQueries({ 
        queryKey: ['readContract', { 
          address: contractConfig.address, 
          functionName: 'getCurrentCrossword' 
        }] 
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError || writeError),
      });
      errorShown.current = true;
    }
  }, [isSuccess, isTxError, txError, writeError, queryClient, contractConfig.address]);

  // Reset the flags when a new transaction is initiated
  useEffect(() => {
    if (isPending) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [isPending]);
  
  // Also reset when data changes (new transaction initiated)
  useEffect(() => {
    if (data) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [data]);

  return {
    setCrossword: (args: [`0x${string}`, string]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'setCrossword',
        args
      }, {
        onError: (error) => {
          toast.error('Error setting crossword', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: (hash) => {
          toast.success('Crossword set successfully', {
            description: 'The crossword has been saved to the blockchain.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
    contractAddress: contractConfig.address, // Add contract address for cache invalidation
  };
};

export const useCompleteCrossword = () => {
  const contractConfig = getContractConfig('CrosswordBoard');
  const queryClient = useQueryClient();
  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Crossword completed successfully', {
        description: 'Your crossword completion has been recorded on the blockchain.',
      });
      // Invalidar consultas relacionadas para mantener los datos actualizados
      queryClient.invalidateQueries({ 
        queryKey: ['readContract', { 
          address: contractConfig.address, 
          functionName: 'getCurrentCrossword' 
        }] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['readContract', { 
          address: contractConfig.address, 
          functionName: 'userCompletedCrossword' 
        }] 
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError || writeError),
      });
      errorShown.current = true;
    }
  }, [isSuccess, isTxError, txError, writeError, queryClient, contractConfig.address]);

  // Reset the flags when a new transaction is initiated
  useEffect(() => {
    if (isPending) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [isPending]);
  
  // Also reset when data changes (new transaction initiated)
  useEffect(() => {
    if (data) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [data]);

  return {
    completeCrossword: (args: [`0x${string}`, bigint, string, string, string]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'completeCrossword',
        args
      }, {
        onError: (error) => {
          toast.error('Error completing crossword', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: (hash) => {
          toast.success('Transaction submitted', {
            description: 'Your crossword completion is being processed on the blockchain.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
    contractAddress: contractConfig.address, // Add contract address for cache invalidation
  };
};

export const useGetCrosswordCompletions = (crosswordId: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCrosswordCompletions',
    args: [crosswordId],
    query: {
      enabled: !!crosswordId,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });
};

export const useUserCompletedCrossword = (crosswordId: `0x${string}`, user: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'userCompletedCrossword',
    args: [crosswordId, user],
    blockTag: 'safe',
    query: {
      enabled: !!crosswordId && !!user,
      staleTime: 60000,  // Cache for 1 minute
      gcTime: 120000,    // Garbage collect after 2 minutes  
      retry: 1,          // Only retry once
      retryDelay: 5000,  // Wait 5 seconds between retries
    },
  });
};

// Check if current account is admin - checks both contracts for admin status
export const useIsAdmin = () => {
  const { address } = useAccount();
  const boardContractConfig = getContractConfig('CrosswordBoard');
  const prizesContractConfig = getContractConfig('CrosswordPrizes');

  // Check if user is admin on CrosswordBoard
  const boardAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'isAdminAddress',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,  // Cache for 5 minutes (admin status rarely changes)
      gcTime: 600000,     // Garbage collect after 10 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });

  // Check if user has admin role on CrosswordPrizes
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const prizesAdminResult = useContractRead({
    address: prizesContractConfig.address,
    abi: prizesContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,  // Cache for 5 minutes (admin status rarely changes)
      gcTime: 600000,     // Garbage collect after 10 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });

  // Combine both results - user is admin if they have admin status in either contract
  // (since deployer has admin rights in CrosswordBoard and also has DEFAULT_ADMIN_ROLE in CrosswordPrizes)
  const isAdmin = address && (
    (boardAdminResult.data === true) || 
    (prizesAdminResult.data === true)
  );

  // Return a combined result with the same interface as useContractRead
  return {
    data: isAdmin,
    isLoading: boardAdminResult.isLoading || prizesAdminResult.isLoading,
    isError: boardAdminResult.isError || prizesAdminResult.isError,
    error: boardAdminResult.error || prizesAdminResult.error,
    isSuccess: boardAdminResult.isSuccess || prizesAdminResult.isSuccess,
    isFetched: boardAdminResult.isFetched || prizesAdminResult.isFetched,
    refetch: () => {
      boardAdminResult.refetch();
      prizesAdminResult.refetch();
    }
  };
};

// Additional debugging hook for admin status
export const useAdminStatus = () => {
  const { address } = useAccount();
  const boardContractConfig = getContractConfig('CrosswordBoard');
  const prizesContractConfig = getContractConfig('CrosswordPrizes');

  // Check if user is admin on CrosswordBoard
  const boardAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'isAdminAddress',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,  // Cache for 5 minutes (admin status rarely changes)
      gcTime: 600000,     // Garbage collect after 10 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });

  // Check if user has admin role on CrosswordPrizes
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const prizesAdminResult = useContractRead({
    address: prizesContractConfig.address,
    abi: prizesContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,  // Cache for 5 minutes (admin status rarely changes)
      gcTime: 600000,     // Garbage collect after 10 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });

  // Check if user has DEFAULT_ADMIN_ROLE on CrosswordPrizes
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const defaultAdminResult = useContractRead({
    address: prizesContractConfig.address,
    abi: prizesContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  return {
    boardAdmin: boardAdminResult,
    prizesAdmin: prizesAdminResult, 
    defaultAdmin: defaultAdminResult,
    isBoardAdmin: boardAdminResult.data === true,
    isPrizesAdmin: prizesAdminResult.data === true,
    isDefaultAdmin: defaultAdminResult.data === true,
    isLoading: boardAdminResult.isLoading || prizesAdminResult.isLoading || defaultAdminResult.isLoading,
    allResults: {
      boardAdmin: boardAdminResult.data,
      prizesAdmin: prizesAdminResult.data,
      defaultAdmin: defaultAdminResult.data,
    }
  };
};

// CrosswordPrizes contract hooks
export const useGetCrosswordDetails = (crosswordId: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordPrizes');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCrosswordDetails',
    args: [crosswordId],
    query: {
      enabled: !!crosswordId,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });
};

export const useIsWinner = (crosswordId: `0x${string}`) => {
  const { address } = useAccount();
  const contractConfig = getContractConfig('CrosswordPrizes');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'isWinner',
    args: address && crosswordId ? [crosswordId, address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!crosswordId,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });
};

export const useClaimPrize = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Transaction confirmed', {
        description: 'Your prize has been successfully claimed.',
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError || writeError),
      });
      errorShown.current = true;
    }
  }, [isSuccess, isTxError, txError, writeError]);

  // Reset the flags when a new transaction is initiated
  useEffect(() => {
    if (isPending) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [isPending]);
  
  // Also reset when data changes (new transaction initiated)
  useEffect(() => {
    if (data) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [data]);

  return {
    claimPrize: (args: [`0x${string}`]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'claimPrize',
        args
      }, {
        onError: (error) => {
          toast.error('Error claiming prize', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: () => {
          toast.success('Prize claimed successfully', {
            description: 'Your prize has been claimed.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
  };
};

// Hook for creating crossword with prizes
export const useCreateCrossword = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Transaction confirmed', {
        description: 'The crossword has been successfully created on the blockchain.',
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError || writeError),
      });
      errorShown.current = true;
    }
  }, [isSuccess, isTxError, txError, writeError]);

  // Reset the flags when a new transaction is initiated
  useEffect(() => {
    if (isPending) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [isPending]);
  
  // Also reset when data changes (new transaction initiated)
  useEffect(() => {
    if (data) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [data]);

  return {
    createCrossword: (args: [`0x${string}`, `0x${string}`, bigint, number[], bigint]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'createCrossword',
        args
      }, {
        onError: (error) => {
          toast.error('Error creating crossword', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: () => {
          toast.success('Crossword created successfully', {
            description: 'The crossword with prizes has been created.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
  };
};

// Hook to get user profile
export const useGetUserProfile = (userAddress: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getUserProfile',
    args: [userAddress],
    query: {
      enabled: !!userAddress,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });
};

// Hook for registering winners
export const useRegisterWinners = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Transaction confirmed', {
        description: 'The winners have been successfully registered on the blockchain.',
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError || writeError),
      });
      errorShown.current = true;
    }
  }, [isSuccess, isTxError, txError, writeError]);

  // Reset the flags when a new transaction is initiated
  useEffect(() => {
    if (isPending) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [isPending]);
  
  // Also reset when data changes (new transaction initiated)
  useEffect(() => {
    if (data) {
      successShown.current = false;
      errorShown.current = false;
    }
  }, [data]);

  return {
    registerWinners: (args: [`0x${string}`, `0x${string}`[]]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'registerWinners',
        args
      }, {
        onError: (error) => {
          toast.error('Error registering winners', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: () => {
          toast.success('Winners registered successfully', {
            description: 'The winners have been registered for the crossword.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
  };
};