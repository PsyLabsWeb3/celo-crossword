import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useGetCurrentCrossword, useIsAdmin } from '../hooks/useContract';
import { useAccount } from 'wagmi';

interface CrosswordContextType {
  currentCrossword: {
    id: string;
    data: string;
    updatedAt: bigint;
  } | null;
  isLoading: boolean;
  isAdmin: boolean;
  refetchCrossword: () => void;
}

const CrosswordContext = createContext<CrosswordContextType | undefined>(undefined);

export const CrosswordProvider = ({ children }: { children: ReactNode }) => {
  const { address } = useAccount();
  const [currentCrossword, setCurrentCrossword] = useState<any>(null);
  
  const {
    data: crosswordData,
    isLoading,
    refetch: refetchCrosswordFromContract
  } = useGetCurrentCrossword();
  
  const { data: isAdminData } = useIsAdmin();

  // Update local state when contract data changes
  useEffect(() => {
    if (crosswordData && Array.isArray(crosswordData) && crosswordData.length >= 3) {
      const [id, data, updatedAt] = crosswordData as [string, string, bigint];
      setCurrentCrossword({
        id,
        data,
        updatedAt
      });
    } else if (crosswordData === null) {
      // Si no hay datos, asegurarse de que se limpie el estado
      setCurrentCrossword(null);
    }
  }, [crosswordData]);

  const refetchCrossword = async () => {
    const result = await refetchCrosswordFromContract();
    if (result.data && Array.isArray(result.data) && result.data.length >= 3) {
      const [id, data, updatedAt] = result.data as [string, string, bigint];
      setCurrentCrossword({
        id,
        data,
        updatedAt
      });
    }
  };

  // When wallet address changes, make sure to refetch admin status
  useEffect(() => {
    if (address) {
      // This will trigger the useIsAdmin hook to refetch
    }
  }, [address]);

  return (
    <CrosswordContext.Provider
      value={{
        currentCrossword,
        isLoading,
        isAdmin: !!isAdminData,
        refetchCrossword
      }}
    >
      {children}
    </CrosswordContext.Provider>
  );
};

export const useCrossword = () => {
  const context = useContext(CrosswordContext);
  if (context === undefined) {
    throw new Error('useCrossword must be used within a CrosswordProvider');
  }
  return context;
};