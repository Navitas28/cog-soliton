import { describe, it, expect, vi } from 'vitest';

async function getTelemetry() {
  return import('./telemetry');
}

async function getScada() {
  return import('./scadaAdapter');
}

describe('Phase 13 — Telemetry + SCADA', () => {
  describe('telemetry types and mock generator', () => {
    it('generateMockTelemetry produces readings for subset of nodes', async () => {
      const { generateMockTelemetry } = await getTelemetry();

      const modelledPressures = new Map<string, number>([
        ['J1', 25.0], ['J2', 18.5], ['J3', 30.0], ['J4', 12.0], ['J5', 22.0],
      ]);

      const dataset = generateMockTelemetry(modelledPressures);

      expect(dataset.readings.length).toBeGreaterThan(0);
      expect(dataset.readings.length).toBeLessThanOrEqual(modelledPressures.size);
      expect(dataset.source).toBeDefined();
      expect(dataset.importedAt).toBeDefined();

      // Each reading should reference a valid node
      for (const r of dataset.readings) {
        expect(modelledPressures.has(r.nodeId)).toBe(true);
      }
    });

    it('mock readings have pressure within ±15% of modelled values', async () => {
      const { generateMockTelemetry } = await getTelemetry();

      const modelledPressures = new Map<string, number>([
        ['J1', 25.0], ['J2', 18.5], ['J3', 30.0],
      ]);

      // Run multiple times to check statistical bounds
      for (let trial = 0; trial < 10; trial++) {
        const dataset = generateMockTelemetry(modelledPressures, 1.0); // all nodes
        for (const r of dataset.readings) {
          if (r.pressure !== undefined) {
            const modelled = modelledPressures.get(r.nodeId)!;
            const ratio = r.pressure / modelled;
            expect(ratio).toBeGreaterThan(0.85);
            expect(ratio).toBeLessThan(1.15);
          }
        }
      }
    });

    it('TelemetryDataset can be serialized to/from JSON', async () => {
      const { generateMockTelemetry } = await getTelemetry();

      const modelledPressures = new Map([['J1', 25.0]]);
      const dataset = generateMockTelemetry(modelledPressures, 1.0);

      const json = JSON.stringify(dataset);
      const parsed = JSON.parse(json);

      expect(parsed.readings).toHaveLength(dataset.readings.length);
      expect(parsed.source).toBe(dataset.source);
    });

    it('parseTelemetryCsv loads readings correctly', async () => {
      const { parseTelemetryCsv } = await getTelemetry();

      const csv = `nodeId,timestamp,pressure,flow,level
J1,1000,25.3,5.2,
J2,1000,18.1,,
J1,2000,24.8,5.0,`;

      const dataset = parseTelemetryCsv(csv);

      expect(dataset.readings).toHaveLength(3);
      expect(dataset.readings[0].nodeId).toBe('J1');
      expect(dataset.readings[0].pressure).toBeCloseTo(25.3, 1);
      expect(dataset.readings[0].flow).toBeCloseTo(5.2, 1);
      expect(dataset.readings[1].pressure).toBeCloseTo(18.1, 1);
      expect(dataset.readings[1].flow).toBeUndefined();
    });
  });

  describe('SCADA adapter', () => {
    it('MockScadaAdapter emits readings via callback', async () => {
      const { MockScadaAdapter } = await getScada();

      const adapter = new MockScadaAdapter();
      const readings: any[] = [];

      adapter.onReading((r: any) => readings.push(r));

      const modelledPressures = new Map([['J1', 25.0], ['J2', 18.0]]);
      await adapter.connect({ endpoint: 'mock://', stationIds: ['J1', 'J2'], pollIntervalMs: 50, modelledPressures });

      expect(adapter.isConnected).toBe(true);

      // Wait for at least one emission
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(readings.length).toBeGreaterThan(0);
      expect(readings[0].nodeId).toBeDefined();
      expect(readings[0].pressure).toBeDefined();

      adapter.disconnect();
      expect(adapter.isConnected).toBe(false);
    });

    it('MockScadaAdapter connect/disconnect lifecycle', async () => {
      const { MockScadaAdapter } = await getScada();

      const adapter = new MockScadaAdapter();

      expect(adapter.isConnected).toBe(false);

      await adapter.connect({ endpoint: 'mock://', stationIds: [], pollIntervalMs: 100, modelledPressures: new Map() });
      expect(adapter.isConnected).toBe(true);

      adapter.disconnect();
      expect(adapter.isConnected).toBe(false);
    });
  });
});
