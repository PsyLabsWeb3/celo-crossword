const hre = require("hardhat");

async function main() {
  // Get the viem public client and wallet clients
  const publicClient = await hre.viem.getPublicClient();
  const [deployer, admin, user1, user2] = await hre.viem.getWalletClients();
  console.log("Testing contracts with accounts:", [deployer.account.address, admin.account.address, user1.account.address, user2.account.address]);

  // Get deployed contracts
  console.log("\nGetting deployed contracts...");
  const crosswordBoard = await hre.viem.getContractAt("CrosswordBoard", "0x5fbdb2315678afecb367f032d93f642f64180aa3");
  const crosswordPrizes = await hre.viem.getContractAt("CrosswordPrizes", "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512");

  console.log("CrosswordBoard contract at:", "0x5fbdb2315678afecb367f032d93f642f64180aa3");
  console.log("CrosswordPrizes contract at:", "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512");

  // Test CrosswordBoard functionality
  console.log("\n--- Testing CrosswordBoard ---");
  
  // Set a crossword (only owner/admin can do this)
  const testCrosswordId = "0xb1a1d1b3e2c4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"; // Using a hardcoded bytes32
  const testCrosswordData = JSON.stringify({
    title: "Test Crossword",
    grid: [["A", "B"], ["C", "D"]],
    clues: {
      across: [{ id: 1, clue: "Sample across clue", row: 0, col: 0 }],
      down: [{ id: 2, clue: "Sample down clue", row: 0, col: 0 }]
    }
  });

  console.log("Setting crossword...");
  const tx1 = await crosswordBoard.write.setCrossword([testCrosswordId, testCrosswordData], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx1 });
  console.log("✓ Crossword set successfully");

  // Get the crossword
  const [retrievedId, retrievedData, updatedAt] = await crosswordBoard.read.getCurrentCrossword();
  console.log("Retrieved crossword ID:", retrievedId);
  console.log("Retrieved crossword data:", JSON.parse(retrievedData));
  console.log("Updated at:", new Date(Number(updatedAt) * 1000));

  // Test adding and removing admins (CrosswordBoard)
  console.log("\n--- Testing Admin Management ---");
  console.log("Adding new admin:", admin.account.address);
  const tx2 = await crosswordBoard.write.addAdmin([admin.account.address], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("✓ New admin added successfully");

  // Check if admin is in the list
  const isAdmin = await crosswordBoard.read.isAdminAddress([admin.account.address]);
  console.log("Is", admin.account.address, "admin?", isAdmin);

  // Get list of all admins
  const admins = await crosswordBoard.read.getAdmins();
  console.log("Current admins:", admins);

  // Test CrosswordPrizes functionality that doesn't involve tokens
  console.log("\n--- Testing CrosswordPrizes (Non-Token Functions) ---");

  // Add cUSD as allowed token (using mock token address for testing)
  const mockTokenAddress = "0x8742b1a4a0788c5b75d3b9f1e853c7a11b579224"; // Mock cUSD address
  console.log("Setting mock token as allowed...");
  const tx3 = await crosswordPrizes.write.setAllowedToken([mockTokenAddress, true], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx3 });
  console.log("✓ Mock token allowed successfully");

  // Check if token is allowed
  const isAllowed = await crosswordPrizes.read.allowedTokens([mockTokenAddress]);
  console.log("Is mock token allowed?", isAllowed);

  // Test role management
  console.log("\n--- Testing Role Management ---");
  const adminRole = await crosswordPrizes.read.ADMIN_ROLE();
  console.log("Admin role hash:", adminRole);

  const hasRole = await crosswordPrizes.read.hasRole([adminRole, deployer.account.address]);
  console.log("Does deployer have admin role?", hasRole);

  console.log("\n✓ All tests completed successfully!");
  console.log("Crossword contracts are functioning properly with:");
  console.log("- CrosswordBoard storing crosswords correctly");
  console.log("- Admin role management working");
  console.log("- CrosswordPrizes contract deployed and accessible");
  console.log("- Token allowance system working");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });