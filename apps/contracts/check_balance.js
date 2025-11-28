// Script to check the CELO balance of a specific address on Celo Sepolia
const hre = require('hardhat');

async function main() {
  console.log('Checking CELO balance for address: 0x66299C18c60CE709777Ec79C73b131cE2634f58e on Celo Sepolia...');

  // Get the public client
  const publicClient = await hre.viem.getPublicClient();
  
  // Address to check
  const address = '0x66299C18c60CE709777Ec79C73b131cE2634f58e';
  
  try {
    // Get the balance in wei
    const balanceWei = await publicClient.getBalance({
      address: address
    });
    
    // Convert to CELO (1 CELO = 10^18 wei)
    const balanceCelo = Number(balanceWei) / 1e18;
    
    console.log(`💰 Balance: ${balanceWei.toString()} wei`);
    console.log(`💰 Balance: ${balanceCelo.toFixed(6)} CELO`);
    
    // Also check if this address is a contract or EOA (externally owned account)
    const bytecode = await publicClient.getBytecode({
      address: address
    });
    
    console.log(`📝 Account type: ${bytecode && bytecode.length > 0 ? 'Contract' : 'Externally Owned Account (EOA)'}`);
    
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });