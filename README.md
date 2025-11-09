# Celo Crossword Learning App

A decentralized crossword game built on the Celo blockchain for educational purposes with reward distribution.

## 🚀 Features

- **On-chain Crosswords**: Crosswords stored in smart contracts for all users to see
- **Prize Distribution**: Token rewards for top solvers
- **Celo Integration**: Full wallet support (Valora, MetaMask)
- **Leaderboard**: Supabase-backed rankings
- **Admin Panel**: Control over crossword content
- **Farcaster Integration**: Ready for Farcaster frames

## 🏗️ Architecture

### Smart Contracts
- **CrosswordBoard.sol**: Stores the current crossword for all users
- **CrosswordPrizes.sol**: Manages reward pools and distribution

### Frontend
- Next.js 16 with TypeScript
- wagmi/viem for wallet integration
- Supabase for leaderboards
- Tailwind CSS for styling
- Farcaster MiniApp compatible

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- pnpm package manager
- Celo wallet (Valora, MetaMask)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd celo-crossword
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
# In apps/web/
cp .env.template .env.local
```

4. **Update environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CROSSWORD_BOARD_ADDRESS=your_contract_address
NEXT_PUBLIC_CROSSWORD_PRIZES_ADDRESS=your_contract_address
NEXT_PUBLIC_FARCASTER_HEADER=your_farcaster_header
NEXT_PUBLIC_FARCASTER_PAYLOAD=your_farcaster_payload
NEXT_PUBLIC_FARCASTER_SIGNATURE=your_farcaster_signature
```

### Running Locally

1. **Start the frontend**
```bash
cd apps/web
pnpm dev
```

2. **The app will be available at** `http://localhost:3000`

### Contract Development

1. **Navigate to contracts**
```bash
cd apps/contracts
```

2. **Compile contracts**
```bash
pnpm build
```

3. **Run tests**
```bash
pnpm test
```

4. **Deploy locally** (for development)
```bash
# Start local node
npx hardhat node

# In another terminal, deploy
npx hardhat run scripts/deploy-local.js --network localhost
```

## 🌐 Deployment

### Deploying Contracts to Celo Sepolia

1. **Configure Sepolia in hardhat.config.ts**
2. **Set up environment variables** with your private key
3. **Deploy contracts**
```bash
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

4. **Update frontend** with deployed addresses (see FRONTEND_SETUP_GUIDE.md)

### Deploying Frontend

The frontend can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- Any static hosting service

## 🎮 How It Works

1. **Admin** sets crossword via admin panel (writes to CrosswordBoard contract)
2. **All users** see the same crossword (reads from CrosswordBoard contract)
3. **Users** solve crossword and submit to Supabase leaderboard
4. **Admin** distributes prizes to top solvers via CrosswordPrizes contract
5. **Winners** claim their rewards from the prize pool

## 🔐 Admin Functions

### To become an admin:
- The deployer is automatically an admin
- Additional admins can be added via `addAdmin()` function

### Admin capabilities:
- Set new crosswords via admin panel
- Manage token whitelist for prizes
- Distribute rewards to winners
- Pause/unpause contracts in emergencies

## 💰 Token Rewards

The system supports:
- cUSD, cEUR, and other Celo stablecoins
- Configurable percentage splits for winners
- Up to 10 winners per crossword
- Recovery of unclaimed prizes after 30 days

## 📊 Leaderboard System

- Supabase-powered leaderboard
- Wallet verification prevents bot submissions
- Time-based rankings
- Historical data tracking

## 🧪 Testing

Comprehensive test suites are available:
- `scripts/manual-test.js` - Core functionality
- `scripts/crossword-specific-test.js` - Workflow testing  
- `scripts/security-edge-test.js` - Security and edge cases

Run with:
```bash
cd apps/contracts
npx hardhat run scripts/manual-test.js --network localhost
```

## 🔧 Configuration

### Crossword Format
Crosswords follow this JSON format:
```json
{
  "gridSize": { "rows": 6, "cols": 10 },
  "title": "Sample Crossword",
  "clues": [
    {
      "number": 1,
      "clue": "Sample clue",
      "answer": "ANSWER",
      "row": 0,
      "col": 0,
      "direction": "across"
    }
  ]
}
```

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_CROSSWORD_BOARD_ADDRESS` - Board contract address
- `NEXT_PUBLIC_CROSSWORD_PRIZES_ADDRESS` - Prizes contract address
- `NEXT_PUBLIC_FARCASTER_HEADER/PAYLOAD/SIGNATURE` - Farcaster integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository.

---

Built with ❤️ for the Celo ecosystem