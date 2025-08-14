import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  ActionExample,
  HandlerCallback,
} from "@elizaos/core";
import { stateManager, timeAgo } from "../utils/stateManager.js";

export const dashboardAction: Action = {
  name: "SHOW_DASHBOARD",
  description: "Display attestation activity dashboard and statistics",
  
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    
    const patterns = [
      "show dashboard",
      "dashboard",
      "show activity",
      "show stats",
      "attestation stats",
      "my activity",
      "show progress",
      "show attestations"
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
      elizaLogger.info("Generating attestation dashboard");
      
      // Get current status
      const status = stateManager.getAutonomousStatus();
      const recentAttestations = stateManager.getRecentAttestations(5);
      
      // Simulated total markets count (in production, would fetch from MCP)
      const totalActiveMarkets = 47;
      const coverage = status.attestationCount > 0 
        ? Math.round((status.attestationCount / totalActiveMarkets) * 100) 
        : 0;
      
      // Build dashboard text
      let dashboardText = `📊 **Attestation Dashboard**\n\n`;
      
      // Overall Stats
      dashboardText += `**Overall Stats:**\n`;
      dashboardText += `• Total Active Markets: ${totalActiveMarkets}\n`;
      dashboardText += `• My Attestations: ${status.attestationCount}\n`;
      dashboardText += `• Coverage: ${coverage}%\n`;
      dashboardText += `• Markets Processed: ${status.marketsProcessed}\n`;
      dashboardText += `• Auto Mode: ${status.enabled ? '🟢 Running' : '🔴 Stopped'}\n\n`;
      
      // Configuration
      dashboardText += `**Configuration:**\n`;
      dashboardText += `• Loop Interval: ${Math.round(status.interval / 60000)} minutes\n`;
      dashboardText += `• Batch Size: ${status.batchSize} markets/cycle\n`;
      dashboardText += `• Min Confidence: ${Math.round(status.minConfidence * 100)}%\n\n`;
      
      // Recent Activity
      if (recentAttestations.length > 0) {
        dashboardText += `**Recent Activity:**\n`;
        for (const attestation of recentAttestations) {
          const successIcon = attestation.success ? '✅' : '❌';
          dashboardText += `${successIcon} Market #${attestation.marketId}: ${attestation.prediction}% YES`;
          dashboardText += ` (conf: ${Math.round(attestation.confidence * 100)}%) - ${timeAgo(attestation.timestamp)}\n`;
        }
        dashboardText += `\n`;
      } else {
        dashboardText += `**Recent Activity:**\n`;
        dashboardText += `No attestations yet. Use "start auto mode" or "predict market [ID]" to begin.\n\n`;
      }
      
      // Next Cycle Info
      if (status.enabled) {
        dashboardText += `**Next Cycle:**\n`;
        if (status.nextCycleIn !== undefined) {
          dashboardText += `• Scheduled in ${status.nextCycleIn} seconds\n`;
          
          // Estimate completion
          const estimatedTime = Math.round((status.batchSize * 2) + 5); // 2 seconds per market + overhead
          dashboardText += `• Estimated cycle duration: ~${estimatedTime} seconds\n`;
        } else {
          dashboardText += `• Starting first cycle...\n`;
        }
      } else {
        dashboardText += `**Next Cycle:** Not scheduled (auto mode disabled)\n`;
      }
      
      // Quick Actions
      dashboardText += `\n**Quick Actions:**\n`;
      if (status.enabled) {
        dashboardText += `• "stop auto mode" - Pause autonomous attestation\n`;
        dashboardText += `• "set interval 10 minutes" - Change cycle frequency\n`;
        dashboardText += `• "set confidence 0.8" - Adjust quality threshold\n`;
      } else {
        dashboardText += `• "start auto mode" - Begin autonomous attestation\n`;
        dashboardText += `• "list markets" - See available markets\n`;
        dashboardText += `• "predict market [ID]" - Analyze specific market\n`;
      }
      
      // Performance Metrics
      if (status.attestationCount > 0) {
        const successRate = Math.round((status.attestationCount / status.marketsProcessed) * 100);
        dashboardText += `\n**Performance:**\n`;
        dashboardText += `• Success Rate: ${successRate}% (${status.attestationCount}/${status.marketsProcessed})\n`;
        dashboardText += `• Avg Confidence: ${Math.round(
          recentAttestations.reduce((sum, a) => sum + a.confidence, 0) / recentAttestations.length * 100
        )}%\n`;
      }
      
      if (callback) {
        await callback({
          text: dashboardText
        } as any);
      }
      
      return true;
    } catch (error) {
      elizaLogger.error("Error generating dashboard:");
      console.error(error);
      if (callback) {
        await callback({
          text: "Error generating dashboard. Please try again.",
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
          text: "Show dashboard",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Let me display the attestation activity dashboard...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show my activity",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Here's your attestation activity summary...",
        },
      },
    ],
  ] as ActionExample[][],

  similes: ["SHOW_DASHBOARD", "DASHBOARD", "ACTIVITY_DASHBOARD"],
};