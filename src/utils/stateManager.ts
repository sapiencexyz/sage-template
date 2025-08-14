import { elizaLogger } from "@elizaos/core";

interface AutonomousState {
  enabled: boolean;
  loopId?: NodeJS.Timeout;
  interval: number;
  batchSize: number;
  minConfidence: number;
  lastCycleTime?: number;
  marketsProcessed: number;
  attestationCount: number;
  attestationHistory: AttestationRecord[];
}

interface AttestationRecord {
  marketId: number;
  prediction: number;
  confidence: number;
  timestamp: number;
  success: boolean;
}

class StateManager {
  private state: Map<string, any> = new Map();
  private autonomousState: AutonomousState;

  constructor() {
    this.autonomousState = {
      enabled: false,
      interval: 300000, // 5 minutes default
      batchSize: 5,
      minConfidence: 0.6,
      marketsProcessed: 0,
      attestationCount: 0,
      attestationHistory: []
    };
  }

  // Generic state management
  set(key: string, value: any): void {
    this.state.set(key, value);
    elizaLogger.debug(`State updated: ${key} = ${JSON.stringify(value)}`);
  }

  get(key: string): any {
    return this.state.get(key);
  }

  delete(key: string): boolean {
    return this.state.delete(key);
  }

  // Autonomous mode specific methods
  setAutonomousEnabled(enabled: boolean): void {
    this.autonomousState.enabled = enabled;
    if (!enabled && this.autonomousState.loopId) {
      clearInterval(this.autonomousState.loopId);
      this.autonomousState.loopId = undefined;
    }
  }

  isAutonomousEnabled(): boolean {
    return this.autonomousState.enabled;
  }

  setLoopId(loopId: NodeJS.Timeout | undefined): void {
    this.autonomousState.loopId = loopId;
  }

  getLoopId(): NodeJS.Timeout | undefined {
    return this.autonomousState.loopId;
  }

  setInterval(interval: number): void {
    this.autonomousState.interval = interval;
  }

  getInterval(): number {
    return this.autonomousState.interval;
  }

  setBatchSize(size: number): void {
    this.autonomousState.batchSize = size;
  }

  getBatchSize(): number {
    return this.autonomousState.batchSize;
  }

  setMinConfidence(confidence: number): void {
    this.autonomousState.minConfidence = Math.max(0, Math.min(1, confidence));
  }

  getMinConfidence(): number {
    return this.autonomousState.minConfidence;
  }

  updateLastCycleTime(): void {
    this.autonomousState.lastCycleTime = Date.now();
  }

  getLastCycleTime(): number | undefined {
    return this.autonomousState.lastCycleTime;
  }

  incrementMarketsProcessed(count: number): void {
    this.autonomousState.marketsProcessed += count;
  }

  getMarketsProcessed(): number {
    return this.autonomousState.marketsProcessed;
  }

  addAttestationRecord(record: Omit<AttestationRecord, 'timestamp'>): void {
    const fullRecord: AttestationRecord = {
      ...record,
      timestamp: Date.now()
    };
    
    this.autonomousState.attestationHistory.push(fullRecord);
    
    // Keep only last 100 records
    if (this.autonomousState.attestationHistory.length > 100) {
      this.autonomousState.attestationHistory = 
        this.autonomousState.attestationHistory.slice(-100);
    }
    
    if (record.success) {
      this.autonomousState.attestationCount++;
    }
  }

  getAttestationCount(): number {
    return this.autonomousState.attestationCount;
  }

  getRecentAttestations(limit: number = 5): AttestationRecord[] {
    return this.autonomousState.attestationHistory
      .slice(-limit)
      .reverse();
  }

  getAutonomousStatus(): {
    enabled: boolean;
    interval: number;
    batchSize: number;
    minConfidence: number;
    lastCycleTime?: number;
    marketsProcessed: number;
    attestationCount: number;
    nextCycleIn?: number;
  } {
    const status = {
      enabled: this.autonomousState.enabled,
      interval: this.autonomousState.interval,
      batchSize: this.autonomousState.batchSize,
      minConfidence: this.autonomousState.minConfidence,
      lastCycleTime: this.autonomousState.lastCycleTime,
      marketsProcessed: this.autonomousState.marketsProcessed,
      attestationCount: this.autonomousState.attestationCount,
      nextCycleIn: undefined as number | undefined
    };

    if (status.enabled && status.lastCycleTime) {
      const timeSinceLastCycle = Date.now() - status.lastCycleTime;
      const timeUntilNextCycle = Math.max(0, status.interval - timeSinceLastCycle);
      status.nextCycleIn = Math.round(timeUntilNextCycle / 1000);
    }

    return status;
  }

  reset(): void {
    this.state.clear();
    this.autonomousState = {
      enabled: false,
      interval: 300000,
      batchSize: 5,
      minConfidence: 0.6,
      marketsProcessed: 0,
      attestationCount: 0,
      attestationHistory: []
    };
  }
}

// Singleton instance
export const stateManager = new StateManager();

// Helper function to format time ago
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}