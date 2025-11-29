const { createPublicClient, http } = require('viem');
const { celoAlfajores } = require('wagmi/chains'); // O la red correcta

// Configura el cliente para conectarte a la red Celo
const client = createPublicClient({
  chain: {
    id: 44787, // Celo Alfajores
    name: 'Celo Alfajores',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://alfajores-forno.celo-testnet.org'] }
    }
  },
  transport: http()
});

// ABI simplificado para la función getUserProfile
const abi = [
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
  }
];

async function checkUserProfile() {
  const contractAddress = '0x85b6ab7fd25031faf32d61246de9339733061ba9';
  const userAddress = '0x66299C18c60CE709777Ec79C73b131cE2634f58e';

  try {
    console.log("Checking user profile for address:", userAddress);
    
    const result = await client.readContract({
      address: contractAddress,
      abi: abi,
      functionName: 'getUserProfile',
      args: [userAddress]
    });

    console.log("Farcaster profile found:");
    console.log("- Username:", result[0]);
    console.log("- DisplayName:", result[1]);
    console.log("- Profile Picture URL:", result[2]);
    console.log("- Timestamp:", result[3].toString());
  } catch (error) {
    console.error("Error checking user profile:", error);
  }
}

checkUserProfile();