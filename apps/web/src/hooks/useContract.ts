import { useContractRead, useContractWrite, useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { LOCAL_CONTRACTS } from '../lib/contracts';
import { parseEther } from 'viem';

// CrosswordBoard contract hooks
export const useGetCurrentCrossword = () => {
  return useContractRead({
    address: LOCAL_CONTRACTS.CrosswordBoard.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordBoard.abi,
    functionName: 'getCurrentCrossword',
  });
};

export const useSetCrossword = () => {
  const { address, isConnected } = useAccount();
  
  const { data, writeContract, isError, isLoading } = useContractWrite({
    address: LOCAL_CONTRACTS.CrosswordBoard.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordBoard.abi,
    functionName: 'setCrossword',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data?.hash,
  });

  return {
    setCrossword: writeContract,
    isLoading: isLoading || isConfirming,
    isSuccess,
    isError,
    txHash: data?.hash,
  };
};

// Check if current account is admin
export const useIsAdmin = () => {
  const { address } = useAccount();
  
  return useContractRead({
    address: LOCAL_CONTRACTS.CrosswordBoard.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordBoard.abi,
    functionName: 'isAdminAddress',
    args: address ? [address as `0x${string}`] : undefined,
    enabled: !!address,
  });
};

// CrosswordPrizes contract hooks
export const useGetCrosswordDetails = (crosswordId: `0x${string}`) => {
  return useContractRead({
    address: LOCAL_CONTRACTS.CrosswordPrizes.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordPrizes.abi,
    functionName: 'getCrosswordDetails',
    args: [crosswordId],
  });
};

export const useIsWinner = (crosswordId: `0x${string}`) => {
  const { address } = useAccount();
  
  return useContractRead({
    address: LOCAL_CONTRACTS.CrosswordPrizes.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordPrizes.abi,
    functionName: 'isWinner',
    args: address && crosswordId ? [crosswordId, address as `0x${string}`] : undefined,
    enabled: !!address && !!crosswordId,
  });
};

export const useClaimPrize = () => {
  const { data, writeContract, isError, isLoading } = useContractWrite({
    address: LOCAL_CONTRACTS.CrosswordPrizes.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordPrizes.abi,
    functionName: 'claimPrize',
  });

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: data?.hash,
  });

  return {
    claimPrize: writeContract,
    isLoading: isLoading || isConfirming,
    isSuccess,
    isError,
    txHash: data?.hash,
  };
};

// Check if current account has admin role for CrosswordPrizes
export const useHasAdminRole = () => {
  const { address } = useAccount();

  return useContractRead({
    address: LOCAL_CONTRACTS.CrosswordPrizes.address as `0x${string}`,
    abi: LOCAL_CONTRACTS.CrosswordPrizes.abi,
    functionName: 'hasRole',
    args: address ? ['0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775', address as `0x${string}`] : undefined,
    enabled: !!address,
  });
};