import { AgentRuntime, elizaLogger, defaultCharacter, SqliteDatabaseAdapter, CacheManager, ModelProviderName } from "@elizaos/core";
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
    
    // Create database adapter (using SQLite)
    const databaseAdapter = new SqliteDatabaseAdapter({
      db: null as any, // Will be initialized by adapter
      runtime: null as any, // Will be set by runtime
    });

    // Create runtime with character
    const runtime = new AgentRuntime({
      character: { ...defaultCharacter, ...character },
      modelProvider: (character.modelProvider || "openai") as ModelProviderName,
      conversationLength: 32,
      agentId,
      databaseAdapter,
      token: process.env.OPENAI_API_KEY || "dummy-token",
      serverUrl: "http://localhost:3000",
      actions: [
        // Custom actions for market interaction
        listMarketsAction,
        predictMarketAction,
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
    elizaLogger.info("\nTry these commands:");
    elizaLogger.info("  - 'What markets are available?'");
    elizaLogger.info("  - 'Predict market 147'");
    elizaLogger.info("  - 'Predict market 148 - btw, there's a major announcement tomorrow'");

    // Start the CLI client for direct interaction
    const client = new DirectClient();
    await client.start(runtime);

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