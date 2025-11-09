// Script to update frontend with Sepolia contract addresses
// This script should be run after successful deployment to Sepolia
// Usage: Update the addresses and ABIs manually after deployment, then run this script

const fs = require("fs");
const path = require("path");

// Sepolia contract information (these will be filled after deployment)
const SEPOLIA_CONTRACTS = {
  CrosswordBoard: {
    address: "YOUR_CROSSWORD_BOARD_ADDRESS_HERE",  // Fill this after deployment
    abi: [] // Fill this after deployment
  },
  CrosswordPrizes: {
    address: "YOUR_CROSSWORD_PRIZES_ADDRESS_HERE", // Fill this after deployment
    abi: [] // Fill this after deployment
  }
};

// This would be the actual data after deployment
function updateFrontendContractConfig() {
  // Create contracts directory if it doesn't exist
  const contractsDir = path.join(__dirname, "..", "web", "contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Update the contracts.js file for Sepolia
  const sepoliaContractConfig = {
    network: "celoAlfajores", // Using Sepolia/testnet
    contracts: {
      CrosswordBoard: {
        address: SEPOLIA_CONTRACTS.CrosswordBoard.address,
        abi: SEPOLIA_CONTRACTS.CrosswordBoard.abi,
      },
      CrosswordPrizes: {
        address: SEPOLIA_CONTRACTS.CrosswordPrizes.address,
        abi: SEPOLIA_CONTRACTS.CrosswordPrizes.abi,
      },
    },
    deployer: "DEPLOYER_ADDRESS",
    timestamp: new Date().toISOString(),
  };

  // Save Sepolia config
  const sepoliaConfigPath = path.join(contractsDir, "sepolia-deployment.json");
  fs.writeFileSync(sepoliaConfigPath, JSON.stringify(sepoliaContractConfig, null, 2));
  console.log(`Sepolia deployment config saved to: ${sepoliaConfigPath}`);

  // Update the existing contracts to use Sepolia addresses
  const sepoliaBoardPath = path.join(contractsDir, "CrosswordBoard.json");
  fs.writeFileSync(sepoliaBoardPath, JSON.stringify({
    address: SEPOLIA_CONTRACTS.CrosswordBoard.address,
    abi: SEPOLIA_CONTRACTS.CrosswordBoard.abi
  }, null, 2));
  
  const sepoliaPrizesPath = path.join(contractsDir, "CrosswordPrizes.json");
  fs.writeFileSync(sepoliaPrizesPath, JSON.stringify({
    address: SEPOLIA_CONTRACTS.CrosswordPrizes.address,
    abi: SEPOLIA_CONTRACTS.CrosswordPrizes.abi
  }, null, 2));

  console.log("Frontend contract files updated with Sepolia addresses:");
  console.log(`- ${sepoliaBoardPath}`);
  console.log(`- ${sepoliaPrizesPath}`);
  console.log(`- ${sepoliaConfigPath}`);
  
  console.log("\nTo switch to Sepolia in your frontend:");
  console.log("1. Update the LOCAL_CONTRACTS in src/lib/contracts.ts to use Sepolia addresses");
  console.log("2. Or create a network detection system to use appropriate contracts");
  console.log("3. Make sure your .env contains proper Sepolia configuration");
}

// Update the contracts.ts file to work with Sepolia
function updateContractConfig() {
  // Read the current contracts.ts file
  const contractsTsPath = path.join(__dirname, "..", "web", "src", "lib", "contracts.ts");
  
  // For Sepolia, we need to modify the contract addresses in the existing file
  let contractsContent = fs.readFileSync(contractsTsPath, 'utf8');
  
  // Add Sepolia network configuration
  const sepoliaConfig = `
// Sepolia network configuration
const SEPOLIA_CONTRACTS = {
  CrosswordBoard: {
    address: "${SEPOLIA_CONTRACTS.CrosswordBoard.address}",
    abi: ${JSON.stringify(SEPOLIA_CONTRACTS.CrosswordBoard.abi, null, 2)},
  },
  CrosswordPrizes: {
    address: "${SEPOLIA_CONTRACTS.CrosswordPrizes.address}",
    abi: ${JSON.stringify(SEPOLIA_CONTRACTS.CrosswordPrizes.abi, null, 2)},
  },
};
`;
  
  // Append Sepolia configuration to the existing content
  fs.writeFileSync(contractsTsPath, contractsContent + "\n" + sepoliaConfig);
  
  console.log("Updated contracts.ts with Sepolia configuration");
}

// Main function
function main() {
  console.log("Updating frontend to use Sepolia contracts...");
  updateFrontendContractConfig();
  console.log("\nFrontend updated successfully!");
  console.log("\nRemember to:");
  console.log("1. Deploy contracts to Sepolia first");
  console.log("2. Update this script with actual addresses and ABIs");
  console.log("3. Run this script to update frontend configuration");
}

// If running this file directly
if (require.main === module) {
  main();
}

module.exports = {
  updateFrontendContractConfig,
  updateContractConfig
};