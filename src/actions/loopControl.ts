import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  ActionExample,
  HandlerCallback,
} from "@elizaos/core";
import { stateManager } from "../utils/stateManager.js";

export const loopControlAction: Action = {
  name: "LOOP_CONTROL",
  description: "Control and configure the autonomous attestation loop",
  
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    
    const patterns = [
      "stop auto",
      "stop loop",
      "pause auto",
      "disable auto",
      "auto mode off",
      "set interval",
      "set confidence",
      "set batch",
      "loop status",
      "auto status",
      "show status"
    ];
    
    return patterns.some(pattern => text.includes(pattern));
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    try {
      const text = message.content.text?.toLowerCase() || "";
      
      // Stop command
      if (text.includes("stop") || text.includes("pause") || text.includes("disable") || text.includes("off")) {
        if (!stateManager.isAutonomousEnabled()) {
          if (callback) {
            await callback({
              text: "Autonomous mode is not currently running."
            } as any);
          }
          return true;
        }
        
        // Stop the loop
        stateManager.setAutonomousEnabled(false);
        const loopId = stateManager.getLoopId();
        if (loopId) {
          clearInterval(loopId);
          stateManager.setLoopId(undefined);
        }
        
        const stats = stateManager.getAutonomousStatus();
        
        if (callback) {
          await callback({
            text: `🔴 Autonomous mode stopped

Summary:
• Markets processed: ${stats.marketsProcessed}
• Attestations made: ${stats.attestationCount}
• Run time: ${stats.lastCycleTime ? new Date(stats.lastCycleTime).toLocaleTimeString() : 'N/A'}

Use "start auto mode" to resume.`
          } as any);
        }
        return true;
      }
      
      // Set interval command
      if (text.includes("set interval")) {
        const match = text.match(/(\d+)\s*(minute|min|m|second|sec|s)/i);
        if (!match) {
          if (callback) {
            await callback({
              text: "Please specify an interval. Example: 'set interval 10 minutes'"
            } as any);
          }
          return false;
        }
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        let milliseconds = value * 1000; // Default to seconds
        
        if (unit.startsWith('m')) {
          milliseconds = value * 60 * 1000;
        }
        
        // Validate range (min 30 seconds, max 60 minutes)
        if (milliseconds < 30000) {
          if (callback) {
            await callback({
              text: "Interval must be at least 30 seconds."
            } as any);
          }
          return false;
        }
        
        if (milliseconds > 3600000) {
          if (callback) {
            await callback({
              text: "Interval cannot exceed 60 minutes."
            } as any);
          }
          return false;
        }
        
        stateManager.setInterval(milliseconds);
        
        // If running, restart with new interval
        if (stateManager.isAutonomousEnabled()) {
          const oldLoopId = stateManager.getLoopId();
          if (oldLoopId) {
            clearInterval(oldLoopId);
          }
          
          const newLoopId = setInterval(() => {
            if (stateManager.isAutonomousEnabled()) {
              elizaLogger.info("Loop control: triggering cycle");
              // In production, would call processCycle from autoAttest
            }
          }, milliseconds);
          
          stateManager.setLoopId(newLoopId);
        }
        
        const displayValue = milliseconds >= 60000 
          ? `${Math.round(milliseconds / 60000)} minutes` 
          : `${Math.round(milliseconds / 1000)} seconds`;
        
        if (callback) {
          await callback({
            text: `✅ Interval updated to ${displayValue}${stateManager.isAutonomousEnabled() ? ' (will apply on next cycle)' : ''}`
          } as any);
        }
        return true;
      }
      
      // Set confidence command
      if (text.includes("set confidence")) {
        const match = text.match(/(0?\.\d+|\d+(\.\d+)?)/);
        if (!match) {
          if (callback) {
            await callback({
              text: "Please specify a confidence threshold between 0 and 1. Example: 'set confidence 0.7'"
            } as any);
          }
          return false;
        }
        
        let confidence = parseFloat(match[1]);
        
        // If user provides percentage, convert to decimal
        if (confidence > 1) {
          confidence = confidence / 100;
        }
        
        if (confidence < 0 || confidence > 1) {
          if (callback) {
            await callback({
              text: "Confidence threshold must be between 0 and 1."
            } as any);
          }
          return false;
        }
        
        stateManager.setMinConfidence(confidence);
        
        if (callback) {
          await callback({
            text: `✅ Confidence threshold updated to ${confidence} (${Math.round(confidence * 100)}%)

Markets with confidence below this threshold will be skipped.`
          } as any);
        }
        return true;
      }
      
      // Set batch size command
      if (text.includes("set batch")) {
        const match = text.match(/(\d+)/);
        if (!match) {
          if (callback) {
            await callback({
              text: "Please specify a batch size. Example: 'set batch size 10'"
            } as any);
          }
          return false;
        }
        
        const batchSize = parseInt(match[1]);
        
        if (batchSize < 1 || batchSize > 50) {
          if (callback) {
            await callback({
              text: "Batch size must be between 1 and 50 markets."
            } as any);
          }
          return false;
        }
        
        stateManager.setBatchSize(batchSize);
        
        if (callback) {
          await callback({
            text: `✅ Batch size updated to ${batchSize} markets per cycle`
          } as any);
        }
        return true;
      }
      
      // Status command (default)
      const status = stateManager.getAutonomousStatus();
      
      let statusText = `📊 **Autonomous Mode Status**\n\n`;
      statusText += `Status: ${status.enabled ? '🟢 Running' : '🔴 Stopped'}\n`;
      statusText += `Interval: ${Math.round(status.interval / 60000)} minutes\n`;
      statusText += `Batch Size: ${status.batchSize} markets per cycle\n`;
      statusText += `Min Confidence: ${status.minConfidence} (${Math.round(status.minConfidence * 100)}%)\n\n`;
      
      if (status.enabled) {
        statusText += `**Activity:**\n`;
        statusText += `Markets Processed: ${status.marketsProcessed}\n`;
        statusText += `Attestations Made: ${status.attestationCount}\n`;
        
        if (status.lastCycleTime) {
          statusText += `Last Cycle: ${new Date(status.lastCycleTime).toLocaleTimeString()}\n`;
          
          if (status.nextCycleIn !== undefined) {
            statusText += `Next Cycle: in ${status.nextCycleIn} seconds\n`;
          }
        } else {
          statusText += `Last Cycle: Not yet run\n`;
        }
      } else {
        statusText += `\nUse "start auto mode" to begin autonomous attestation.`;
      }
      
      if (callback) {
        await callback({
          text: statusText
        } as any);
      }
      
      return true;
    } catch (error) {
      elizaLogger.error("Error in loop control:");
      console.error(error);
      if (callback) {
        await callback({
          text: "Error processing loop control command.",
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
          text: "Stop auto mode",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Stopping autonomous attestation mode...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Set interval 10 minutes",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Updating loop interval to 10 minutes...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Set confidence 0.8",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Setting confidence threshold to 0.8 (80%)...",
        },
      },
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show status",
        },
      },
      {
        user: "Sage",
        content: {
          text: "Let me check the autonomous mode status...",
        },
      },
    ],
  ] as ActionExample[][],

  similes: ["LOOP_CONTROL", "AUTO_CONTROL", "LOOP_CONFIG"],
};