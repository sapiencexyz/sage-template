import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { encodeFunctionData } from "viem";
import { elizaLogger } from "@elizaos/core";

// EAS contract addresses by chain
const EAS_CONTRACTS: Record<number, string> = {
  1: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',     // Ethereum Mainnet
  11155111: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e', // Sepolia
  10: '0x4200000000000000000000000000000000000021',    // Optimism
  8453: '0x4200000000000000000000000000000000000021',  // Base
  42161: '0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458',  // Arbitrum
};

// Prediction market schema
const SCHEMA_ID = '0x2dbb0921fa38ebc044ab0a7fe109442c456fb9ad39a68ce0a32f193744d17744';
const SCHEMA = 'address marketAddress,uint256 marketId,bytes32 questionId,uint160 prediction,string comment';

// EAS ABI for attestation
const EAS_ABI = [
  {
    name: 'attest',
    type: 'function',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'schema', type: 'bytes32' },
          {
            name: 'data',
            type: 'tuple',
            components: [
              { name: 'recipient', type: 'address' },
              { name: 'expirationTime', type: 'uint64' },
              { name: 'revocable', type: 'bool' },
              { name: 'refUID', type: 'bytes32' },
              { name: 'data', type: 'bytes' },
              { name: 'value', type: 'uint256' }
            ]
          }
        ]
      }
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'payable'
  }
] as const;

interface Market {
  marketId: number;
  address: string;
  question: string;
}

interface Prediction {
  probability: number;
  reasoning: string;
  confidence: number;
}

export interface AttestationCalldata {
  to: string;
  data: string;
  value: string;
  chainId: number;
  description: string;
}

export async function buildAttestationCalldata(
  market: Market,
  prediction: Prediction,
  chainId: number = 8453 // Default to Base
): Promise<AttestationCalldata | null> {
  try {
    const encoder = new SchemaEncoder(SCHEMA);
    
    // Convert probability (0-100) to uint160 (0-160 scale used by Sapience)
    const predictionValue = Math.round(prediction.probability * 160 / 100);
    
    // Create a short comment from reasoning
    const comment = prediction.reasoning.length > 200 
      ? prediction.reasoning.substring(0, 197) + "..."
      : prediction.reasoning;
    
    // Encode the attestation data
    const encodedData = encoder.encodeData([
      { name: 'marketAddress', value: market.address, type: 'address' },
      { name: 'marketId', value: market.marketId, type: 'uint256' },
      { name: 'questionId', value: '0x0000000000000000000000000000000000000000000000000000000000000000', type: 'bytes32' }, // Placeholder
      { name: 'prediction', value: predictionValue, type: 'uint160' },
      { name: 'comment', value: comment, type: 'string' }
    ]);
    
    // Build the attestation request
    const attestationRequest = {
      schema: SCHEMA_ID as `0x${string}`,
      data: {
        recipient: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        expirationTime: 0n,
        revocable: false,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData as `0x${string}`,
        value: 0n
      }
    };
    
    // Encode the function call
    const calldata = encodeFunctionData({
      abi: EAS_ABI,
      functionName: 'attest',
      args: [attestationRequest]
    });
    
    const easAddress = EAS_CONTRACTS[chainId];
    if (!easAddress) {
      elizaLogger.warn(`No EAS contract for chain ${chainId}`);
      return null;
    }
    
    return {
      to: easAddress,
      data: calldata,
      value: '0',
      chainId,
      description: `Attest: ${prediction.probability}% YES for market ${market.marketId}`
    };
  } catch (error) {
    elizaLogger.error("Error building attestation calldata:");
    console.error(error);
    return null;
  }
}