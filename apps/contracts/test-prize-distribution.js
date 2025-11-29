const hre = require("hardhat");
const { keccak256, toBytes, parseEther } = require("viem");

async function testPrizeDistribution() {
  console.log("🧪 Starting Prize Distribution Test with 7 players and 5 winners...\n");

  // 1. Setup Environment
  const walletClients = await hre.viem.getWalletClients();
  const [deployer, admin, user1, user2, user3, user4, user5, user6, user7] = walletClients;
  const publicClient = await hre.viem.getPublicClient();

  const users = [user1, user2, user3, user4, user5, user6, user7];
  
  console.log("👥 Accounts:");
  console.log(`  - Admin: ${admin.account.address}`);
  users.forEach((u, i) => console.log(`  - User${i+1}: ${u.account.address}`));

  // 2. Deploy Contract
  console.log("\n🚀 Deploying CrosswordBoard contract...");
  const crosswordBoard = await hre.viem.deployContract("CrosswordBoard", [deployer.account.address]);
  console.log(`  - Contract deployed at: ${crosswordBoard.address}`);

  // Setup roles
  console.log("\n🔑 Setting up roles...");
  const ADMIN_ROLE = keccak256(toBytes("ADMIN_ROLE"));
  
  // Add admin
  await crosswordBoard.write.addAdmin([admin.account.address]);
  // Grant ADMIN_ROLE to admin
  await crosswordBoard.write.grantRole([ADMIN_ROLE, admin.account.address]);
  
  console.log("  - Admin roles granted");

  // 3. Configure Crossword
  console.log("\n⚙️  Configuring Crossword...");
  
  // Set max winners to 5 (default is 3)
  const newMaxWinners = 5n;
  await crosswordBoard.write.setMaxWinnersConfig([newMaxWinners], { account: admin.account });
  console.log(`  - Max winners set to: ${newMaxWinners}`);

  const crosswordId = keccak256(toBytes("prize-dist-test-1"));
  const prizePool = parseEther("2"); // 2 CELO
  // Percentages: 40%, 25%, 15%, 10%, 10% = 100%
  const winnerPercentages = [4000n, 2500n, 1500n, 1000n, 1000n]; 
  const endTime = 0n; // No deadline
  
  const crosswordData = JSON.stringify({
    grid: [["A"]],
    clues: { across: [], down: [] }
  });

  console.log(`  - Prize Pool: 2 CELO`);
  console.log(`  - Winner Percentages: ${winnerPercentages.join(", ")}`);

  // 4. Create Crossword
  console.log("\n📝 Creating Crossword...");
  await crosswordBoard.write.createCrosswordWithNativeCELOPrizePool([
    crosswordId,
    crosswordData,
    newMaxWinners,
    prizePool,
    winnerPercentages,
    endTime
  ], { 
    account: admin.account,
    value: prizePool
  });
  console.log("  - Crossword created and activated");

  // 5. Simulate Gameplay
  console.log("\n🎮 Simulating Gameplay...");

  // Capture initial balances
  const initialBalances = {};
  for (let i = 0; i < users.length; i++) {
    const balance = await publicClient.getBalance({ address: users[i].account.address });
    initialBalances[users[i].account.address] = balance;
  }

  // Users complete the crossword
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const username = `user${i+1}`;
    const duration = 1000n + BigInt(i * 100); // Different durations
    
    console.log(`  - ${username} completing crossword...`);
    
    try {
      await crosswordBoard.write.completeCrossword([
        duration,
        username,
        `${username} Display`,
        `https://example.com/${username}.png`
      ], { account: user.account });
    } catch (e) {
      console.error(`    ❌ Error for ${username}: ${e.message}`);
    }
  }

  // 6. Verification
  console.log("\n✅ Verifying Results...");
  
  console.log("  Checking Winners and Ranks:");
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const isWinner = await crosswordBoard.read.isWinner([crosswordId, user.account.address]);
    const rank = await crosswordBoard.read.getUserRank([crosswordId, user.account.address]);
    
    const status = isWinner ? `Winner (Rank ${rank})` : "Not a winner";
    console.log(`    - User${i+1}: ${status}`);
    
    // Assertions
    if (i < 5) {
      if (!isWinner) console.error(`      ❌ User${i+1} should be a winner but is not!`);
      if (rank !== BigInt(i + 1)) console.error(`      ❌ User${i+1} rank mismatch! Expected ${i+1}, got ${rank}`);
    } else {
      if (isWinner) console.error(`      ❌ User${i+1} should NOT be a winner!`);
    }
  }

  console.log("\n  Checking Balances:");
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const finalBalance = await publicClient.getBalance({ address: user.account.address });
    const initialBalance = initialBalances[user.account.address];
    const diff = finalBalance - initialBalance;
    
    // Calculate expected prize
    let expectedPrize = 0n;
    if (i < 5) {
      expectedPrize = (prizePool * winnerPercentages[i]) / 10000n;
    }

    // Note: Gas costs will make the diff slightly less than the prize
    // We can check if the diff is roughly equal to prize - gas
    // Or just check that it increased significantly if they won
    
    const diffEther = Number(diff) / 1e18;
    const expectedEther = Number(expectedPrize) / 1e18;
    
    console.log(`    - User${i+1}:`);
    console.log(`      Initial: ${Number(initialBalance) / 1e18} CELO`);
    console.log(`      Final:   ${Number(finalBalance) / 1e18} CELO`);
    console.log(`      Diff:    ${diffEther} CELO`);
    console.log(`      Expected Prize: ${expectedEther} CELO`);

    if (i < 5) {
      if (diff <= 0n) console.error(`      ❌ User${i+1} balance did not increase!`);
      // Allow for some gas usage (e.g. 0.01 CELO)
      if (diff < expectedPrize - parseEther("0.01")) console.error(`      ❌ User${i+1} received significantly less than expected!`);
    } else {
      // Non-winners pay gas, so balance should decrease
      if (diff >= 0n) console.error(`      ❌ User${i+1} balance increased or stayed same (should have paid gas)!`);
    }
  }

  // Check contract segregated balance
  const celoBalance = await crosswordBoard.read.crosswordCeloBalance([crosswordId]);
  console.log(`\n  Remaining Contract Segregated Balance: ${Number(celoBalance) / 1e18} CELO`);
  if (celoBalance !== 0n) {
     console.log("  (Should be 0 if all prizes distributed)");
  } else {
     console.log("  ✅ All prizes distributed correctly.");
  }

}

testPrizeDistribution()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
