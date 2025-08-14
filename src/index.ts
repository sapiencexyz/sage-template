import { AgentRuntime, elizaLogger, defaultCharacter, ModelProviderName, CacheManager } from "@elizaos/core";
import { DirectClient } from "@elizaos/client-direct";
// Temporarily comment out plugin-sapience until types are fixed
// import { sapiencePlugin } from "@elizaos/plugin-sapience";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { createHash } from "crypto";

// Import custom actions
import { listMarketsAction } from "./actions/listMarkets.js";
import { predictMarketAction } from "./actions/predictMarket.js";
import { autoAttestAction } from "./actions/autoAttest.js";
import { loopControlAction } from "./actions/loopControl.js";
import { dashboardAction } from "./actions/dashboard.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load character
const characterPath = join(__dirname, "..", "character.json");
const character = JSON.parse(fs.readFileSync(characterPath, "utf-8"));

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  elizaLogger.error("OPENAI_API_KEY is required in .env file");
  process.exit(1);
}

// Generate a deterministic agent ID from character name
function generateAgentId(name: string): `${string}-${string}-${string}-${string}-${string}` {
  const hash = createHash('sha256').update(name).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}` as `${string}-${string}-${string}-${string}-${string}`;
}

async function main() {
  elizaLogger.info("Starting Sage - Sapience Prediction Agent");

  try {
    const agentId = generateAgentId(character.name);
    
    // Create database adapter (in-memory for now)
    const databaseAdapter = null as any; // Will use default in-memory adapter

    // Create cache manager
    const cacheManager = new CacheManager({} as any);

    // Create runtime with character
    const runtime = new AgentRuntime({
      character: { ...defaultCharacter, ...character },
      modelProvider: (character.modelProvider || "openai") as ModelProviderName,
      conversationLength: 32,
      agentId,
      databaseAdapter,
      cacheManager,
      token: process.env.OPENAI_API_KEY || "dummy-token",
      serverUrl: "http://localhost:3000",
      actions: [
        // Custom actions for market interaction
        listMarketsAction,
        predictMarketAction,
        // Autonomous mode actions
        autoAttestAction,
        loopControlAction,
        dashboardAction,
      ],
      plugins: [
        // Temporarily disabled until types are fixed
        // sapiencePlugin,
      ],
    });

    // Initialize the runtime
    await runtime.initialize();
    
    elizaLogger.info("Sage is ready for conversation!");
    elizaLogger.info("Ask about available markets or request predictions");
    elizaLogger.info("\nInteractive Commands:");
    elizaLogger.info("  - 'What markets are available?'");
    elizaLogger.info("  - 'Predict market 147'");
    elizaLogger.info("  - 'Predict market 148 - btw, there's a major announcement tomorrow'");
    elizaLogger.info("\nAutonomous Mode Commands:");
    elizaLogger.info("  - 'Start auto mode' - Begin continuous attestation");
    elizaLogger.info("  - 'Show dashboard' - View activity and stats");
    elizaLogger.info("  - 'Stop auto mode' - Pause autonomous operation");

    // Start the CLI client for direct interaction
    const client = new DirectClient();
    await (client as any).start(runtime);

  } catch (error) {
    elizaLogger.error("Failed to start agent:");
    console.error(error);
    process.exit(1);
  }
}

// Run the agent
main().catch((error) => {
  elizaLogger.error("Fatal error:");
  console.error(error);
  process.exit(1);
});