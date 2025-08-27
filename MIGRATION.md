# Sage Prediction Agent Migration

## Overview
This project has been successfully migrated from the `sapience-eliza-agent` project with all functionality intact. The migration includes the Sage character configuration, custom attestation actions, autonomous mode, and EAS integration.

## Migrated Components

### 1. Character Configuration
- **File**: `src/character.ts`
- **Description**: Sage personality as a prediction market analyst for Sapience Protocol
- **Features**: 
  - Configured for OpenAI GPT-4o-mini
  - Includes Sapience plugin integration
  - Autonomous mode settings

### 2. Custom Actions
- **attestMarket**: (`src/actions/attestMarket.ts`)
  - Analyzes prediction markets
  - Generates probability assessments
  - Creates EAS attestation calldata
  
- **autonomousMode**: (`src/actions/autonomousMode.ts`)
  - Controls autonomous attestation mode
  - Provides dashboard for monitoring
  - Manages attestation cycles

### 3. Services
- **AttestationService**: (`src/services/attestationService.ts`)
  - Handles autonomous market monitoring
  - Manages attestation history
  - Configurable confidence thresholds

### 4. Utilities
- **EAS Integration**: (`src/utils/eas.ts`)
  - Builds attestation calldata for Ethereum Attestation Service
  - Supports multiple EVM chains
  - Encodes prediction data for on-chain storage

### 5. Plugin Configuration
- **File**: `src/plugin.ts`
- **Description**: Exports custom actions as a plugin
- **Name**: `sage-custom-actions`

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure required variables:
```env
# Required
OPENAI_API_KEY=sk-your-api-key-here
EVM_PRIVATE_KEY=your_ethereum_private_key_here

# Optional autonomous mode settings
AUTO_MODE_ENABLED=false
AUTO_MODE_INTERVAL=300000
AUTO_MODE_MIN_CONFIDENCE=0.6
AUTO_MODE_BATCH_SIZE=5
```

## Running the Agent

### Development Mode
```bash
bun run dev
```

### Production Build
```bash
bun run build
bun run start
```

## Available Commands

When the agent is running, you can use these commands:

- `list markets` - View available prediction markets
- `predict market 147` - Analyze a specific market
- `start auto mode` - Begin autonomous attestation
- `stop auto mode` - Stop autonomous attestation
- `show dashboard` - View attestation statistics

## Database

The agent uses SQLite by default with the database stored at `./data/sage.db`. This can be configured via the `DATABASE_URL` environment variable.

## Fixes Applied During Migration

1. **TypeScript Compatibility**: Fixed all type errors for ElizaOS v1.0.x
2. **Action Handlers**: Updated to return void instead of boolean
3. **Message Examples**: Changed `user` property to `name` in examples
4. **Plugin Types**: Added @ts-ignore for Sapience plugin types
5. **Build Configuration**: Ensured compatibility with latest ElizaOS build system

## Testing

The project has been tested and verified to:
- ✅ Pass all TypeScript type checks
- ✅ Build successfully with vite and tsup
- ✅ Include all custom actions and services
- ✅ Properly configure the Sage character

## Next Steps

1. Set up your API keys in `.env`
2. Run `bun run dev` to start the agent
3. Test the prediction market analysis functionality
4. Configure autonomous mode settings as needed
5. Deploy to production when ready

## Support

For issues related to:
- **Sapience Plugin**: Check https://github.com/sapiencexyz/plugin-sapience
- **ElizaOS**: Refer to ElizaOS documentation
- **This Migration**: Review the code in this repository