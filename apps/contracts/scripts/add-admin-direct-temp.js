const { createWalletClient, http, getContract, parseEther } = require('viem');
const { celoAlfajores } = require('viem/chains');
require('dotenv').config();

async function main() {
  // The wallet address to add as admin
  const walletToAdd = "0x66299C18c60CE709777Ec79C73b131cE2634f58e";

  // Get the contract address from environment or default
  const CROSSWORD_BOARD_ADDRESS = process.env.CROSSWORD_BOARD_ADDRESS || "0x6e15f23e7f410E250BD221cdB2FB43840354C908";
  
  // Get the contract owner's private key (default Hardhat account)
  const OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

  console.log("Managing admin access from owner wallet...");
  console.log("Adding wallet as admin:", walletToAdd);

  // Create a wallet client with the owner's private key
  const walletClient = createWalletClient({
    chain: celoAlfajores, // Using Alfajores as a placeholder, but we'll need to adjust
    transport: http(process.env.SEPOLIA_RPC_URL),
    account: OWNER_PRIVATE_KEY
  });

  console.log("Owner address:", walletClient.account.address);

  // For Celo Sepolia, we need to use a custom chain configuration
  // Since the viem/celo module might not have the exact chain info
  // Let me use the standard approach with hardhat instead

  console.log("This approach requires using hardhat for network connection.");
  console.log("Using the standard Hardhat approach with the owner's private key set temporarily...");
}

main();