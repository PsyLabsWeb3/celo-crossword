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

  // Test CrosswordPrizes functionality
  console.log("\n--- Testing CrosswordPrizes ---");

  // Add cUSD as allowed token (using mock token address for testing)
  const mockTokenAddress = "0x8742b1a4a0788c5b75d3b9f1e853c7a11b579224"; // Mock cUSD address
  console.log("Setting mock token as allowed...");
  const tx2 = await crosswordPrizes.write.setAllowedToken([mockTokenAddress, true], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx2 });
  console.log("✓ Mock token allowed successfully");

  // Create a crossword with prize pool
  const prizeCrosswordId = "0xc2b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2"; // Using another hardcoded bytes32
  const prizePool = 100000000000000000000n; // 100 tokens (using BigInt directly)
  const winnerPercentages = [6000n, 4000n]; // 60% and 40%

  console.log("Creating crossword with prizes...");
  const tx3 = await crosswordPrizes.write.createCrossword([
    prizeCrosswordId,
    mockTokenAddress,
    prizePool,
    winnerPercentages,
    0n // no deadline
  ], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx3 });
  console.log("✓ Crossword with prizes created successfully");

  // Activate the crossword
  console.log("Activating crossword...");
  const tx4 = await crosswordPrizes.write.activateCrossword([prizeCrosswordId], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx4 });
  console.log("✓ Crossword activated successfully");

  // Register winners
  console.log("Registering winners...");
  const tx5 = await crosswordPrizes.write.registerWinners([prizeCrosswordId, [user1.account.address, user2.account.address]], {
    account: deployer.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: tx5 });
  console.log("✓ Winners registered successfully");

  // Check crossword details
  const details = await crosswordPrizes.read.getCrosswordDetails([prizeCrosswordId]);
  console.log("Crossword details:");
  console.log("- Token:", details[0]);
  console.log("- Prize Pool:", Number(details[1]));
  console.log("- Winner Percentages:", details[2]);
  console.log("- Winners:", details[3]);
  console.log("- State:", Number(details[6]));

  console.log("\n✓ All tests passed! Contracts are working correctly.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });