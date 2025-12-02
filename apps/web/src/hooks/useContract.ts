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

// Load the ABI dynamically from the contract artifact
const getContractABI = async (contractName: 'CrosswordBoard') => {
  try {
    // Dynamically import the ABI based on contract name
    if (contractName === 'CrosswordBoard') {
      // In a real scenario, you'd import the ABI from the artifacts
      // For now, we'll return an empty array and load it dynamically at runtime
      // This is where the actual ABI would be loaded
      const response = await fetch(`/api/contract-abi?contract=${contractName}`); // This calls our endpoint that serves the ABI
      if (response.ok) {
        return await response.json();
      }
    }
    return [];
  } catch (error) {
    console.error("Error loading ABI dynamically", error);
    return [];
  }
};

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
const getContractConfig = (contractName: 'CrosswordBoard'): { address: `0x${string}`, abi: any } => {
  if (typeof window === 'undefined') {
    // We are on the server, return a dummy config to prevent crash
    return { address: '0x0000000000000000000000000000000000000000', abi: [] };
  }
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

  // For this implementation, we'll return a simple ABI that includes the essential functions
  // The real ABI can be loaded from the artifacts or import
  const abi = getCrosswordBoardABI();

  // Ensure the address is properly typed as a hex string
  const typedAddress = (contract.address.startsWith('0x') ? contract.address : '0x0000000000000000000000000000000000000000') as `0x${string}`;

  return {
    address: typedAddress,
    abi: abi,
  };
};

