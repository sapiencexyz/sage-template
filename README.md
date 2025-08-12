# Sage - Sapience Prediction Agent

An interactive Eliza OS agent that helps users explore Sapience prediction markets, generate data-driven predictions, and create attestation calldata for on-chain submission.

## Features

- 🔍 **Market Discovery**: Browse active yes/no prediction markets
- 📊 **Intelligent Predictions**: Generate probability assessments with detailed reasoning
- 💬 **Conversational Interface**: Natural dialogue for exploring markets
- 🔗 **Attestation Support**: Generates EAS-compatible calldata for on-chain attestations
- 🧠 **Context Aware**: Incorporates user-provided context into predictions

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

### List Available Markets
```
You: What markets are available?
Sage: [Lists all active yes/no prediction markets]
```

### Get a Prediction
```
You: Predict market 147
Sage: [Provides detailed analysis with probability, reasoning, and attestation calldata]
```

### Provide Additional Context
```
You: Predict market 147 - btw, there's a conference next week
Sage: [Incorporates your context into the prediction]
```

## How It Works

1. **Market Data**: Fetches active markets from Sapience via MCP tools
2. **Prediction Generation**: Uses LLM to analyze markets and generate probabilities
3. **Attestation Building**: Creates EAS-compatible calldata for on-chain submission
4. **Web Search**: Can search for recent information when needed

## Configuration

### Required
- `OPENAI_API_KEY`: For prediction generation

### Optional
- `PRIVATE_KEY`: For submitting attestations on-chain
- `RPC_URL`: Custom RPC endpoint (defaults to Base)

## Architecture

- **Eliza OS Core**: Conversational agent framework
- **Plugin-Sapience**: MCP integration for Sapience API
- **Custom Actions**: Market listing and prediction generation
- **EAS SDK**: Attestation calldata encoding

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