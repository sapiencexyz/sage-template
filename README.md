# Sage - Sapience Prediction Agent

An interactive and autonomous Eliza OS agent that helps users explore Sapience prediction markets, generate data-driven predictions, and automatically attest to markets with high confidence.

## Features

### Interactive Mode
- 🔍 **Market Discovery**: Browse active yes/no prediction markets through conversation
- 📊 **Intelligent Predictions**: Generate probability assessments with detailed reasoning
- 💬 **Conversational Interface**: Natural dialogue for exploring markets
- 🔗 **Attestation Support**: Generates EAS-compatible calldata for on-chain attestations
- 🧠 **Context Aware**: Incorporates user-provided context into predictions

### Autonomous Mode (New!)
- 🤖 **Continuous Monitoring**: Automatically check all markets on a configurable interval
- 🎯 **Smart Attestation**: Only attest to markets meeting confidence thresholds
- 📦 **Batch Processing**: Handle multiple markets efficiently per cycle
- 📈 **Progress Dashboard**: Track attestation activity and statistics in real-time

## Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your OpenAI API key
```

3. **Run the agent**:
```bash
npm run dev
```

## Usage

### Interactive Commands

#### List Available Markets
```
You: What markets are available?
Sage: [Lists all active yes/no prediction markets]
```

#### Get a Prediction
```
You: Predict market 147
Sage: [Provides detailed analysis with probability, reasoning, and attestation calldata]
```

#### Provide Additional Context
```
You: Predict market 147 - btw, there's a conference next week
Sage: [Incorporates your context into the prediction]
```

### Autonomous Mode Commands

#### Start Autonomous Loop
```
You: Start auto mode
Sage: ✅ Autonomous attestation mode activated
```

#### Control the Loop
```
You: Stop auto mode                    # Pause autonomous operation
You: Set interval 10 minutes           # Change cycle frequency
You: Set confidence 0.8                # Adjust quality threshold
You: Set batch size 10                 # Process more markets per cycle
```

#### View Activity
```
You: Show dashboard
Sage: 📊 Attestation Dashboard
      • Total Markets: 47
      • My Attestations: 31
      • Coverage: 65.9%
      • Auto Mode: 🟢 Running
```

## How It Works

1. **Market Data**: Fetches active markets from Sapience via MCP tools
2. **Prediction Generation**: Uses LLM to analyze markets and generate probabilities
3. **Attestation Building**: Creates EAS-compatible calldata for on-chain submission
4. **Web Search**: Can search for recent information when needed

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...              # For prediction generation

# Optional (for on-chain submission)
PRIVATE_KEY=0x...                   # Wallet private key
RPC_URL=https://base-mainnet...    # Custom RPC endpoint

# Autonomous Mode Settings
AUTO_MODE_ENABLED=false            # Start in auto mode
AUTO_INTERVAL=300000               # Loop interval in ms (5 minutes)
AUTO_BATCH_SIZE=5                  # Markets per cycle
AUTO_MIN_CONFIDENCE=0.6            # Minimum confidence to attest
```

### Character Configuration

Edit `character.json` to customize the agent's personality and behavior:
- Agent name and bio
- Autonomous mode defaults
- Model temperature settings
- Conversation style

## Architecture

```
src/
├── actions/                 # Eliza actions
│   ├── listMarkets.ts      # Market discovery
│   ├── predictMarket.ts    # Prediction generation
│   ├── autoAttest.ts       # Autonomous loop
│   ├── loopControl.ts      # Loop management
│   └── dashboard.ts        # Activity display
├── utils/
│   ├── eas.ts              # EAS attestation builder
│   └── stateManager.ts     # State management
└── index.ts                # Main entry point
```

### Key Components
- **Eliza OS Core**: Conversational agent framework
- **Plugin-Sapience**: MCP integration for Sapience API
- **Custom Actions**: Market interaction and autonomous operations
- **EAS SDK**: Attestation calldata encoding
- **State Manager**: Tracks autonomous mode state and statistics

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Clean build artifacts
npm run clean
```

## License

MIT