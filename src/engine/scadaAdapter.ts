/**
 * SCADA adapter interface — the contract for a future real-time feed.
 *
 * A production implementation would connect via WebSocket to a SCADA
 * gateway/middleware running server-side. This module defines the shape
 * and provides a MockScadaAdapter that generates synthetic readings.
 *
 * This is a forward-looking architectural seam — no actual SCADA
 * connection is made (browser-only constraint).
 */
import type { TelemetryReading } from './telemetry';

export interface ScadaConfig {
  endpoint: string;               // WebSocket URL (or 'mock://' for mock)
  stationIds: string[];            // SCADA station IDs mapped to network node IDs
  pollIntervalMs: number;          // how often to emit readings
  modelledPressures: Map<string, number>; // modelled values for noise generation
}

export interface ScadaAdapter {
  connect(config: ScadaConfig): Promise<void>;
  disconnect(): void;
  onReading(callback: (reading: TelemetryReading) => void): void;
  isConnected: boolean;
}

/**
 * Mock SCADA adapter — emits synthetic readings on a timer.
 * Readings are based on modelled pressures plus Gaussian noise.
 */
export class MockScadaAdapter implements ScadaAdapter {
  private _connected = false;
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _callback: ((reading: TelemetryReading) => void) | null = null;
  private _config: ScadaConfig | null = null;

  get isConnected(): boolean {
    return this._connected;
  }

  onReading(callback: (reading: TelemetryReading) => void): void {
    this._callback = callback;
  }

  async connect(config: ScadaConfig): Promise<void> {
    this._config = config;
    this._connected = true;

    // Start emitting readings
    this._interval = setInterval(() => {
      if (!this._callback || !this._config) return;
      const stationIds = this._config.stationIds;
      if (stationIds.length === 0) return;

      // Pick a random station and emit a reading
      const nodeId = stationIds[Math.floor(Math.random() * stationIds.length)];
      const modelled = this._config.modelledPressures.get(nodeId) ?? 20;
      const noise = (Math.random() - 0.5) * 2 * 0.08; // ±8%

      const reading: TelemetryReading = {
        nodeId,
        timestamp: Date.now(),
        pressure: Math.max(0, modelled * (1 + noise)),
      };

      this._callback(reading);
    }, config.pollIntervalMs);
  }

  disconnect(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._connected = false;
    this._config = null;
  }
}
