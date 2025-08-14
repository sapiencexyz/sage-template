# Sapience Interactive & Autonomous Prediction Agent - Technical Specification

## Executive Summary

This specification defines a dual-mode Eliza OS agent for Sapience prediction markets that operates both interactively and autonomously. In interactive mode, users can explore markets through conversation, request predictions, and receive detailed explanations. In autonomous mode, the agent continuously monitors all markets and automatically submits attestations for unattested markets. This design serves as a demo-friendly template that developers can fork and customize for their own prediction market strategies.

## Operation Modes

### 1. Interactive Mode
Users can chat with the agent to explore markets and get predictions:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER CONVERSATION                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User: "What markets are available?"                         │
│    ↓                                                          │
│  Agent: Lists active yes/no markets with IDs                 │
│                                                               │
│  User: "Predict market 123"                                  │
│    ↓                                                          │
│  Agent: Analyzes & provides prediction with reasoning        │
│    ↓                                                          │
│  [Attestation calldata generated]                            │
│                                                               │
│  User: "Why do you think that?"                              │
│    ↓                                                          │
│  Agent: Explains data sources and analysis                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Autonomous Mode
Agent runs continuously to attest all markets:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS LOOP                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Every 5 minutes:                                            │
│  ┌─────────────────────────────────────────────────┐        │
│  │  1. Fetch all active markets                     │        │
│  │  2. Check which markets we've already attested   │        │
│  │  3. Generate predictions for unattested markets  │        │
│  │  4. Submit attestations for confident predictions│        │
│  │  5. Report progress to connected users           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
│  User Controls:                                              │
│  • "Start auto mode" - Begin autonomous loop                 │
│  • "Stop auto mode" - Pause autonomous operation             │
│  • "Show status" - Display current progress                  │
│  • "Set interval 10 minutes" - Adjust timing                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Internal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ELIZA OS ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐       ┌─────────────────────┐            │
│  │   User Input │ ───>  │  Action Evaluator   │            │
│  └──────────────┘       └─────────────────────┘            │
│                                 │                            │
│                                 ▼                            │
│                    ┌─────────────────────────┐              │
│                    │    Trigger Action       │              │
│                    └─────────────────────────┘              │
│                          │            │                      │
│            ┌─────────────┴────┬──────┴──────────┐          │
│            ▼                  ▼                  ▼          │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│    │ List Markets │  │Predict Market│  │Build Attest. │   │
│    └──────────────┘  └──────────────┘  └──────────────┘   │
│            │                  │                  │          │
│            ▼                  ▼                  ▼          │
│    ┌─────────────────────────────────────────────────┐     │
│    │           MCP Server (via plugin-sapience)      │     │
│    └─────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Interactive Market Discovery
- Users can request a list of active prediction markets
- Markets are filtered to show only yes/no questions
- Each market displayed with ID, question, and current market price
- Natural language queries supported ("What can I predict?", "Show markets", etc.)

### 2. Intelligent Prediction Generation
- On-demand analysis of specific markets
- Multi-source data gathering for informed predictions
- Probability assessment with confidence scoring
- Detailed reasoning explanation
- Automatic attestation calldata generation

### 3. Conversational Explanations
- Users can drill down into prediction reasoning
- Agent explains weight of different factors
- Historical context and similar market comparisons
- Transparent about data sources and limitations

## Detailed Component Specifications

### 1. Market Discovery Action

#### Purpose
Enable users to explore available prediction markets through natural conversation.

#### Implementation

```typescript
interface ListMarketsAction {
  name: 'LIST_MARKETS';
  
  // Triggers on phrases like:
  // - "What markets are available?"
  // - "Show me predictions"
  // - "List markets"
  // - "What can I forecast?"
  
  async handler(runtime: IAgentRuntime): Promise<string> {
    // 1. Call MCP tool via plugin-sapience
    const markets = await runtime.callTool('list_active_markets');
    
    // 2. Filter for yes/no markets
    const yesNoMarkets = markets.filter(m => m.claimStatementNo !== null);
    
    // 3. Format for display
    return formatMarketsForConversation(yesNoMarkets);
  }
}
```

#### Example Output
```
I found 12 active yes/no prediction markets:

📊 Market #147: "Will BTC exceed $100k by Dec 31?"
   Current: 68% YES | Ends in 18 days

📊 Market #148: "Will the Fed cut rates in Q1 2025?"
   Current: 42% YES | Ends in 45 days

📊 Market #152: "Will ETH/BTC ratio rise above 0.05?"
   Current: 31% YES | Ends in 7 days

Which market would you like me to analyze?
```

### 2. Prediction Generation Action

#### Purpose
Generate detailed predictions with reasoning for specific markets.

#### Core Prediction Logic

```typescript
interface PredictMarketAction {
  name: 'PREDICT_MARKET';
  
  // Triggers on:
  // - "Predict market 123"
  // - "What do you think about #147?"
  // - "Analyze market 123"
  // - "Forecast BTC market"
  
  async handler(
    runtime: IAgentRuntime, 
    marketId: string,
    userContext?: string
  ): Promise<PredictionResult> {
    // 1. Fetch market details via MCP
    const market = await runtime.callTool('get_market_details', {
      marketId: marketId
    });
    
    // 2. Check existing attestations for additional context
    const attestations = await runtime.callTool('get_attestations_by_market', {
      marketId: marketId
    });
    
    // 3. Generate prediction using LLM (with optional user context)
    const prediction = await generatePrediction(market, userContext);
    
    // 4. Build attestation calldata
    const calldata = await buildAttestationCalldata(market, prediction);
    
    return {
      market,
      prediction,
      reasoning: prediction.reasoning,
      attestations: attestations.length, // Show how many others have attested
      calldata
    };
  }
}
```

#### Simplified LLM-Powered Prediction

```typescript
async function generatePrediction(
  market: Market,
  userContext?: string
): Promise<Prediction> {
  const prompt = `
    Analyze this prediction market and provide your assessment:
    
    Question: ${market.question}
    Current Market Price: ${market.currentPrice}% YES
    Resolution Date: ${market.endTimestamp}
    ${userContext ? `\nAdditional context from user: ${userContext}` : ''}
    
    Based on your knowledge (you can search the web if needed for recent events):
    1. Provide your probability assessment (0-100) that the answer is YES
    2. Explain your key reasoning points
    3. Note any important risk factors or uncertainties
    4. Rate your confidence level (1-10)
    
    Be transparent about any limitations in your knowledge or if the question involves future events that are highly uncertain.
    
    Format your response as JSON with fields: probability, reasoning, risks, confidence
  `;
  
  // The LLM can use web search if it needs recent information
  const response = await llm.complete(prompt, {
    tools: ['web_search'] // Enable web search for the LLM
  });
  
  return parsePredictionResponse(response);
}

// Handle user providing additional context
async function handleUserContext(
  runtime: IAgentRuntime,
  message: string
): Promise<string | null> {
  // Check if user is providing context for a prediction
  const contextPatterns = [
    /context:\s*(.*)/i,
    /additional info:\s*(.*)/i,
    /btw,?\s*(.*)/i,
    /fyi,?\s*(.*)/i
  ];
  
  for (const pattern of contextPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}
```

### 3. Autonomous Loop Action

#### Purpose
Enable the agent to run continuously, automatically attesting to unattested markets.

#### Implementation

```typescript
interface AutoAttestAction {
  name: 'AUTO_ATTEST';
  
  // Triggers: "start auto mode", "begin loop", "run continuously"
  
  async handler(runtime: IAgentRuntime, interval: number = 300000): Promise<void> {
    // Store loop state
    runtime.setState('autoMode', true);
    runtime.setState('loopInterval', interval);
    
    const loopId = setInterval(async () => {
      if (!runtime.getState('autoMode')) {
        clearInterval(loopId);
        return;
      }
      
      try {
        // 1. Fetch all markets
        const markets = await runtime.callTool('list_active_markets');
        const yesNoMarkets = markets.filter(m => m.claimStatementNo);
        
        // 2. Check attestations for each market
        const unattested = [];
        for (const market of yesNoMarkets) {
          const attestations = await runtime.callTool('check_attestation_exists', {
            attesterAddress: runtime.agentAddress,
            marketId: market.marketId
          });
          
          if (!attestations.hasAttestation) {
            unattested.push(market);
          }
        }
        
        // 3. Process in batches
        const batchSize = runtime.getSetting('batchSize') || 5;
        const minConfidence = runtime.getSetting('minConfidence') || 0.6;
        
        for (const market of unattested.slice(0, batchSize)) {
          // Generate prediction
          const prediction = await generatePrediction(market);
          
          // Only attest if confident enough
          if (prediction.confidence >= minConfidence) {
            const calldata = await buildAttestationCalldata(market, prediction);
            
            // Log the attestation (in production, would submit on-chain)
            runtime.emit('attestation', {
              marketId: market.marketId,
              prediction: prediction.probability,
              confidence: prediction.confidence
            });
          }
        }
        
        // Update statistics
        runtime.setState('lastCycleTime', Date.now());
        runtime.setState('marketsProcessed', unattested.length);
        
      } catch (error) {
        elizaLogger.error('Auto-attest cycle failed:', error);
      }
    }, interval);
    
    runtime.setState('loopId', loopId);
  }
}
```

### 4. Loop Control Action

#### Purpose
Allow users to control the autonomous loop behavior.

#### Implementation

```typescript
interface LoopControlAction {
  name: 'LOOP_CONTROL';
  
  // Triggers: "stop auto mode", "pause", "set interval X", "set confidence X"
  
  async handler(runtime: IAgentRuntime, command: string): Promise<string> {
    const commands = {
      'stop': () => {
        runtime.setState('autoMode', false);
        const loopId = runtime.getState('loopId');
        if (loopId) clearInterval(loopId);
        return 'Autonomous mode stopped';
      },
      
      'start': () => {
        runtime.executeAction('AUTO_ATTEST');
        return 'Autonomous mode started';
      },
      
      'status': () => {
        const autoMode = runtime.getState('autoMode');
        const lastCycle = runtime.getState('lastCycleTime');
        const processed = runtime.getState('marketsProcessed');
        
        return `
          Mode: ${autoMode ? 'Running' : 'Stopped'}
          Last Cycle: ${lastCycle ? new Date(lastCycle).toISOString() : 'Never'}
          Markets Processed: ${processed || 0}
          Interval: ${runtime.getState('loopInterval') / 1000}s
          Min Confidence: ${runtime.getSetting('minConfidence')}
        `;
      },
      
      'setInterval': (minutes: number) => {
        runtime.setState('loopInterval', minutes * 60 * 1000);
        return `Interval set to ${minutes} minutes`;
      },
      
      'setConfidence': (threshold: number) => {
        runtime.setSetting('minConfidence', threshold);
        return `Confidence threshold set to ${threshold}`;
      }
    };
    
    return commands[command]();
  }
}
```

### 5. Dashboard Action

#### Purpose
Provide visual feedback on the agent's attestation activity.

#### Implementation

```typescript
interface DashboardAction {
  name: 'SHOW_DASHBOARD';
  
  // Triggers: "show dashboard", "status", "show activity"
  
  async handler(runtime: IAgentRuntime): Promise<string> {
    // Get statistics
    const stats = await runtime.callTool('query_graphql', {
      query: `
        query GetAgentStats($attester: String!) {
          attestations(where: { attester: $attester }) {
            totalCount
          }
          markets {
            totalCount
            activeCount: count(where: { endTimestamp: { gt: $now } })
          }
        }
      `,
      variables: { 
        attester: runtime.agentAddress,
        now: Math.floor(Date.now() / 1000)
      }
    });
    
    const recentAttestations = await runtime.callTool('get_recent_attestations', {
      limit: 5
    });
    
    return `
📊 **Attestation Dashboard**