// Helper function to get the CrosswordBoard ABI
// In a real implementation, this would import from the artifacts
function getCrosswordBoardABI() {
  // This would normally be imported from the artifacts
  // For now, return an empty array and the actual ABI would be loaded at build time
  return [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "initialOwner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "AccessControlBadConfirmation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "neededRole",
          "type": "bytes32"
        }
      ],
      "name": "AccessControlUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "EnforcedPause",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ExpectedPause",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        }
      ],
      "name": "SafeERC20FailedOperation",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "addedBy",
          "type": "address"
        }
      ],
      "name": "AdminAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "removedBy",
          "type": "address"
        }
      ],
      "name": "AdminRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "value",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "setter",
          "type": "address"
        }
      ],
      "name": "ConfigBoolSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "value",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "setter",
          "type": "address"
        }
      ],
      "name": "ConfigSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "setter",
          "type": "address"
        }
      ],
      "name": "ConfigUIntSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "activationTime",
          "type": "uint256"
        }
      ],
      "name": "CrosswordActivated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "durationMs",
          "type": "uint256"
        }
      ],
      "name": "CrosswordCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "prizePool",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "creator",
          "type": "address"
        }
      ],
      "name": "CrosswordCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "updatedBy",
          "type": "address"
        }
      ],
      "name": "CrosswordUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "NativeCeloReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "winner",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "rank",
          "type": "uint256"
        }
      ],
      "name": "PrizeDistributed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "name": "TokenAllowed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "recoveredBy",
          "type": "address"
        }
      ],
      "name": "UnclaimedPrizesRecovered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "stateMutability": "payable",
      "type": "fallback"
    },
    {
      "inputs": [],
      "name": "ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "HOME_BUTTON_VISIBLE",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_CONFIGURABLE_WINNERS",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_END_TIME",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_PERCENTAGE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_SINGLE_WINNER_PERCENTAGE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "MAX_WINNERS_CONFIG",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "OPERATOR_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "RECOVERY_WINDOW",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "activateCrossword",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newAdmin",
          "type": "address"
        }
      ],
      "name": "addAdmin",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "admins",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "allowedTokens",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "claimPrize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "durationMs",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "displayName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "pfpUrl",
          "type": "string"
        }
      ],
      "name": "completeCrossword",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "prizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "winnerPercentages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        }
      ],
      "name": "createCrossword",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "prizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "winnerPercentages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        }
      ],
      "name": "createCrosswordWithNativeCELO",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "newMaxWinners",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "prizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "winnerPercentages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        }
      ],
      "name": "createCrosswordWithNativeCELOPrizePool",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "newMaxWinners",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "prizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "winnerPercentages",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        }
      ],
      "name": "createCrosswordWithPrizePool",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "crosswordCompletions",
      "outputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "completionTimestamp",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "durationMs",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "crosswords",
      "outputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "totalPrizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "activationTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "enum CrosswordBoard.CrosswordState",
          "name": "state",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "createdAt",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "claimedAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "currentCrosswordData",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "currentCrosswordId",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "emergencyClearCrossword",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAdmins",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        }
      ],
      "name": "getBoolConfig",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "defaultValue",
          "type": "bool"
        }
      ],
      "name": "getBoolConfigWithDefault",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "getCompletionsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "getCompletionsCountPrizes",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "getCrosswordCompletions",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "completionTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "durationMs",
              "type": "uint256"
            }
          ],
          "internalType": "struct CrosswordBoard.CrosswordCompletion[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "getCrosswordDetails",
      "outputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "totalPrizePool",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "winnerPercentages",
          "type": "uint256[]"
        },
        {
          "components": [
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "rank",
              "type": "uint256"
            }
          ],
          "internalType": "struct CrosswordBoard.CompletionRecord[]",
          "name": "completions",
          "type": "tuple[]"
        },
        {
          "internalType": "uint256",
          "name": "activationTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "enum CrosswordBoard.CrosswordState",
          "name": "state",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCurrentCrossword",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "updatedAt",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMaxWinners",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMaxWinnersConfig",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        }
      ],
      "name": "getStringConfig",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        }
      ],
      "name": "getUIntConfig",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "defaultValue",
          "type": "uint256"
        }
      ],
      "name": "getUIntConfigWithDefault",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserProfile",
      "outputs": [
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "displayName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "pfpUrl",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserRank",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "hasCompletedCrossword",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isAdmin",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        }
      ],
      "name": "isAdminAddress",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isReturnHomeButtonVisible",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "isWinner",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lastUpdateTime",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxWinners",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "recordCompletion",
      "outputs": [
        {
          "internalType": "bool",
          "name": "awardedPrize",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        }
      ],
      "name": "recoverUnclaimedPrizes",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "adminToRemove",
          "type": "address"
        }
      ],
      "name": "removeAdmin",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "callerConfirmation",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "name": "setAllowedToken",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "value",
          "type": "bool"
        }
      ],
      "name": "setBoolConfig",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        }
      ],
      "name": "setCrossword",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "string",
          "name": "crosswordData",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "newMaxWinners",
          "type": "uint256"
        }
      ],
      "name": "setCrosswordAndMaxWinners",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "setDefaultConfigurations",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newMaxWinners",
          "type": "uint256"
        }
      ],
      "name": "setMaxWinners",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "newMaxWinners",
          "type": "uint256"
        }
      ],
      "name": "setMaxWinnersConfig",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "value",
          "type": "string"
        }
      ],
      "name": "setStringConfig",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "key",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "setUIntConfig",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "crosswordId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "userCompletedCrossword",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "userProfiles",
      "outputs": [
        {
          "internalType": "string",
          "name": "username",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "displayName",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "pfpUrl",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]; // This is the complete ABI needed for admin checks
}

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
    completeCrossword: (args: [bigint, string, string, string]) =>
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

// Hook para verificar si un usuario es ganador de un crucigrama específico

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

// Hook para verificar si un usuario es ganador de un crucigrama específico

// Check if current account is admin
export const useIsAdmin = () => {
  const { address } = useAccount();
  const boardContractConfig = getContractConfig('CrosswordBoard');

  // Check if user has admin role on CrosswordBoard
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
  const boardAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
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

  // Check if user has DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const defaultAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,
      gcTime: 600000,
      retry: 1,
      retryDelay: 5000,
    },
  });

  // Check if user is the contract owner
  const ownerResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'owner',
    query: {
      enabled: !!address,
      staleTime: 300000,
      gcTime: 600000,
      retry: 1,
      retryDelay: 5000,
    },
  });

  // Also check for legacy admin status (isAdmin mapping)
  const legacyAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'isAdminAddress',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address,
      staleTime: 300000,
      gcTime: 600000,
      retry: 1,
      retryDelay: 5000,
    },
  });

  // User is admin if they have any of: admin role, default admin role, owner status, or legacy admin status
  const isAdmin = address && (
    (boardAdminResult.data === true) ||
    (defaultAdminResult.data === true) ||
    (ownerResult.data && (ownerResult.data as string).toLowerCase() === address.toLowerCase()) ||
    (legacyAdminResult.data === true)
  );

  // Return a combined result with the same interface as useContractRead
  return {
    data: isAdmin,
    isLoading: boardAdminResult.isLoading || defaultAdminResult.isLoading || ownerResult.isLoading || legacyAdminResult.isLoading,
    isError: boardAdminResult.isError || defaultAdminResult.isError || ownerResult.isError || legacyAdminResult.isError,
    error: boardAdminResult.error || defaultAdminResult.error || ownerResult.error || legacyAdminResult.error,
    isSuccess: boardAdminResult.isSuccess || defaultAdminResult.isSuccess || ownerResult.isSuccess || legacyAdminResult.isSuccess,
    isFetched: boardAdminResult.isFetched || defaultAdminResult.isFetched || ownerResult.isFetched || legacyAdminResult.isFetched,
    refetch: () => {
      boardAdminResult.refetch();
      defaultAdminResult.refetch();
      ownerResult.refetch();
      legacyAdminResult.refetch();
    }
  };
};

// Additional debugging hook for admin status
export const useAdminStatus = () => {
  const { address } = useAccount();
  const boardContractConfig = getContractConfig('CrosswordBoard');

  // Check if user has admin role on CrosswordBoard (for prizes and admin functions)
  const ADMIN_ROLE = '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'; // ADMIN_ROLE from contract
  const boardAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
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

  // Check if user has DEFAULT_ADMIN_ROLE (highest level admin)
  const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const defaultAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'hasRole',
    args: address ? [DEFAULT_ADMIN_ROLE, address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  // Check legacy admin status
  const legacyAdminResult = useContractRead({
    address: boardContractConfig.address,
    abi: boardContractConfig.abi,
    functionName: 'isAdminAddress',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  return {
    boardAdmin: boardAdminResult,
    defaultAdmin: defaultAdminResult,
    legacyAdmin: legacyAdminResult,
    isBoardAdmin: boardAdminResult.data === true,
    isDefaultAdmin: defaultAdminResult.data === true,
    isLegacyAdmin: legacyAdminResult.data === true,
    isPrizesAdmin: boardAdminResult.data === true, // ADMIN_ROLE has prizes functionality
    isLoading: boardAdminResult.isLoading || defaultAdminResult.isLoading || legacyAdminResult.isLoading,
    allResults: {
      boardAdmin: boardAdminResult.data,
      defaultAdmin: defaultAdminResult.data,
      legacyAdmin: legacyAdminResult.data,
      prizesAdmin: boardAdminResult.data, // Add prizesAdmin to allResults
    }
  };
};

// CrosswordBoard contract hooks for prize functionality
export const useGetCrosswordDetails = (crosswordId: `0x${string}`) => {
  const contractConfig = getContractConfig('CrosswordBoard');

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

// Hook para verificar si un usuario es ganador de un crucigrama específico

export const useIsWinner = (crosswordId: `0x${string}`) => {
  const { address } = useAccount();
  const contractConfig = getContractConfig('CrosswordBoard');

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

// Hook para verificar si un usuario es ganador de un crucigrama específico

export const useClaimPrize = () => {
  const contractConfig = getContractConfig('CrosswordBoard');
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
  const contractConfig = getContractConfig('CrosswordBoard');
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
      staleTime: 60000,   // Cache for 1 minute (reduced from 2 minutes)
      gcTime: 120000,     // Garbage collect after 2 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
      refetchOnWindowFocus: false, // Don't refetch automatically on window focus
      refetchOnReconnect: false,   // Don't refetch automatically on reconnect
    },
  });
};

// Hook para verificar si un usuario es ganador de un crucigrama específico

// Hook for activating crossword
export const useActivateCrossword = () => {
  const contractConfig = getContractConfig('CrosswordBoard');
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
        description: 'The crossword has been successfully activated for solving.',
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
    activateCrossword: (args: [`0x${string}`]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'activateCrossword',
        args
      }, {
        onError: (error) => {
          toast.error('Error activating crossword', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: () => {
          toast.success('Crossword activated successfully', {
            description: 'The crossword has been activated for users to solve.',
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

// Config contract hooks - now using unified CrosswordBoard contract
export const useGetMaxWinnersConfig = () => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getMaxWinnersConfig',
    query: {
      staleTime: 60000,  // Cache for 1 minute
      gcTime: 120000,    // Garbage collect after 2 minutes
      retry: 1,          // Only retry once
      retryDelay: 5000,  // Wait 5 seconds between retries
    },
  });
};

// Hook para verificar si un usuario es ganador de un crucigrama específico

// Hook for setting configuration values
export const useSetConfig = () => {
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
      toast.success('Configuration updated', {
        description: 'The configuration has been successfully updated on the blockchain.',
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error('Configuration update failed', {
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
    setMaxWinnersConfig: (args: [bigint]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: 'setMaxWinnersConfig',
        args
      }, {
        onError: (error) => {
          toast.error('Error updating max winners config', {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: () => {
          toast.success('Max winners configuration updated', {
            description: 'Your max winners configuration change is being processed on the blockchain.',
          });
          // Invalidate the max winners config query to refresh data
          queryClient.invalidateQueries({
            queryKey: ['readContract', {
              address: contractConfig.address,
              functionName: 'getMaxWinnersConfig'
            }]
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

// Hook for setting both crossword and max winners in a single transaction
export const useSetCrosswordAndMaxWinners = () => {
  const { address, isConnected } = useAccount();
  const contractConfig = getContractConfig("CrosswordBoard");
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
      toast.success("Transaction confirmed", {
        description: "Both crossword and max winners configuration have been successfully saved on the blockchain.",
      });
      // Invalidar directamente la consulta para forzar una actualización inmediata
      queryClient.invalidateQueries({
        queryKey: ["readContract", {
          address: contractConfig.address,
          functionName: "getCurrentCrossword"
        }]
      });
      // Also invalidate the max winners config query
      queryClient.invalidateQueries({
        queryKey: ["readContract", {
          address: contractConfig.address,
          functionName: "getMaxWinnersConfig"
        }]
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      toast.error("Transaction failed", {
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
    setCrosswordAndMaxWinners: (args: [`0x${string}`, string, bigint]) =>
      writeContract({
        address: contractConfig.address,
        abi: contractConfig.abi,
        functionName: "setCrosswordAndMaxWinners",
        args
      }, {
        onError: (error) => {
          toast.error("Error setting crossword and max winners", {
            description: getErrorMessage(error),
          });
          // Mark error as shown in case error occurs during writeContract
          errorShown.current = true;
        },
        onSuccess: (hash) => {
          toast.success("Crossword and max winners set successfully", {
            description: "Both crossword and max winners configuration have been saved to the blockchain.",
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

// Hook for creating crossword with prize pool
export const useCreateCrosswordWithPrizePool = () => {
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
        description: 'The crossword with prize pool has been successfully created on the blockchain.',
      });
      // Invalidate relevant queries to refresh data
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
    createCrosswordWithPrizePool: async (args: [`0x${string}`, string, bigint, `0x${string}`, bigint, bigint[], bigint], value?: bigint) => {
      try {
        const txConfig: any = {
          address: contractConfig.address,
          abi: contractConfig.abi,
          functionName: 'createCrosswordWithPrizePool',
          args,
          ...(value && value > 0n ? { value } : {}),
        };

        // Add gas limit for ERC20 operations
        txConfig.gas = 800000n; // Higher gas limit for complex operations with token transfers

        return writeContract(txConfig, {
          onError: (error) => {
            console.error('Error in createCrosswordWithPrizePool:', error);
            toast.error('Error creating crossword with prize pool', {
              description: getErrorMessage(error),
            });
            // Mark error as shown in case error occurs during writeContract
            errorShown.current = true;
          },
          onSuccess: (hash) => {
            toast.success('Crossword with prize pool created successfully', {
              description: 'The crossword and prize pool have been created.',
            });
          }
        });
      } catch (error) {
        console.error('Transaction simulation failed:', error);
        toast.error('Transaction simulation failed', {
          description: getErrorMessage(error),
        });
        errorShown.current = true;
        throw error;
      }
    },
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
    contractAddress: contractConfig.address, // Add contract address for cache invalidation
  };
};// Hook for creating crossword with native CELO prize pool
export const useCreateCrosswordWithNativeCELOPrizePool = () => {
  const { address, isConnected } = useAccount();
  const contractConfig = getContractConfig('CrosswordBoard');
  const queryClient = useQueryClient();

  const { data, error: writeError, isPending, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: isTxError, error: txError, refetch } = useWaitForTransactionReceipt({
    hash: data,
  });

  // Track if we've already shown the success/error toasts to prevent duplicates
  const successShown = useRef(false);
  const errorShown = useRef(false);

  useEffect(() => {
    if (isSuccess && !successShown.current) {
      toast.success('Transaction confirmed', {
        description: 'The crossword with native CELO prize pool has been successfully created on the blockchain.',
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({
        queryKey: ['readContract', {
          address: contractConfig.address,
          functionName: 'getCurrentCrossword'
        }]
      });
      successShown.current = true;
    }
    if ((isTxError || writeError) && !errorShown.current) {
      console.error('Transaction failed:', txError || writeError);
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
    createCrosswordWithNativeCELOPrizePool: async (args: [`0x${string}`, string, bigint, bigint, bigint[], bigint], value: bigint) => {

      try {
        // Prepare transaction configuration with proper gas estimation
        const txConfig: any = {
          address: contractConfig.address,
          abi: contractConfig.abi,
          functionName: 'createCrosswordWithNativeCELOPrizePool',
          args,
          value,
        };

        // Add gas limit to ensure sufficient gas for native CELO transfer
        txConfig.gas = 1000000n; // Set higher gas limit for complex operations with native token transfer

        return writeContract(txConfig, {
          onError: (error) => {
            console.error('Error in createCrosswordWithNativeCELOPrizePool:', error);
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              shortMessage: (error as any)?.shortMessage || error.message,
              metaMessages: (error as any)?.metaMessages,
              cause: (error as any)?.cause,
              code: (error as any)?.code,
              reason: (error as any)?.reason
            });

            toast.error('Error creating crossword with native CELO prize pool', {
              description: getErrorMessage(error),
            });
            // Mark error as shown in case error occurs during writeContract
            errorShown.current = true;
          },
          onSuccess: (hash) => {
            // Wait for confirmation before showing success
            toast.success('Transaction submitted', {
              description: 'Your crossword creation is being processed on the blockchain.',
            });
          }
        });
      } catch (simulationError) {
        console.error('Transaction simulation failed:', simulationError);
        toast.error('Transaction simulation failed', {
          description: getErrorMessage(simulationError),
        });
        errorShown.current = true;
        throw simulationError;
      }
    },
    isLoading: isPending || isConfirming,
    isSuccess,
    isError: !!writeError || isTxError,
    error: writeError || txError,
    txHash: data,
    contractAddress: contractConfig.address, // Add contract address for cache invalidation
    refetch, // Expose refetch function to manually check transaction status
  };
};

// Define the type for crossword details
type CrosswordDetails = [
  string,                    // token (index 0)
  bigint,                    // totalPrizePool (index 1)
  bigint[],                  // winnerPercentages (index 2)
  {                          // completions (index 3)
    user: string;
    timestamp: bigint;
    rank: bigint;
  }[],
  bigint,                    // activationTime (index 4)
  bigint,                    // endTime (index 5)
  number                     // state (index 6)
] & {
  token: string;
  totalPrizePool: bigint;
  winnerPercentages: bigint[];
  completions: {
    user: string;
    timestamp: bigint;
    rank: bigint;
  }[];
  activationTime: bigint;
  endTime: bigint;
  state: number;
};

// Hook for getting crossword prizes details
export const useCrosswordPrizesDetails = (crosswordId: `0x${string}` | undefined) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'getCrosswordDetails',
    args: crosswordId ? [crosswordId] : undefined,
    query: {
      enabled: !!crosswordId,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  }) as {
    data?: CrosswordDetails;
    isLoading: boolean;
    isError: boolean;
    error?: Error;
    isSuccess: boolean;
    refetch: () => void;
  };
};

// Hook para verificar si un usuario ya completó un crucigrama específico
export const useHasCompletedCrossword = (crosswordId: `0x${string}` | undefined, userAddress: `0x${string}` | undefined) => {
  const contractConfig = getContractConfig('CrosswordBoard');

  return useContractRead({
    address: contractConfig.address,
    abi: contractConfig.abi,
    functionName: 'hasCompletedCrossword',
    args: crosswordId && userAddress ? [crosswordId, userAddress] : undefined,
    query: {
      enabled: !!crosswordId && !!userAddress,
      staleTime: 120000,  // Cache for 2 minutes
      gcTime: 300000,     // Garbage collect after 5 minutes
      retry: 1,           // Only retry once
      retryDelay: 5000,   // Wait 5 seconds between retries
    },
  });
};

// Hook para verificar si un usuario es ganador de un crucigrama específico
