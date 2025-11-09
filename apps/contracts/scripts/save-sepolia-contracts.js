// Script to save deployed contract addresses and ABIs to frontend
const fs = require("fs");
const path = require("path");

// Function to save contract information to frontend
function saveContractInfo(crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi) {
  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, "..", "web", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Create deployment info object
  const deploymentInfo = {
    network: "sepolia", // Could be "celoAlfajores" for testnet
    contracts: {
      CrosswordBoard: {
        address: crosswordBoardAddress,
        abi: crosswordBoardAbi,
      },
      CrosswordPrizes: {
        address: crosswordPrizesAddress,
        abi: crosswordPrizesAbi,
      },
    },
    deployer: "DEPLOYER_WALLET_ADDRESS",
    timestamp: new Date().toISOString(),
  };

  // Save deployment info
  const deploymentInfoPath = path.join(contractsDir, "sepolia-deployment.json");
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Deployment info saved to: ${deploymentInfoPath}`);

  // Also save individual ABIs for easier frontend use
  const crosswordBoardPath = path.join(contractsDir, "CrosswordBoard.json");
  const crosswordPrizesPath = path.join(contractsDir, "CrosswordPrizes.json");

  fs.writeFileSync(crosswordBoardPath, JSON.stringify({
    address: crosswordBoardAddress,
    abi: crosswordBoardAbi
  }, null, 2));

  fs.writeFileSync(crosswordPrizesPath, JSON.stringify({
    address: crosswordPrizesAddress,
    abi: crosswordPrizesAbi
  }, null, 2));

  console.log("✅ Contract files updated with Sepolia addresses:");
  console.log(`- ${crosswordBoardPath}`);
  console.log(`- ${crosswordPrizesPath}`);
  console.log(`- ${deploymentInfoPath}`);

  // Update the contracts.ts file to handle Sepolia addresses
  updateContractConfig(crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi);
}

// Function to update contracts.ts with Sepolia addresses
function updateContractConfig(crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi) {
  const contractsTsPath = path.join(__dirname, "..", "web", "src", "lib", "contracts.ts");
  
  // Read the current contracts.ts file
  let contractsContent = fs.readFileSync(contractsTsPath, 'utf8');
  
  // Check if Sepolia configuration already exists to avoid duplicates
  if (contractsContent.includes('// Sepolia network configuration')) {
    console.log("⚠️  Sepolia configuration already exists, skipping update to contracts.ts");
    return;
  }
  
  // Add Sepolia network configuration
  const sepoliaConfig = `\n// Sepolia network configuration
const SEPOLIA_CONTRACTS = {
  CrosswordBoard: {
    address: "${crosswordBoardAddress}",
    abi: ${JSON.stringify(crosswordBoardAbi, null, 2)},
  },
  CrosswordPrizes: {
    address: "${crosswordPrizesAddress}",
    abi: ${JSON.stringify(crosswordPrizesAbi, null, 2)},
  },
};`;

  // Append Sepolia configuration to the existing content
  const updatedContent = contractsContent + "\n" + sepoliaConfig;
  
  fs.writeFileSync(contractsTsPath, updatedContent);
  
  console.log("✅ Updated contracts.ts with Sepolia configuration");
}

// Example usage function (to be called after deployment)
function exampleUsage() {
  console.log("This script should be called after successful deployment with actual addresses and ABIs");
  
  // Example addresses (these would come from actual deployment)
  const exampleAddresses = {
    crosswordBoardAddress: "YOUR_CROSSWORD_BOARD_ADDRESS_HERE",
    crosswordPrizesAddress: "YOUR_CROSSWORD_PRIZES_ADDRESS_HERE"
  };
  
  // Example ABIs (these would come from actual deployment)
  const exampleAbis = {
    crosswordBoardAbi: [ /* YOUR CROSSWORD BOARD ABI HERE */ ],
    crosswordPrizesAbi: [ /* YOUR CROSSWORD PRIZES ABI HERE */ ]
  };
  
  console.log("After deployment:");
  console.log("- Update the addresses and ABIs in this script with actual values");
  console.log("- Then run this script to save them to the frontend");
}

// This function can be called with actual deployment results
function saveSepoliaDeployment(crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi) {
  if (!crosswordBoardAddress || !crosswordPrizesAddress || !crosswordBoardAbi || !crosswordPrizesAbi) {
    console.error("❌ Missing required deployment information");
    console.log("Please provide: crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi");
    return;
  }
  
  console.log("Saving Sepolia deployment information to frontend...");
  saveContractInfo(crosswordBoardAddress, crosswordPrizesAddress, crosswordBoardAbi, crosswordPrizesAbi);
  console.log("✅ Sepolia deployment information saved successfully!");
}

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    exampleUsage();
  } else if (args.length === 4) {
    // Expected args: boardAddress prizesAddress boardAbiFile prizesAbiFile
    const [boardAddress, prizesAddress, boardAbiFile, prizesAbiFile] = args;
    
    // Read ABI files
    const boardAbi = JSON.parse(fs.readFileSync(boardAbiFile, 'utf8'));
    const prizesAbi = JSON.parse(fs.readFileSync(prizesAbiFile, 'utf8'));
    
    saveSepoliaDeployment(boardAddress, prizesAddress, boardAbi, prizesAbi);
  } else {
    console.log("Usage: node save-sepolia-contracts.js <board_address> <prizes_address> <board_abi_file> <prizes_abi_file>");
    console.log("Example: node save-sepolia-contracts.js 0x123... 0x456... ./board-abi.json ./prizes-abi.json");
  }
}

module.exports = {
  saveContractInfo,
  saveSepoliaDeployment
};