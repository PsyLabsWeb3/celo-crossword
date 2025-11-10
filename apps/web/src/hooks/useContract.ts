import { useContractRead, useWriteContract, useAccount, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { CONTRACTS } from '../lib/contracts';
import { celo, celoAlfajores } from 'wagmi/chains';
import { defineChain } from 'viem';
import { toast } from 'sonner';
import { useEffect } from 'react';

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

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCurrentCrossword',
    query: {
      // Configurar tiempos de espera razonables para entornos de Farcaster
      retry: 2, // Reintentar 2 veces en caso de fallo
      retryDelay: 3000, // Esperar 3 segundos entre reintentos
      staleTime: 10000, // Considerar datos como "frescos" por 10 segundos
      gcTime: 300000, // Tiempo de recolección de basura (5 minutos)
      // Configurar timeout para evitar estados de carga indefinidos
      queryFn: async (queryFunction) => {
        // Usar un timeout para evitar que la consulta se quede colgada
        return Promise.race([
          queryFunction(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Crossword data fetch timeout')), 15000) // 15 segundos
          )
        ]);
      }
    }
  });
};

export const useSetCrossword = () => {
  const { address, isConnected } = useAccount();
  const contractConfig = getContractConfig('CrosswordBoard');

  const { data, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed', {
        description: 'Your crossword has been successfully saved on the blockchain.',
      });
    }
    if (isError) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError),
      });
    }
  }, [isSuccess, isError, txError]);

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
        },
        onSuccess: () => {
          toast.success('Crossword set successfully', {
            description: 'The crossword has been saved to the blockchain.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!error,
    txHash: data,
  };
};

export const useCompleteCrossword = () => {
  const contractConfig = getContractConfig('CrosswordBoard');
  const { data, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Crossword completed successfully', {
        description: 'Your crossword completion has been recorded on the blockchain.',
      });
    }
    if (isError) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError),
      });
    }
  }, [isSuccess, isError, txError]);

  return {
    completeCrossword: (args: [`0x${string}`, bigint]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'completeCrossword',
        args
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!error,
    txHash: data,
  };
};

export const useGetCrosswordCompletions = (crosswordId: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCrosswordCompletions',
    args: [crosswordId],
    query: { enabled: !!crosswordId },
  });
};

export const useUserCompletedCrossword = (crosswordId: `0x${string}`, user: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'userCompletedCrossword',
    args: [crosswordId, user],
    query: { enabled: !!crosswordId && !!user },
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
    query: { enabled: !!address },
  });

  // Check if user has admin role on CrosswordPrizes
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const prizesAdminResult = useContractRead({
    address: prizesContractConfig.address,
    abi: prizesContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!address },
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
    query: { enabled: !!address },
  });

  // Check if user has admin role on CrosswordPrizes
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const prizesAdminResult = useContractRead({
    address: prizesContractConfig.address,
    abi: prizesContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!address },
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
    query: { enabled: !!address && !!crosswordId },
  });
};

export const useClaimPrize = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed', {
        description: 'Your prize has been successfully claimed.',
      });
    }
    if (isError) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError),
      });
    }
  }, [isSuccess, isError, txError]);

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
        },
        onSuccess: () => {
          toast.success('Prize claimed successfully', {
            description: 'Your prize has been claimed.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!error,
    txHash: data,
  };
};

// Hook for creating crossword with prizes
export const useCreateCrossword = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed', {
        description: 'The crossword has been successfully created on the blockchain.',
      });
    }
    if (isError) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError),
      });
    }
  }, [isSuccess, isError, txError]);

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
        },
        onSuccess: () => {
          toast.success('Crossword created successfully', {
            description: 'The crossword with prizes has been created.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!error,
    txHash: data,
  };
};

// Hook for registering winners
export const useRegisterWinners = () => {
  const contractConfig = getContractConfig('CrosswordPrizes');
  const { data, error, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: data,
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed', {
        description: 'The winners have been successfully registered on the blockchain.',
      });
    }
    if (isError) {
      toast.error('Transaction failed', {
        description: getErrorMessage(txError),
      });
    }
  }, [isSuccess, isError, txError]);

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
        },
        onSuccess: () => {
          toast.success('Winners registered successfully', {
            description: 'The winners have been registered for the crossword.',
          });
        }
      }),
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!error,
    txHash: data,
  };
};