**Overall Stats:**
• Total Markets: ${stats.markets.activeCount}
• My Attestations: ${stats.attestations.totalCount}
• Coverage: ${(stats.attestations.totalCount / stats.markets.activeCount * 100).toFixed(1)}%
• Auto Mode: ${runtime.getState('autoMode') ? '🟢 Running' : '🔴 Stopped'}

**Recent Activity:**
${recentAttestations.map(a => 
  `• Market #${a.marketId}: ${a.prediction}% YES (${timeAgo(a.time)})`
).join('\n')}

**Next Cycle:** ${runtime.getState('autoMode') ? 
  `in ${Math.round((runtime.getState('loopInterval') - (Date.now() - runtime.getState('lastCycleTime'))) / 1000)}s` : 
  'Not scheduled'}
    `;
  }
}
```

### 6. Attestation Builder

#### Purpose
Generate EAS-compatible attestation calldata for on-chain submission.

#### Implementation

```typescript
import { SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';

const SCHEMA_ID = '0x2dbb0921fa38ebc044ab0a7fe109442c456fb9ad39a68ce0a32f193744d17744';
const SCHEMA = 'address marketAddress,uint256 marketId,bytes32 questionId,uint160 prediction,string comment';

async function buildAttestationCalldata(
  market: Market,
  prediction: Prediction
): Promise<AttestationCalldata> {
  const encoder = new SchemaEncoder(SCHEMA);
  
  // Encode the attestation data
  const encodedData = encoder.encodeData([
    { name: 'marketAddress', value: market.address, type: 'address' },
    { name: 'marketId', value: market.marketId, type: 'uint256' },
    { name: 'questionId', value: market.questionId || '0x0', type: 'bytes32' },
    { name: 'prediction', value: Math.round(prediction.probability * 160 / 100), type: 'uint160' },
    { name: 'comment', value: prediction.reasoning.substring(0, 200), type: 'string' }
  ]);
  
  // Build the transaction calldata
  const calldata = encodeFunctionData({
    abi: EAS_ABI,
    functionName: 'attest',
    args: [{
      schema: SCHEMA_ID,
      data: {
        recipient: '0x0000000000000000000000000000000000000000',
        expirationTime: 0,
        revocable: false,
        refUID: '0x0',
        data: encodedData,
        value: 0
      }
    }]
  });
  
  return {
    to: EAS_CONTRACT_ADDRESS,
    data: calldata,
    value: '0',
    description: `Attest: ${prediction.probability}% YES for market ${market.marketId}`
  };
}
```

### 7. Conversation Examples

#### Example 1: Market Discovery
```
User: What markets can I predict on?

Agent: I found 12 active yes/no prediction markets:

📊 Market #147: "Will BTC exceed $100k by Dec 31?"
   Current: 68% YES | Ends in 18 days

📊 Market #148: "Will the Fed cut rates in Q1 2025?"
   Current: 42% YES | Ends in 45 days

📊 Market #152: "Will ETH/BTC ratio rise above 0.05?"
   Current: 31% YES | Ends in 7 days

[... more markets ...]

Which market would you like me to analyze?
```

#### Example 2: Detailed Prediction
```
User: Predict market 147

Agent: Analyzing Market #147: "Will BTC exceed $100k by Dec 31?"

📊 Current Market Price: 68% YES
⏰ Time Remaining: 18 days
🎯 My Prediction: 72% YES (↑4% from market)

📈 Key Factors Supporting YES:
• Momentum: BTC up 15% past week, breaking $85k resistance
• Institutional flows: ETF inflows at 3-month high ($2.1B last week)
• Technical setup: RSI at 65 (not overbought), MACD bullish crossover
• Historical: December averages +12% returns in bull markets

⚠️ Risk Factors:
• Psychological resistance at $100k may trigger profit-taking
• Only 18 days remaining (requires 18% gain from current $84.5k)
• Macro uncertainty with upcoming FOMC meeting

Confidence: 7/10 (Medium-High)

💾 Attestation Calldata:
```
To: 0x4200000000000000000000000000000000000021
Data: 0xf17325e7000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000012e4a82b99f1dcfe4d0ccb0c889e6f67d00004590000000000000000000000000000000000000000000000000000000000000093000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b8427443206578636565642024313030
```

Would you like me to explain any part of this analysis?
```

