// Script to fund the contract owner account with CELO using ethers.js
const { ethers } = require("ethers");

async function main() {
  // The private key for the account with funds
  const PRIVATE_KEY = process.env.PRIVATE_KEY; // This should be 2bc2fb86828553f6c50d37c7dd75fa1028bc9d5569ceb038bd0b268c58f9e8f1

  // The contract owner address that needs funding
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // Amount to send (0.1 CELO should be sufficient for the admin transaction)
  const amountToSend = ethers.parseEther("0.1"); // 0.1 CELO

  console.log(`Funding contract owner account: ${ownerAddress}`);
  console.log(`Amount to send: ${amountToSend.toString()} wei (${ethers.formatEther(amountToSend)} CELO)`);

  // Create provider for Celo Sepolia
  const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");

  // Create wallet with the funded private key
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Sender address:", wallet.address);

  // Check current balance of sender
  const senderBalance = await provider.getBalance(wallet.address);
  console.log("Sender current balance:", senderBalance.toString(), "wei");
  console.log("Sender current balance:", ethers.formatEther(senderBalance), "CELO");

  // Check if sender has sufficient funds for transfer and gas
  const estimatedGasCost = ethers.parseEther("0.01"); // Estimate 0.01 CELO for gas
  if (senderBalance < (amountToSend + estimatedGasCost)) {
    console.error("Sender does not have sufficient funds!");
    return;
  }

  // Prepare transaction
  const tx = {
    to: ownerAddress,
    value: amountToSend,
    gasLimit: 100000, // Standard gas limit
    gasPrice: await provider.getFeeData().then(feeData => feeData.gasPrice) // Current gas price
  };

  console.log("Sending transaction...");
  const transactionResponse = await wallet.sendTransaction(tx);
  
  console.log("Transaction sent:", transactionResponse.hash);
  
  // Wait for transaction to be confirmed
  const receipt = await transactionResponse.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  console.log("✅ Funding completed successfully!");
  
  // Check new balance of owner
  const newOwnerBalance = await provider.getBalance(ownerAddress);
  console.log("New owner balance:", newOwnerBalance.toString(), "wei");
  console.log("New owner balance:", ethers.formatEther(newOwnerBalance), "CELO");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });