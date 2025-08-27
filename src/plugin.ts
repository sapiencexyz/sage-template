import { Plugin } from "@elizaos/core";
import { attestMarketAction } from "./actions/attestMarket.js";
import { autonomousModeAction } from "./actions/autonomousMode.js";

// Custom plugin for agent-specific attestation logic
// Works alongside @elizaos/plugin-sapience for data access and transaction submission
export const customActionsPlugin: Plugin = {
  name: "sage-custom-actions",
  description: "Custom attestation logic for Sage prediction agent",
  
  // Custom actions for attestation and autonomous mode control
  actions: [
    attestMarketAction,
    autonomousModeAction
  ],
  
  // No providers - we use sapience plugin for data
  providers: [],
  
  // Temporarily disable service to avoid initialization error
  // AttestationService will be started manually by autonomousModeAction
  services: [],
  
  evaluators: [],
};

export default customActionsPlugin;