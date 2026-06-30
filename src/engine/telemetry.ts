/**
 * Telemetry types and mock data generator.
 * Forward-looking seam for measured-vs-modelled overlay.
 */

export interface TelemetryReading {
  nodeId: string;
  timestamp: number;    // Unix ms
  pressure?: number;    // measured pressure (m)
  flow?: number;        // measured flow (LPS)
  level?: number;       // measured tank level (m)
}

export interface TelemetryDataset {
  readings: TelemetryReading[];
  source: string;
  importedAt: string;   // ISO timestamp
}

/**
 * Generate mock telemetry from modelled pressure values.
 * Adds Gaussian noise (±5-10%) to simulate field measurements.
 * @param modelledPressures Map of nodeId → modelled pressure
 * @param coverage Fraction of nodes to include (0-1, default 0.6)
 */
export function generateMockTelemetry(
  modelledPressures: Map<string, number>,
  coverage = 0.6,
): TelemetryDataset {
  const nodeIds = [...modelledPressures.keys()];
  const now = Date.now();

  // Select a random subset of nodes as "monitored"
  const monitoredCount = Math.max(1, Math.round(nodeIds.length * coverage));
  const shuffled = [...nodeIds].sort(() => Math.random() - 0.5);
  const monitored = shuffled.slice(0, monitoredCount);

  const readings: TelemetryReading[] = monitored.map(nodeId => {
    const modelled = modelledPressures.get(nodeId)!;
    // Gaussian-ish noise: ±5% typical, bounded to ±15%
    const noise = (Math.random() - 0.5) * 2 * 0.10; // ±10%
    const measured = modelled * (1 + noise);
    return {
      nodeId,
      timestamp: now,
      pressure: Math.max(0, measured),
    };
  });

  return {
    readings,
    source: 'Mock telemetry (synthetic)',
    importedAt: new Date().toISOString(),
  };
}

/**
 * Parse telemetry CSV into a TelemetryDataset.
 * Expected format: nodeId,timestamp,pressure,flow,level
 */
export function parseTelemetryCsv(csv: string): TelemetryDataset {
  const lines = csv.trim().split('\n');
  const readings: TelemetryReading[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(s => s.trim());
    if (parts.length < 2) continue;

    const reading: TelemetryReading = {
      nodeId: parts[0],
      timestamp: parseInt(parts[1]) || 0,
    };

    if (parts[2] && parts[2] !== '') reading.pressure = parseFloat(parts[2]);
    if (parts[3] && parts[3] !== '') reading.flow = parseFloat(parts[3]);
    if (parts[4] && parts[4] !== '') reading.level = parseFloat(parts[4]);

    readings.push(reading);
  }

  return {
    readings,
    source: 'CSV import',
    importedAt: new Date().toISOString(),
  };
}