#### Example 3: User Providing Context
```
User: Predict market 147 - btw, there's a major Bitcoin conference happening next week with institutional speakers

Agent: Thanks for that context! Let me analyze Market #147 with this additional information.

Analyzing Market #147: "Will BTC exceed $100k by Dec 31?"

📊 Current Market Price: 68% YES
⏰ Time Remaining: 18 days
🎯 My Prediction: 75% YES (↑7% from market)

📈 Analysis incorporating your context:
• Conference Impact: Major BTC conferences historically create positive momentum
  - Institutional speakers suggest potential announcement catalysts
  - Previous conferences have triggered 5-10% price moves
• Current Price: $84,500 (needs 18% gain to hit $100k)
• Technical Setup: Strong support at $80k, momentum indicators bullish
• Market Sentiment: Your info about institutional involvement reinforces bullish case

⚠️ Risk Factors:
• Short timeframe (18 days) requires sustained momentum
• $100k psychological resistance remains significant
• Post-conference "sell the news" risk

Confidence: 7/10 (Medium-High)
*Note: The conference information you provided increased my prediction by ~3% as institutional events often drive positive sentiment*

💾 Attestation Calldata ready. Would you like me to explain any part of this analysis?
```

#### Example 4: LLM Using Web Search
```
User: Predict market 205 about the upcoming SpaceX launch

Agent: Let me search for the latest information about this SpaceX launch to give you an accurate prediction.

*[Agent searches web for recent SpaceX launch updates]*

Analyzing Market #205: "Will SpaceX successfully launch Starship before Jan 15?"

📊 Current Market Price: 45% YES
⏰ Time Remaining: 22 days
🎯 My Prediction: 62% YES (↑17% from market)

📈 Based on latest information (searched just now):
• FAA approved launch license on Dec 20 (major hurdle cleared)
• SpaceX completed wet dress rehearsal successfully yesterday
• Weather window favorable for next 10 days
• All 33 Raptor engines tested and validated
• Previous launch attempt issues have been addressed

⚠️ Risk Factors:
• Technical complexity - any system could cause delay
• Weather dependency in January
• Regulatory last-minute holds possible

Confidence: 6/10 (Medium)
*Note: Web search revealed recent positive developments not reflected in market price*

Would you like more details about the technical readiness?
```

#### Example 5: Starting Autonomous Mode
```
User: Start auto mode

Agent: Starting autonomous attestation mode...
✅ Autonomous mode activated
• Interval: 5 minutes
• Confidence threshold: 0.6
• Batch size: 5 markets per cycle

I'll now continuously monitor and attest to unattested markets. You can check my progress with "show status" or stop me with "stop auto mode".
```

#### Example 6: Checking Status
```
User: Show dashboard

Agent: 📊 **Attestation Dashboard**

**Overall Stats:**
• Total Markets: 47
• My Attestations: 31
• Coverage: 65.9%
• Auto Mode: 🟢 Running

**Recent Activity:**
• Market #147: 72% YES (2 min ago)
• Market #152: 31% YES (7 min ago)
• Market #148: 58% YES (12 min ago)
• Market #155: 89% YES (17 min ago)
• Market #143: 15% YES (22 min ago)

**Next Cycle:** in 180s
```

#### Example 7: Adjusting Settings
```
User: Set confidence threshold 0.8

Agent: Confidence threshold updated to 0.8
Now I'll only submit attestations for predictions where I have 80% or higher confidence.

User: Set interval 10 minutes

Agent: Loop interval updated to 10 minutes
The next attestation cycle will run in 10 minutes.
```

#### Example 8: Loop Progress Notification
```
[Autonomous cycle running in background]

Agent: 🔄 Attestation Cycle Complete
• Markets checked: 23
• New attestations: 7
• Skipped (low confidence): 3
• Already attested: 13

Notable predictions:
• Market #167: 91% YES (high confidence)
• Market #169: 12% YES (contrarian view)

Next cycle in 5 minutes.
```

### 8. Character Configuration

```json
{
  "name": "Sage",
  "description": "Expert prediction analyst for Sapience markets",
  "modelProvider": "openai",
  "clients": ["direct"],
  "settings": {
    "voice": {
      "model": "gpt-4",
      "temperature": 0.3
    },
    "autonomousMode": {
      "enabled": false,
      "interval": 300000,
      "batchSize": 5,
      "minConfidence": 0.6,
      "maxGasPrice": "10000000000",
      "skipLowLiquidity": true
    }
  },
  "bio": [
    "I'm Sage, your prediction market analyst.",
    "I analyze Sapience markets using multiple data sources and provide probability assessments.",
    "I can explain my reasoning and generate attestation calldata for on-chain predictions.",
    "I aim to be transparent about my analysis methods and confidence levels."
  ],
  "lore": [
    "Trained on historical prediction market data",
    "Combines quantitative analysis with qualitative reasoning",
    "Always provides confidence levels with predictions"
  ],
  "messageExamples": [
    [
      {
        "user": "{{user1}}",
        "content": {
          "text": "What markets are available?"
        }
      },
      {
        "user": "Sage",
        "content": {
          "text": "Let me fetch the current active prediction markets for you..."
        }
      }
    ],
    [
      {
        "user": "{{user1}}",
        "content": {
          "text": "Predict market 42"
        }
      },
      {
        "user": "Sage",
        "content": {
          "text": "I'll analyze market 42 and provide my prediction with detailed reasoning..."
        }
      }
    ]
  ],
  "topics": [
    "prediction markets",
    "probability assessment",
    "market analysis",
    "attestations",
    "sapience protocol"
  ],
  "adjectives": [
    "analytical",
    "transparent",
    "data-driven",
    "thoughtful",
    "precise"
  ]
}
```

## Technical Implementation

### Project Structure

```
sapience-eliza-agent/
├── src/
│   ├── index.ts                    # Eliza agent initialization
│   ├── actions/
│   │   ├── listMarkets.ts         # Market discovery action
│   │   ├── predictMarket.ts       # Prediction generation action
│   │   ├── autoAttest.ts          # Autonomous attestation loop
│   │   ├── loopControl.ts         # Control autonomous mode
│   │   ├── dashboard.ts           # Show activity dashboard
│   │   └── buildAttestation.ts    # Attestation builder action
│   ├── evaluators/
│   │   ├── marketEvaluator.ts     # Detect market-related queries
│   │   └── loopEvaluator.ts       # Detect loop control commands
│   └── utils/
│       ├── eas.ts                 # EAS encoding utilities
│       ├── marketFormatter.ts     # Format markets for display
│       └── stateManager.ts        # Manage agent state
├── character.json                  # Agent personality config
├── package.json
├── tsconfig.json
└── .env
```

### Dependencies

```json
{
  "name": "sapience-eliza-agent",
  "version": "1.0.0",
  "dependencies": {
    "@elizaos/core": "latest",
    "@elizaos/plugin-sapience": "latest",
    "@ethereum-attestation-service/eas-sdk": "^2.5.0",
    "viem": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

### Environment Configuration

```bash
# Required
OPENAI_API_KEY=sk-...              # For prediction generation

# Optional (for transaction submission)
PRIVATE_KEY=0x...                   # If user wants to submit attestations
RPC_URL=https://base-mainnet.infura.io/v3/...

# Autonomous Mode Settings
AUTO_MODE_ENABLED=false            # Start in auto mode
AUTO_INTERVAL=300000               # Loop interval in ms (5 minutes)
AUTO_BATCH_SIZE=5                  # Markets per cycle
AUTO_MIN_CONFIDENCE=0.6            # Minimum confidence to attest

# Auto-configured by plugin-sapience
# SAPIENCE_API_URL=https://api.sapience.xyz
```

### Error Handling

```typescript
class PredictionErrorHandler {
  handleMarketNotFound(marketId: string): string {
    return `I couldn't find market ${marketId}. Try "list markets" to see available options.`;
  }
  
  handleDataGatheringFailure(market: Market): string {
    return `I'm having trouble gathering data for this market. I can still provide a basic prediction based on the market question and current price.`;
  }
  
  handleAttestationBuildFailure(error: Error): string {
    return `I generated the prediction but couldn't create the attestation calldata: ${error.message}`;
  }
}
```

## Value Proposition

### Why Eliza OS for This Use Case

1. **Dual Mode Operation**: Both interactive chat and autonomous loop in one agent
2. **Natural Conversation Flow**: Users can explore markets and understand predictions through dialogue
3. **Context Retention**: Agent remembers previous questions in the conversation
4. **Flexible Interaction**: Multiple ways to phrase requests
5. **Explanation Depth**: Users can drill down into reasoning
6. **Plugin Ecosystem**: Seamless integration with plugin-sapience for MCP
7. **Extensibility**: Easy to add Discord/Telegram interfaces later
8. **Demo-Friendly**: Clear patterns for others to fork and customize

### For Developers Forking This Agent

This agent provides a complete template for building your own Sapience bots:

**Easy Customization Points:**
```typescript
// 1. Change prediction strategy
async generatePrediction(market) {
  // Replace with your own prediction logic
  // Could use technical analysis, sentiment, etc.
}

// 2. Adjust attestation criteria
if (prediction.confidence > 0.8 && market.liquidity > 1000) {
  // Your custom rules for when to attest
}

// 3. Add new data sources
const customData = await fetchYourAPI(market.question);
prediction = incorporateData(customData);

// 4. Modify loop behavior
const priority = calculateMarketPriority(market);
if (priority === 'HIGH') {
  // Process immediately
}
```

**Extension Ideas:**
- Add Twitter integration to tweet predictions
- Connect to Discord for community alerts
- Implement profit tracking for attestations
- Add machine learning models for predictions
- Create specialized agents for specific categories

### User Benefits

1. **Accessibility**: No technical knowledge required
2. **Transparency**: Clear reasoning for every prediction
3. **Education**: Learn how prediction markets work through interaction
4. **Flexibility**: Explore markets at your own pace
5. **Trust**: Understand the data behind predictions

## Deployment Considerations

### Local Development
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run the agent
npm run dev
```

### Production Deployment
- Can run as CLI interface for direct interaction
- Easily extended to Discord/Telegram with Eliza's built-in clients
- Minimal resource requirements (1 vCPU, 1GB RAM)
- No database required - all state from MCP API

### Cost Estimation
- **OpenAI API**: ~$0.001 per prediction (GPT-4 mini)
- **Infrastructure**: Minimal (can run on free tier services)
- **Gas (optional)**: Only if users choose to submit attestations

## Future Enhancements

1. **Multi-market Comparison**: "Compare markets 147 and 148"
2. **Portfolio Tracking**: Track user's attestation history
3. **Alerts**: Notify when markets meet certain criteria
4. **Batch Analysis**: Analyze multiple related markets
5. **Custom Models**: Fine-tuned prediction models for specific categories

## Conclusion

This specification defines a dual-mode Eliza OS agent that serves both as an interactive assistant and an autonomous attestation bot for Sapience prediction markets. The agent can engage users in natural conversation to explore markets and explain predictions, while also running continuously in the background to automatically attest to all unattested markets.

Key innovations:
- **Hybrid Architecture**: Seamlessly switches between interactive and autonomous modes
- **Developer-Friendly**: Clear patterns and extension points for customization
- **Production-Ready**: Includes error handling, state management, and monitoring
- **Demo Value**: Showcases best practices for building Eliza agents with Sapience

The architecture leverages plugin-sapience for MCP integration while providing a template that developers can fork to create specialized prediction bots with their own strategies, data sources, and attestation criteria. This makes it an ideal starting point for anyone looking to build automated agents for Sapience Protocol.