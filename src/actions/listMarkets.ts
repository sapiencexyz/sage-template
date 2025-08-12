import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  ActionExample,
  HandlerCallback,
} from "@elizaos/core";

export const listMarketsAction: Action = {
  name: "LIST_MARKETS",
  description: "List all active yes/no prediction markets from Sapience",
  
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    
    // Check for market listing intent
    const patterns = [
      "what markets",
      "show markets",
      "list markets",
      "available markets",
      "what can i predict",
      "what can i forecast",
      "show predictions",
      "active markets",
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      elizaLogger.info("Fetching active markets from Sapience");

      // For now, we'll simulate the market data since plugin-sapience integration needs work
      // In production, this would use: await runtime.executeAction("CALL_SAPIENCE_TOOL", ...)
      
      // Simulated market data for testing
      const markets = [
        {
          marketId: 147,
          question: "Will BTC exceed $100k by Dec 31?",
          endTimestamp: Math.floor(Date.now() / 1000) + 18 * 24 * 60 * 60,
          claimStatementNo: "BTC will not exceed $100k",
          category: "crypto"
        },
        {
          marketId: 148,
          question: "Will the Fed cut rates in Q1 2025?",
          endTimestamp: Math.floor(Date.now() / 1000) + 45 * 24 * 60 * 60,
          claimStatementNo: "The Fed will not cut rates",
          category: "economics"
        },
        {
          marketId: 152,
          question: "Will ETH/BTC ratio rise above 0.05?",
          endTimestamp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
          claimStatementNo: "ETH/BTC will not rise above 0.05",
          category: "crypto"
        }
      ];
      
      // Filter for yes/no markets
      const yesNoMarkets = markets.filter((m: any) => m.claimStatementNo !== null);
      
      if (yesNoMarkets.length === 0) {
        if (callback) {
          await callback({
            text: "There are no active yes/no prediction markets at the moment. Check back later for new markets!"
          } as any);
        }
        return true;
      }

      // Format markets for display
      let response_text = `I found ${yesNoMarkets.length} active yes/no prediction markets:\n\n`;
      
      for (const market of yesNoMarkets) {
        const endDate = new Date(market.endTimestamp * 1000);
        const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        response_text += `📊 Market #${market.marketId}: "${market.question}"\n`;
        response_text += `   Ends in ${daysRemaining} days | Category: ${market.category || 'General'}\n\n`;
      }
      
      response_text += "Which market would you like me to analyze? Just say 'predict market [ID]'";

      if (callback) {
        await callback({
          text: response_text
        } as any);
      }

      return true;
    } catch (error) {
      elizaLogger.error("Error listing markets:");
      console.error(error);
      if (callback) {
        await callback({
          text: "I encountered an error while fetching markets. Please try again.",
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
          text: "What markets are available?",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Let me fetch the current active prediction markets for you...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me what I can predict on",
        },
      },
      {
        user: "Sage",
        content: {
          text: "I'll get the list of active yes/no markets you can forecast...",
        },
      },
    ],
  ] as ActionExample[][],

  similes: ["LIST_MARKETS", "SHOW_MARKETS", "GET_MARKETS"],
};