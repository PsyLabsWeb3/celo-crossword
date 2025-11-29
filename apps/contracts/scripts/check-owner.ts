const hre = require("hardhat");

async function main() {
  const contractAddress = "0xF1d8D722cD9aa9f79F6EDFbb0Eb83b005f868cBd";
  
  console.log("Checking owner for contract:", contractAddress);

  try {
    // Get the public client
    const publicClient = await hre.viem.getPublicClient();
    
    // Get the contract artifact to get the ABI
    const artifact = await hre.artifacts.readArtifact("CrosswordBoard");
    
    // Read the owner from the contract
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'owner',
    });

    console.log("Current Owner:", owner);
    
    const myAddress = "0x66299C18c60CE709777Ec79C73b131cE2634f58e";
    console.log("My Address:   ", myAddress);
    
    if (owner.toLowerCase() === myAddress.toLowerCase()) {
      console.log("✅ MATCH: You are the owner!");
    } else {
      console.log("❌ MISMATCH: You are NOT the owner.");
    }
  } catch (error) {
    console.error("Error fetching owner:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
