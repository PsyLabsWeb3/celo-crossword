// Script to validate the deployed CrosswordBoard contract at the given address
const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0x5516d6bc563270Cbe27ca7Ed965cAA597130954A";
  
  console.log(`Validating CrosswordBoard contract at address: ${CONTRACT_ADDRESS}\n`);

  try {
    // Get the contract using the deployed address
    const contract = await hre.viem.getContractAt("CrosswordBoard", CONTRACT_ADDRESS);
    
    console.log("✅ Successfully connected to the deployed contract");
    
    // Test basic functionality
    try {
      // Check if the contract has expected functions by calling a simple getter
      const maxWinners = await contract.read.getMaxWinners();
      console.log("✅ getMaxWinners():", Number(maxWinners));
    } catch (error) {
      console.log("❌ getMaxWinners() failed:", error.message);
    }
    
    try {
      // Check if contract is paused
      const paused = await contract.read.paused();
      console.log("✅ paused():", paused);
    } catch (error) {
      console.log("❌ paused() failed:", error.message);
    }
    
    try {
      // Check current crossword ID
      const currentCrossword = await contract.read.getCurrentCrossword();
      console.log("✅ getCurrentCrossword() - Current crossword ID:", currentCrossword[0]);
    } catch (error) {
      console.log("❌ getCurrentCrossword() failed:", error.message);
    }
    
    try {
      // Check if it's the unified contract (without dependencies on Config and CrosswordPrizes)
      // Check if contract has own admin functionality
      const isAdminFuncExists = typeof contract.read.isAdminAddress === 'function' || 
                                contract.abi.some(item => item.name === 'isAdminAddress');
      console.log("✅ isAdminAddress function exists:", isAdminFuncExists);
    } catch (error) {
      console.log("❌ isAdminAddress check failed:", error.message);
    }
    
    try {
      // Check if contract has access control functionality
      const owner = await contract.read.owner();
      console.log("✅ owner():", owner);
    } catch (error) {
      console.log("❌ owner() failed:", error.message);
    }
    
    try {
      // Check if contract has prize-related functions
      const maxWinnersConfig = await contract.read.getMaxWinnersConfig();
      console.log("✅ getMaxWinnersConfig():", Number(maxWinnersConfig));
    } catch (error) {
      console.log("❌ getMaxWinnersConfig() failed:", error.message);
    }
    
    // Try to read admin list
    try {
      const admins = await contract.read.getAdmins();
      console.log("✅ getAdmins() - Number of admins:", admins.length);
      if (admins.length > 0) {
        console.log("   Admin addresses:", admins);
      }
    } catch (error) {
      console.log("❌ getAdmins() failed:", error.message);
    }
    
    // Check if the contract has the expected events by looking at the ABI
    const abi = contract.abi;
    const expectedEvents = [
      'ConfigSet',
      'ConfigBoolSet',
      'ConfigUIntSet',
      'CrosswordUpdated',
      'CrosswordCompleted',
      'PrizeDistributed',
      'CrosswordCreated',
      'CrosswordActivated',
      'UnclaimedPrizesRecovered',
      'TokenAllowed',
      'NativeCeloReceived'
    ];
    
    console.log("\n📋 Checking for expected events in ABI:");
    let eventsFound = 0;
    for (const eventName of expectedEvents) {
      const eventExists = abi.some(item => item.type === 'event' && item.name === eventName);
      console.log(`   ${eventName}: ${eventExists ? '✅' : '❌'}`);
      if (eventExists) eventsFound++;
    }
    console.log(`\nEvents found: ${eventsFound}/${expectedEvents.length}`);
    
    // Check if the contract has the expected functions by looking at the ABI
    const expectedFunctions = [
      'setCrossword',
      'completeCrossword',
      'createCrossword',
      'createCrosswordWithNativeCELO',
      'claimPrize',
      'addAdmin',
      'removeAdmin',
      'recordCompletion',
      'getCrosswordDetails',
      'getUserProfile',
      'setMaxWinners',
      'setAllowedToken',
      'pause',
      'unpause'
    ];
    
    console.log("\n📋 Checking for expected functions in ABI:");
    let functionsFound = 0;
    for (const funcName of expectedFunctions) {
      const funcExists = abi.some(item => item.type === 'function' && item.name === funcName);
      console.log(`   ${funcName}: ${funcExists ? '✅' : '❌'}`);
      if (funcExists) functionsFound++;
    }
    console.log(`\nFunctions found: ${functionsFound}/${expectedFunctions.length}`);
    
    console.log(`\n📋 Contract validation completed!`);
    console.log(`Address: ${CONTRACT_ADDRESS}`);
    
    // Overall assessment
    if (functionsFound > expectedFunctions.length * 0.8) {
      console.log("🎉 The contract appears to be a valid CrosswordBoard contract based on function availability.");
    } else {
      console.log("⚠️  The contract may not be the expected CrosswordBoard contract or may be an older version.");
    }
  } catch (error) {
    console.error("❌ Error connecting to contract:", error.message);
    console.log("\nPossible reasons:");
    console.log("- The address is incorrect");
    console.log("- The contract is not deployed at this address");
    console.log("- The contract ABI doesn't match the expected CrosswordBoard contract");
    console.log("- Network configuration is incorrect");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Validation failed:", error);
    process.exit(1);
  });