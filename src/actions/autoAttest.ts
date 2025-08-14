import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  ActionExample,
  HandlerCallback,
  generateText,
  ModelClass,
} from "@elizaos/core";
import { stateManager } from "../utils/stateManager.js";
import { buildAttestationCalldata } from "../utils/eas.js";

interface Market {
  marketId: number;
  question: string;
  endTimestamp: number;
  address: string;
  claimStatementYesOrNumeric?: string;
  claimStatementNo?: string;
  category?: string;
}

interface Prediction {
  probability: number;
  reasoning: string;
  risks: string[];
  confidence: number;
}

async function generatePrediction(
  runtime: IAgentRuntime,
  market: Market
): Promise<Prediction> {
  const endDate = new Date(market.endTimestamp * 1000);
  const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  const predictionPrompt = `
    Analyze this prediction market for autonomous attestation:
    
    Question: ${market.question}
    Resolution Date: ${endDate.toISOString()} (${daysRemaining} days remaining)
    Category: ${market.category || 'General'}
    
    Generate a prediction for this market. Be analytical and data-driven.
    Consider recent events and trends relevant to this question.
    
    Respond in JSON format:
    {
      "probability": <number 0-100>,
      "reasoning": "<brief explanation, max 200 chars>",
      "risks": ["<risk 1>", "<risk 2>"],
      "confidence": <number 0-1, decimal>
    }
  `;

  try {
    const response = await generateText({
      runtime,
      context: predictionPrompt,
      modelClass: ModelClass.SMALL, // Use faster model for autonomous mode
    } as any);

    const prediction = JSON.parse(response);
    // Normalize confidence to 0-1 range if needed
    if (prediction.confidence > 1) {
      prediction.confidence = prediction.confidence / 10;
    }
    return prediction;
  } catch (error) {
    elizaLogger.error(`Failed to generate prediction for market ${market.marketId}:`);
    console.error(error);
    return {
      probability: 50,
      reasoning: "Unable to generate prediction",
      risks: ["Prediction generation failed"],
      confidence: 0.1
    };
  }
}

async function processCycle(runtime: IAgentRuntime): Promise<void> {
  elizaLogger.info("Starting autonomous attestation cycle");
  
  try {
    // Simulated market data (in production, would use MCP tools)
    const allMarkets: Market[] = [
      {
        marketId: 147,
        question: "Will BTC exceed $100k by Dec 31?",
        endTimestamp: Math.floor(Date.now() / 1000) + 18 * 24 * 60 * 60,
        address: "0x1234567890123456789012345678901234567890",
        claimStatementNo: "BTC will not exceed $100k",
        category: "crypto"
      },
      {
        marketId: 148,
        question: "Will the Fed cut rates in Q1 2025?",
        endTimestamp: Math.floor(Date.now() / 1000) + 45 * 24 * 60 * 60,
        address: "0x2345678901234567890123456789012345678901",
        claimStatementNo: "The Fed will not cut rates",
        category: "economics"
      },
      {
        marketId: 152,
        question: "Will ETH/BTC ratio rise above 0.05?",
        endTimestamp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        address: "0x3456789012345678901234567890123456789012",
        claimStatementNo: "ETH/BTC will not rise above 0.05",
        category: "crypto"
      },
      {
        marketId: 155,
        question: "Will Tesla stock reach $300 by end of year?",
        endTimestamp: Math.floor(Date.now() / 1000) + 20 * 24 * 60 * 60,
        address: "0x4567890123456789012345678901234567890123",
        claimStatementNo: "Tesla will not reach $300",
        category: "stocks"
      },
      {
        marketId: 167,
        question: "Will inflation drop below 3% by March?",
        endTimestamp: Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60,
        address: "0x5678901234567890123456789012345678901234",
        claimStatementNo: "Inflation will not drop below 3%",
        category: "economics"
      }
    ];

    // Filter for yes/no markets
    const yesNoMarkets = allMarkets.filter(m => m.claimStatementNo);
    
    // Get recent attestations to avoid duplicates
    const recentAttestations = stateManager.getRecentAttestations(100);
    const attestedMarketIds = new Set(recentAttestations.map(a => a.marketId));
    
    // Find unattested markets
    const unattested = yesNoMarkets.filter(m => !attestedMarketIds.has(m.marketId));
    
    if (unattested.length === 0) {
      elizaLogger.info("No unattested markets found");
      stateManager.updateLastCycleTime();
      return;
    }

    elizaLogger.info(`Found ${unattested.length} unattested markets`);
    
    // Process in batches
    const batchSize = stateManager.getBatchSize();
    const minConfidence = stateManager.getMinConfidence();
    const batch = unattested.slice(0, batchSize);
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const market of batch) {
      elizaLogger.info(`Processing market ${market.marketId}: ${market.question}`);
      
      // Generate prediction
      const prediction = await generatePrediction(runtime, market);
      
      // Check confidence threshold
      if (prediction.confidence < minConfidence) {
        elizaLogger.info(`Skipping market ${market.marketId} - confidence ${prediction.confidence} below threshold ${minConfidence}`);
        skipCount++;
        continue;
      }
      
      // Build attestation calldata
      const calldata = await buildAttestationCalldata(market, prediction);
      
      if (calldata) {
        // Record attestation (in production, would submit on-chain)
        stateManager.addAttestationRecord({
          marketId: market.marketId,
          prediction: prediction.probability,
          confidence: prediction.confidence,
          success: true
        });
        
        elizaLogger.info(`Attestation prepared for market ${market.marketId}: ${prediction.probability}% YES (confidence: ${prediction.confidence})`);
        successCount++;
      } else {
        elizaLogger.error(`Failed to build attestation for market ${market.marketId}`);
      }
      
      // Small delay between markets to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Update statistics
    stateManager.incrementMarketsProcessed(batch.length);
    stateManager.updateLastCycleTime();
    
    elizaLogger.info(`Cycle complete: ${successCount} attestations, ${skipCount} skipped (low confidence)`);
    
  } catch (error) {
    elizaLogger.error("Autonomous cycle failed:");
    console.error(error);
  }
}

export const autoAttestAction: Action = {
  name: "AUTO_ATTEST",
  description: "Start or manage autonomous attestation loop",
  
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    
    const patterns = [
      "start auto",
      "begin auto",
      "start loop",
      "begin loop",
      "run continuously",
      "autonomous mode",
      "auto mode on",
      "enable auto"
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const text = message.content.text?.toLowerCase() || "";
      
      // Check if already running
      if (stateManager.isAutonomousEnabled()) {
        if (callback) {
          await callback({
            text: "Autonomous mode is already running. Use 'stop auto mode' to stop it first."
          });
        }
        return true;
      }
      
      // Parse interval if provided
      let interval = stateManager.getInterval();
      const intervalMatch = text.match(/(\d+)\s*(minute|min|m)/i);
      if (intervalMatch) {
        const minutes = parseInt(intervalMatch[1]);
        if (minutes > 0 && minutes <= 60) {
          interval = minutes * 60 * 1000;
          stateManager.setInterval(interval);
        }
      }
      
      // Enable autonomous mode
      stateManager.setAutonomousEnabled(true);
      
      // Run first cycle immediately
      await processCycle(runtime);
      
      // Set up interval for future cycles
      const loopId = setInterval(() => {
        if (stateManager.isAutonomousEnabled()) {
          processCycle(runtime);
        } else {
          const currentLoopId = stateManager.getLoopId();
          if (currentLoopId) {
            clearInterval(currentLoopId);
            stateManager.setLoopId(undefined);
          }
        }
      }, interval);
      
      stateManager.setLoopId(loopId);
      
      const intervalMinutes = Math.round(interval / 60000);
      const response = `✅ Autonomous attestation mode activated

• Interval: ${intervalMinutes} minutes
• Confidence threshold: ${stateManager.getMinConfidence()}
• Batch size: ${stateManager.getBatchSize()} markets per cycle

I'll now continuously monitor and attest to unattested markets. 
You can check my progress with "show status" or stop me with "stop auto mode".`;
      
      if (callback) {
        await callback({
          text: response
        });
      }
      
      return true;
    } catch (error) {
      elizaLogger.error("Error starting autonomous mode:");
      console.error(error);
      
      stateManager.setAutonomousEnabled(false);
      
      if (callback) {
        await callback({
          text: "Failed to start autonomous mode. Please try again."
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Start auto mode",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Starting autonomous attestation mode...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Begin loop with 10 minute interval",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Activating autonomous mode with 10 minute intervals...",
        },
      },
    ],
  ] as ActionExample[][],

  similes: ["AUTO_ATTEST", "START_LOOP", "AUTONOMOUS_MODE"],
};