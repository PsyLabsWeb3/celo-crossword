// Script to fund the contract owner account with CELO using ethers.js with proper private key hex format
require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  // The private key for the account with funds (add 0x prefix if not present)
  let PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY;
  }

  // The contract owner address that needs funding
  const ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  // Amount to send (0.1 CELO should be sufficient for the admin transaction)
  const amountToSend = ethers.parseEther("0.05"); // 0.05 CELO

  console.log(`Funding contract owner account: ${ownerAddress}`);
  console.log(`Amount to send: ${amountToSend.toString()} wei (${ethers.formatEther(amountToSend)} CELO)`);

  // Create provider for Celo Sepolia
  const provider = new ethers.JsonRpcProvider("https://forno.celo-sepolia.celo-testnet.org");

  // Check sender address
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  console.log("Calculated sender address:", wallet.address);

  // Create wallet with provider
  const fundedWallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Sender address:", fundedWallet.address);

  // Check current balance of sender
  const senderBalance = await provider.getBalance(fundedWallet.address);
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
    gasLimit: 100000, // Standard gas limit for a simple transfer
    // For Celo, we might need to specify gas price or use fee data
  };

  try {
    console.log("Sending transaction...");
    const transactionResponse = await fundedWallet.sendTransaction(tx);
    
    console.log("Transaction sent:", transactionResponse.hash);
    
    // Wait for transaction to be confirmed
    const receipt = await transactionResponse.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("✅ Funding completed successfully!");
    
    // Check new balance of owner
    const newOwnerBalance = await provider.getBalance(ownerAddress);
    console.log("New owner balance:", newOwnerBalance.toString(), "wei");
    console.log("New owner balance:", ethers.formatEther(newOwnerBalance), "CELO");
  } catch (error) {
    console.error("Transaction failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });