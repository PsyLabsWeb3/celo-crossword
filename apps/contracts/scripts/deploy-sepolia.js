// Deployment script for Celo Sepolia
const hre = require("hardhat");

async function main() {
  console.log("Starting deployment to Celo Sepolia...");
  
  // Get the viem public client and wallet client
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  
  if (!deployer) {
    console.error("No deployer account available. Make sure you have set your PRIVATE_KEY in the .env file.");
    process.exit(1);
  }
  
  console.log("Deploying contracts with the account:", deployer.account.address);

  // Deploy CrosswordBoard
  console.log("\nDeploying CrosswordBoard...");
  const crosswordBoard = await hre.viem.deployContract("CrosswordBoard", [deployer.account.address]);
  console.log("CrosswordBoard deployed to:", crosswordBoard.address);

  // Deploy CrosswordPrizes
  console.log("\nDeploying CrosswordPrizes...");
  const crosswordPrizes = await hre.viem.deployContract("CrosswordPrizes", [deployer.account.address]);
  console.log("CrosswordPrizes deployed to:", crosswordPrizes.address);

  // Get contract ABIs from artifacts
  const crosswordBoardArtifact = await hre.artifacts.readArtifact("CrosswordBoard");
  const crosswordPrizesArtifact = await hre.artifacts.readArtifact("CrosswordPrizes");

  const crosswordBoardAbi = JSON.stringify(crosswordBoardArtifact.abi);
  const crosswordPrizesAbi = JSON.stringify(crosswordPrizesArtifact.abi);

  // For Sepolia, we'll log the addresses and ABIs for manual saving
  console.log("\n" + "=".repeat(50));
  console.log("DEPLOYMENT COMPLETED");
  console.log("=".repeat(50));
  console.log("CrosswordBoard Address:", crosswordBoard.address);
  console.log("CrosswordPrizes Address:", crosswordPrizes.address);
  console.log("\nCrosswordBoard ABI:");
  console.log(JSON.stringify(JSON.parse(crosswordBoardAbi), null, 2));
  console.log("\nCrosswordPrizes ABI:");
  console.log(JSON.stringify(JSON.parse(crosswordPrizesAbi), null, 2));
  
  // This would be saved to frontend in a real scenario
  console.log("\n" + "=".repeat(50));
  console.log("Next steps:");
  console.log("1. Save these addresses and ABIs to your frontend");
  console.log("2. Update your frontend contract configuration");
  console.log("3. Test on Sepolia network");
  console.log("=".repeat(50));

  // Verify contracts (optional, may need API key)
  try {
    console.log("\nAttempting to verify contracts...");
    await hre.run("verify:verify", {
      address: crosswordBoard.address,
      constructorArguments: [deployer.account.address],
    });
    console.log("CrosswordBoard verified successfully");
  } catch (error) {
    console.log("CrosswordBoard verification pending or failed (this is normal for new deployments):", error.message);
  }

  try {
    await hre.run("verify:verify", {
      address: crosswordPrizes.address,
      constructorArguments: [deployer.account.address],
    });
    console.log("CrosswordPrizes verified successfully");
  } catch (error) {
    console.log("CrosswordPrizes verification pending or failed (this is normal for new deployments):", error.message);
  }
  
  // Get contract ABIs from artifacts for saving to frontend
  const abiArtifacts = await hre.artifacts.readArtifact("CrosswordBoard");
  const prizesAbiArtifacts = await hre.artifacts.readArtifact("CrosswordPrizes");
  
  // Save contract addresses and ABIs to frontend
  console.log("\nSaving contract information to frontend...");
  try {
    // Dynamically require the save script
    const { saveSepoliaDeployment } = require('./save-sepolia-contracts.js');
    saveSepoliaDeployment(
      crosswordBoard.address,
      crosswordPrizes.address,
      abiArtifacts.abi,
      prizesAbiArtifacts.abi
    );
    console.log("✅ Contract addresses and ABIs saved to frontend successfully!");
  } catch (saveError) {
    console.error("⚠️  Error saving to frontend:", saveError.message);
    console.log("Please run the save script manually after deployment:");
    console.log(`node scripts/save-sepolia-contracts.js ${crosswordBoard.address} ${crosswordPrizes.address} [ABI_FILES_PATH]`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });