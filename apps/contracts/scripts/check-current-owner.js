const hre = require("hardhat");

async function main() {
  const crosswordBoardAddress = "0x6e15f23e7f410E250BD221cdB2FB43840354C908";
  const expectedOwner = "0x66299C18c60CE709777Ec79C73b131cE2634f58e";

  console.log("Checking owner of CrosswordBoard contract...");
  console.log(`CrosswordBoard Address: ${crosswordBoardAddress}`);

  // Get CrosswordBoard contract instance
  const crosswordBoard = await hre.viem.getContractAt("CrosswordBoard", crosswordBoardAddress);

  // Read the owner
  const actualOwner = await crosswordBoard.read.owner();
  console.log(`Stored owner address: ${actualOwner}`);
  console.log(`Expected owner address: ${expectedOwner}`);

  if (actualOwner.toLowerCase() === expectedOwner.toLowerCase()) {
    console.log("✅ The expected address is the owner.");
  } else {
    console.error("❌ ERROR: The expected address is NOT the owner.");
  }
  
  // Check if the actual owner has admin privileges
  const DEFAULT_ADMIN_ROLE = await crosswordBoard.read.DEFAULT_ADMIN_ROLE();
  const hasDefaultAdminRole = await crosswordBoard.read.hasRole([DEFAULT_ADMIN_ROLE, actualOwner]);
  console.log(`Actual owner has DEFAULT_ADMIN_ROLE: ${hasDefaultAdminRole}`);
  
  const ADMIN_ROLE = await crosswordBoard.read.ADMIN_ROLE();
  const hasAdminRole = await crosswordBoard.read.hasRole([ADMIN_ROLE, actualOwner]);
  console.log(`Actual owner has ADMIN_ROLE: ${hasAdminRole}`);
  
  // Check if the target address has admin privileges
  const targetHasDefaultAdminRole = await crosswordBoard.read.hasRole([DEFAULT_ADMIN_ROLE, expectedOwner]);
  console.log(`Target address has DEFAULT_ADMIN_ROLE: ${targetHasDefaultAdminRole}`);
  
  const targetHasAdminRole = await crosswordBoard.read.hasRole([ADMIN_ROLE, expectedOwner]);
  console.log(`Target address has ADMIN_ROLE: ${targetHasAdminRole}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });