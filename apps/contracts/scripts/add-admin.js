// Script to manage admin access for CrosswordBoard contract
// Usage: Update the contract address and admin addresses as needed

const hre = require("hardhat");

async function main() {
  // The wallet address to add as admin
  const walletToAdd = "0x0c9Adb5b5483130F88F10DB4978772986B1E953B";
  
  // Deployer or existing admin wallet (must be run from an admin account)
  const [deployer] = await hre.viem.getWalletClients();
  
  if (!deployer) {
    console.error("No deployer account available. Make sure you have set your PRIVATE_KEY in the .env file.");
    process.exit(1);
  }
  
  console.log("Managing admin access from wallet:", deployer.account.address);
  
  // Note: The deployer (owner of the private key) will automatically be an admin
  // and can add other admin addresses like: 0x0c9Adb5b5483130F88F10DB4978772986B1E953B
  
  // Get the contract instance
  // You'll need to replace this with your actual deployed contract address
  const CONTRACT_ADDRESS = process.env.CROSSWORD_BOARD_ADDRESS || "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error("ERROR: Please set CROSSWORD_BOARD_ADDRESS environment variable with your deployed contract address");
    console.log("Usage: CROSSWORD_BOARD_ADDRESS=0x... npm run add-admin");
    return;
  }
  
  console.log("Contract address:", CONTRACT_ADDRESS);
  console.log("Adding wallet as admin:", walletToAdd);
  
  // Connect to the deployed contract
  const crosswordBoard = await hre.viem.getContractAt(
    "CrosswordBoard", 
    CONTRACT_ADDRESS
  );
  
  try {
    // Check if deployer is already an admin
    const isAdmin = await crosswordBoard.read.isAdminAddress([deployer.account.address]);
    console.log("Deployer is admin:", isAdmin);
    
    if (!isAdmin) {
      console.error("ERROR: Current wallet is not an admin. Cannot add new admins.");
      return;
    }
    
    console.log("Attempting to add admin...");
    
    // Add the wallet as admin
    const tx = await crosswordBoard.write.addAdmin([walletToAdd], {
      account: deployer.account,
    });
    
    console.log("Transaction submitted:", tx);
    
    // Wait for transaction to be mined
    const publicClient = await hre.viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: tx,
    });
    
    console.log("Transaction confirmed:", receipt.transactionHash);
    console.log("✅ Wallet successfully added as admin!");
    
    // Verify the admin was added
    const newAdminStatus = await crosswordBoard.read.isAdminAddress([walletToAdd]);
    console.log("Verification - New wallet is admin:", newAdminStatus);
    
  } catch (error) {
    console.error("Error adding admin:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });