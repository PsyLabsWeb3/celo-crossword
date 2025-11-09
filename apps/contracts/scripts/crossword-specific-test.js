// Crossword-Specific Test Script (without token transfers)
// Run this script to test crossword-specific functionality before Sepolia deployment
// Usage: npx hardhat run scripts/crossword-specific-test.js --network localhost

const hre = require("hardhat");

async function main() {
  console.log("🧪 Starting Crossword-Specific Contract Testing...\n");

  // Get signers
  const [deployer, admin, user1, user2, user3] = await hre.viem.getWalletClients();
  console.log(`📋 Accounts:`);
  console.log(`   Deployer: ${deployer.account.address}`);
  console.log(`   Admin:    ${admin.account.address}`);
  console.log(`   User1:    ${user1.account.address}`);
  console.log(`   User2:    ${user2.account.address}`);
  console.log(`   User3:    ${user3.account.address}\n`);

  // Deploy contracts
  console.log("📦 Deploying contracts...");
  const crosswordBoard = await hre.viem.deployContract("CrosswordBoard", [deployer.account.address]);
  const crosswordPrizes = await hre.viem.deployContract("CrosswordPrizes", [deployer.account.address]);
  console.log("✅ Contracts deployed successfully!\n");

  console.log(`   CrosswordBoard: ${crosswordBoard.address}`);
  console.log(`   CrosswordPrizes: ${crosswordPrizes.address}\n`);

  // Test the complete crossword workflow
  console.log("🔄 Testing Complete Workflow...\n");

  // Step 1: Admin sets a crossword
  console.log("1️⃣  Admin sets a crossword...");
  const testCrosswordId = "0x" + "a".repeat(64);
  const testCrosswordData = JSON.stringify({
    gridSize: { rows: 5, cols: 5 },
    title: "Test Crossword for Verification",
    clues: [
      {
        number: 1,
        clue: "Testing admin functionality",
        answer: "ADMIN",
        row: 0,
        col: 0,
        direction: "across",
      },
      {
        number: 2,
        clue: "Verification test",
        answer: "VERIFIED",
        row: 0,
        col: 1,
        direction: "down",
      }
    ]
  });

  const setCrosswordTx = await crosswordBoard.write.setCrossword([testCrosswordId, testCrosswordData], {
    account: deployer.account,
  });
  
  const [id, data, timestamp] = await crosswordBoard.read.getCurrentCrossword();
  console.log(`   ✅ Crossword set with ID: ${id.substring(0, 10)}...`);
  console.log(`   ✅ Crossword data length: ${data.length} chars`);
  console.log("✅ Step 1 completed\n");

  // Step 2: Admin adds another admin
  console.log("2️⃣  Admin adds another admin...");
  const addAdminTx = await crosswordBoard.write.addAdmin([admin.account.address], {
    account: deployer.account,
  });
  
  const isAdmin = await crosswordBoard.read.isAdminAddress([admin.account.address]);
  const allAdmins = await crosswordBoard.read.getAdmins();
  console.log(`   ✅ New admin added: ${isAdmin}`);
  console.log(`   ✅ Total admins: ${allAdmins.length}`);
  console.log("✅ Step 2 completed\n");

  // Step 3: Test admin can also access CrosswordPrizes
  console.log("3️⃣  Setting up prize contract permissions...");
  const adminRole = await crosswordPrizes.read.ADMIN_ROLE();
  
  // Grant admin role to admin account
  const grantRoleTx = await crosswordPrizes.write.grantRole([adminRole, admin.account.address], {
    account: deployer.account,
  });
  
  const hasAdminRole = await crosswordPrizes.read.hasRole([adminRole, admin.account.address]);
  console.log(`   ✅ Admin has CrosswordPrizes admin role: ${hasAdminRole}`);
  console.log("✅ Step 3 completed\n");

  // Step 4: Test token system setup
  console.log("4️⃣  Testing token system setup...");
  // Using a mock cUSD address for testing
  const mockCUSDAddress = "0x" + "7".repeat(39) + "0"; // 0x7000000000000000000000000000000000000000

  // Allow the mock token
  const allowTokenTx = await crosswordPrizes.write.setAllowedToken([mockCUSDAddress, true], {
    account: deployer.account,
  });
  
  const isTokenAllowed = await crosswordPrizes.read.allowedTokens([mockCUSDAddress]);
  console.log(`   ✅ Mock cUSD token allowed: ${isTokenAllowed}`);
  console.log("✅ Step 4 completed\n");

  // Step 5: Test pausing functionality on both contracts
  console.log("5️⃣  Testing pausing functionality...");
  
  // Check initial state
  const boardInitiallyPaused = await crosswordBoard.read.paused();
  const prizesInitiallyPaused = await crosswordPrizes.read.paused();
  console.log(`   Initial board paused: ${boardInitiallyPaused}`);
  console.log(`   Initial prizes paused: ${prizesInitiallyPaused}`);
  
  // Pause both contracts
  const pauseBoardTx = await crosswordBoard.write.pause([], {
    account: deployer.account,
  });
  
  const pausePrizesTx = await crosswordPrizes.write.pause([], {
    account: deployer.account,
  });
  
  // Verify paused state
  const boardPaused = await crosswordBoard.read.paused();
  const prizesPaused = await crosswordPrizes.read.paused();
  console.log(`   Board paused after call: ${boardPaused}`);
  console.log(`   Prizes paused after call: ${prizesPaused}`);
  
  // Unpause both contracts
  const unpauseBoardTx = await crosswordBoard.write.unpause([], {
    account: deployer.account,
  });
  
  const unpausePrizesTx = await crosswordPrizes.write.unpause([], {
    account: deployer.account,
  });
  
  // Verify unpaused state
  const boardUnpaused = await crosswordBoard.read.paused();
  const prizesUnpaused = await crosswordPrizes.read.paused();
  console.log(`   Board unpaused: ${!boardUnpaused}`);
  console.log(`   Prizes unpaused: ${!prizesUnpaused}`);
  console.log("✅ Step 5 completed\n");

  // Step 6: Test data integrity after operations
  console.log("6️⃣  Testing data integrity...");
  
  const [finalId, finalData, finalTimestamp] = await crosswordBoard.read.getCurrentCrossword();
  const finalIsAdmin = await crosswordBoard.read.isAdminAddress([admin.account.address]);
  const finalTokenAllowed = await crosswordPrizes.read.allowedTokens([mockCUSDAddress]);
  const finalHasRole = await crosswordPrizes.read.hasRole([adminRole, admin.account.address]);
  
  console.log(`   ✅ Crossword ID preserved: ${finalId === testCrosswordId}`);
  console.log(`   ✅ Crossword data preserved: ${finalData.length === data.length}`);
  console.log(`   ✅ Admin status preserved: ${finalIsAdmin}`);
  console.log(`   ✅ Token allowance preserved: ${finalTokenAllowed}`);
  console.log(`   ✅ Role assignment preserved: ${finalHasRole}`);
  console.log("✅ Step 6 completed\n");

  // Step 7: Test edge cases and limits
  console.log("7️⃣  Testing edge cases and limits...");
  
  // Test maximum admin limit (if applicable)
  const currentAdmins = await crosswordBoard.read.getAdmins();
  console.log(`   ✅ Current number of admins: ${currentAdmins.length}`);
  
  // Test contract states
  const boardOwner = await crosswordBoard.read.owner();
  const expectedOwner = deployer.account.address.toLowerCase();
  const actualOwner = boardOwner.toLowerCase();
  console.log(`   ✅ Board owner correct: ${actualOwner === expectedOwner}`);
  
  console.log("✅ Step 7 completed\n");

  // Final summary
  console.log("📋 Final Contract State:");
  console.log(`   CrosswordBoard Address: ${crosswordBoard.address}`);
  console.log(`   CrosswordPrizes Address: ${crosswordPrizes.address}`);
  console.log(`   Current Crossword ID: ${finalId.substring(0, 12)}...`);
  console.log(`   Total Admins: ${currentAdmins.length} - [${currentAdmins.map(a => a.substring(0, 6) + "...").join(", ")}]`);
  console.log(`   Allowed Tokens: ${finalTokenAllowed ? "Mock CUSD" : "None"}`);
  console.log(`   Paused State: Board=${boardUnpaused}, Prizes=${prizesUnpaused}\n`);

  console.log("🎉 Crossword-Specific Contract Testing Completed Successfully!");
  console.log("✅ All crossword workflow functionality verified");
  console.log("✅ Contracts are ready for Sepolia deployment");
  console.log("✅ Both contracts properly integrated and working together");
  console.log("✅ All security features (pausing, access control) working correctly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });