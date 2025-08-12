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

export const predictMarketAction: Action = {
  name: "PREDICT_MARKET",
  description: "Generate a prediction for a specific Sapience market",
  
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    
    // Check for prediction intent with market ID
    const patterns = [
      /predict market (\d+)/i,
      /analyze market (\d+)/i,
      /forecast market (\d+)/i,
      /what do you think about market (\d+)/i,
      /market (\d+) prediction/i,
      /#(\d+)/i,
    ];
    
    return patterns.some(pattern => pattern.test(text));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const text = message.content.text || "";
      
      // Extract market ID
      let marketId: string | null = null;
      const patterns = [
        /predict market (\d+)/i,
        /analyze market (\d+)/i,
        /forecast market (\d+)/i,
        /what do you think about market (\d+)/i,
        /market (\d+) prediction/i,
        /#(\d+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          marketId = match[1];
          break;
        }
      }
      
      if (!marketId) {
        if (callback) {
          await callback({
            text: "Please specify a market ID. For example: 'predict market 147'"
          } as any);
        }
        return false;
      }

      elizaLogger.info(`Generating prediction for market ${marketId}`);

      // Check for user-provided context
      let userContext = "";
      const contextPatterns = [
        /btw,?\s+(.+)/i,
        /context:\s*(.+)/i,
        /additional info:\s*(.+)/i,
        /fyi,?\s+(.+)/i,
      ];
      
      for (const pattern of contextPatterns) {
        const match = text.match(pattern);
        if (match) {
          userContext = match[1];
          break;
        }
      }

      // Simulated market data for testing
      const markets: Market[] = [
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
        }
      ];

      const market = markets.find(m => m.marketId.toString() === marketId);
      
      if (!market) {
        if (callback) {
          await callback({
            text: `I couldn't find market ${marketId}. Use "list markets" to see available options.`
          } as any);
        }
        return false;
      }

      // Check if it's a yes/no market
      if (!market.claimStatementNo) {
        if (callback) {
          await callback({
            text: `Market ${marketId} is not a yes/no prediction market. I can only analyze binary markets.`
          } as any);
        }
        return false;
      }

      // Generate prediction using LLM
      const endDate = new Date(market.endTimestamp * 1000);
      const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      const predictionPrompt = `
        Analyze this prediction market and provide your assessment:
        
        Question: ${market.question}
        Resolution Date: ${endDate.toISOString()} (${daysRemaining} days remaining)
        ${userContext ? `\nAdditional context from user: ${userContext}` : ''}
        
        Based on your knowledge (you can search the web if needed for recent events):
        1. Provide your probability assessment (0-100) that the answer is YES
        2. Explain your key reasoning points (be specific and data-driven where possible)
        3. Note any important risk factors or uncertainties
        4. Rate your confidence level (1-10)
        
        Be transparent about any limitations in your knowledge or if the question involves future events that are highly uncertain.
        
        Respond in JSON format:
        {
          "probability": <number 0-100>,
          "reasoning": "<detailed explanation>",
          "risks": ["<risk 1>", "<risk 2>", ...],
          "confidence": <number 1-10>
        }
      `;

      const predictionResponse = await generateText({
        runtime,
        context: predictionPrompt,
        modelClass: ModelClass.LARGE,
      });

      let prediction: Prediction;
      try {
        prediction = JSON.parse(predictionResponse);
      } catch (e) {
        // Fallback prediction if LLM fails
        prediction = {
          probability: 50,
          reasoning: "Unable to generate detailed prediction at this time. Market appears balanced.",
          risks: ["Prediction generation failed", "Using default 50% probability"],
          confidence: 1
        };
      }

      // Generate attestation calldata
      const calldata = await buildAttestationCalldata(market, prediction);
      
      // Format response
      let response_text = `Analyzing Market #${market.marketId}: "${market.question}"\n\n`;
      response_text += `📊 Market Data:\n`;
      response_text += `   • Ends in ${daysRemaining} days\n`;
      response_text += `   • Category: ${market.category || 'General'}\n\n`;
      
      response_text += `🎯 My Prediction: ${prediction.probability}% YES\n\n`;
      
      response_text += `📈 Analysis:\n${prediction.reasoning}\n\n`;
      
      if (prediction.risks && prediction.risks.length > 0) {
        response_text += `⚠️ Risk Factors:\n`;
        prediction.risks.forEach(risk => {
          response_text += `• ${risk}\n`;
        });
        response_text += `\n`;
      }
      
      response_text += `Confidence: ${prediction.confidence}/10\n\n`;
      
      if (calldata) {
        response_text += `💾 Attestation Calldata:\n`;
        response_text += `\`\`\`\n`;
        response_text += `To: ${calldata.to}\n`;
        response_text += `Data: ${calldata.data.substring(0, 66)}...\n`;
        response_text += `Chain: ${calldata.chainId} (${calldata.chainId === 8453 ? 'Base' : 'Other'})\n`;
        response_text += `\`\`\`\n\n`;
        response_text += `This calldata will attest "${prediction.probability}% YES" on-chain.`;
      }

      if (callback) {
        await callback({
          text: response_text
        } as any);
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error generating prediction:");
      console.error(error);
      if (callback) {
        await callback({
          text: "I encountered an error while generating the prediction. Please try again.",
          error: true
        } as any);
      }
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Predict market 147",
        },
      },
      {
        user: "Sage",
        content: {
          text: "I'll analyze market 147 and provide my prediction with detailed reasoning...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What do you think about market 42?",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Let me examine market 42 and generate a probability assessment for you...",
        },
      },
    ],
  ] as ActionExample[][],

  similes: ["PREDICT_MARKET", "ANALYZE_MARKET", "FORECAST_MARKET"],
};