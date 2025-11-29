// Script to fund the contract owner account with CELO
const hre = require("hardhat");
const { parseEther } = require("viem");

async function main() {
  // The contract owner address that needs funding
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // Amount to send (0.5 CELO should be sufficient for multiple transactions)
  const amountToSend = parseEther("0.5"); // 0.5 CELO
  
  console.log(`Funding contract owner account: ${ownerAddress}`);
  console.log(`Amount to send: ${amountToSend.toString()} wei (${Number(amountToSend)/1e18} CELO)`);

  // Get the deployer (who has funds)
  const [deployer] = await hre.viem.getWalletClients();
  
  console.log("Deployer address:", deployer.account.address);

  // Get public client
  const publicClient = await hre.viem.getPublicClient();
  
  // Check current balance of deployer
  const deployerBalance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log("Deployer current balance:", deployerBalance.toString(), "wei");

  // Check if deployer has sufficient funds
  if (deployerBalance < amountToSend) {
    console.error("Deployer does not have sufficient funds!");
    return;
  }

  // Send funds to owner
  console.log("Sending funds to owner account...");
  const tx = await deployer.sendTransaction({
    to: ownerAddress,
    value: amountToSend,
    account: deployer.account,
  });
  
  console.log("Transaction sent:", tx);
  
  // Wait for transaction to be confirmed
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: tx,
  });
  
  console.log("Transaction confirmed:", receipt.transactionHash);
  
  // Check new balance of owner
  const newOwnerBalance = await publicClient.getBalance({
    address: ownerAddress
  });
  console.log("New owner balance:", newOwnerBalance.toString(), "wei");
  console.log("✅ Funding completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });