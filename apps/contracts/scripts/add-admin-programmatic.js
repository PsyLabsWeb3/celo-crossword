// Script to add admin using programmatically defined wallet
// This avoids having to change the .env file
const hre = require("hardhat");
const { ethers } = require("ethers");

// The private key for the default Hardhat account (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
const OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const TARGET_ADMIN = "0x66299C18c60CE709777Ec79C73b131cE2634f58e";
const CONTRACT_ADDRESS = "0x6e15f23e7f410E250BD221cdB2FB43840354C908";

async function main() {
  console.log("Connecting to Celo Sepolia with owner wallet...");
  console.log("Target admin address:", TARGET_ADMIN);

  // Create provider for Celo Sepolia
  const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");

  // Create wallet with the owner's private key
  const wallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
  console.log("Owner address:", wallet.address);

  // Create contract instance
  const contractABI = [
    "function owner() view returns (address)",
    "function addAdmin(address newAdmin)",
    "function isAdmin(address addr) view returns (bool)",
    "function grantRole(bytes32 role, address account)",
    "function hasRole(bytes32 role, address account) view returns (bool)",
    "function ADMIN_ROLE() view returns (bytes32)",
    "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
    "function OPERATOR_ROLE() view returns (bytes32)"
  ];
  
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

  // Check current owner
  try {
    const currentOwner = await contract.owner();
    console.log("Current contract owner:", currentOwner);
    console.log("Our wallet matches owner:", currentOwner.toLowerCase() === wallet.address.toLowerCase());
  } catch (error) {
    console.error("Error getting owner:", error.message);
  }

  // Get role hashes
  let adminRole;
  try {
    adminRole = await contract.ADMIN_ROLE();
    console.log("ADMIN_ROLE hash:", adminRole);
  } catch (error) {
    console.error("Error getting ADMIN_ROLE:", error.message);
  }

  // Check if target address already has admin role
  let hasAdminRole = false;
  if (adminRole) {
    try {
      hasAdminRole = await contract.hasRole(adminRole, TARGET_ADMIN);
      console.log("Target already has ADMIN_ROLE:", hasAdminRole);
    } catch (error) {
      console.error("Error checking ADMIN_ROLE:", error.message);
    }
  }

  // If not an admin, grant the role
  if (!hasAdminRole) {
    console.log("Granting ADMIN_ROLE to target address...");
    try {
      const tx = await contract.grantRole(adminRole, TARGET_ADMIN);
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.hash);
      console.log("✅ ADMIN_ROLE granted successfully!");
    } catch (error) {
      console.error("Error granting ADMIN_ROLE:", error.message);
    }
  } else {
    console.log("Target already has ADMIN_ROLE, skipping...");
  }

  // Also add to legacy admin system if needed
  let isLegacyAdmin = false;
  try {
    isLegacyAdmin = await contract.isAdmin(TARGET_ADMIN);
    console.log("Target is legacy admin:", isLegacyAdmin);
  } catch (error) {
    console.error("Error checking legacy admin status:", error.message);
  }

  if (!isLegacyAdmin) {
    console.log("Adding to legacy admin system...");
    try {
      const tx = await contract.addAdmin(TARGET_ADMIN);
      console.log("Legacy admin transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("Legacy admin transaction confirmed:", receipt.hash);
      console.log("✅ Added to legacy admin system!");
    } catch (error) {
      console.error("Error adding to legacy admin system:", error.message);
      console.log("Note: This might be expected if using the new role-based system exclusively.");
    }
  } else {
    console.log("Target is already a legacy admin, skipping...");
  }

  console.log("\n✅ Admin addition process completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });