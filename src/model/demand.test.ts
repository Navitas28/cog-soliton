import { describe, it, expect, beforeEach } from 'vitest';
import { computeBaseDemand, validatePatternAverage, DEFAULT_DIURNAL_PATTERN } from './demand';
import { useNetworkStore } from '../store/networkStore';

// computeFireDemand will be implemented — import once it exists
// import { computeFireDemand } from './demand';

describe('Phase 10 — Demand & Pattern Editing', () => {
  describe('computeBaseDemand', () => {
    it('1000 pop × 135 lpcd → 1.5625 LPS', () => {
      expect(computeBaseDemand(1000, 135)).toBeCloseTo(1.5625, 4);
    });

    it('0 population → 0 LPS', () => {
      expect(computeBaseDemand(0, 135)).toBe(0);
    });
  });

  describe('computeFireDemand', () => {
    it('100k population → ~16.67 LPS', async () => {
      // Dynamic import to avoid failure before implementation
      const { computeFireDemand } = await import('./demand');
      expect(computeFireDemand(100)).toBeCloseTo(16.667, 2);
    });

    it('25k population → ~8.33 LPS', async () => {
      const { computeFireDemand } = await import('./demand');
      expect(computeFireDemand(25)).toBeCloseTo(8.333, 2);
    });

    it('0 population → 0 LPS', async () => {
      const { computeFireDemand } = await import('./demand');
      expect(computeFireDemand(0)).toBe(0);
    });
  });

  describe('validatePatternAverage', () => {
    it('default diurnal pattern averages near 1.0', () => {
      const { valid, average } = validatePatternAverage(DEFAULT_DIURNAL_PATTERN);
      // Average should be close to 1.0 (within tolerance)
      expect(average).toBeGreaterThan(0.8);
      expect(average).toBeLessThan(1.5);
    });

    it('flat pattern of 2.0 fails validation', () => {
      const flat = new Array(24).fill(2.0);
      const { valid, average } = validatePatternAverage(flat);
      expect(average).toBeCloseTo(2.0, 2);
      expect(valid).toBe(false);
    });

    it('flat pattern of 1.0 passes validation', () => {
      const flat = new Array(24).fill(1.0);
      const { valid } = validatePatternAverage(flat);
      expect(valid).toBe(true);
    });
  });

  describe('pattern round-trip through solve', () => {
    beforeEach(() => {
      useNetworkStore.setState({ ...useNetworkStore.getInitialState() });
      if ('temporal' in useNetworkStore) {
        (useNetworkStore as any).temporal.getState().clear();
      }
    });

    it('edited pattern changes EPS results vs default', async () => {
      // Build minimal network with pattern
      useNetworkStore.getState().addPattern({ id: '1', multipliers: [...DEFAULT_DIURNAL_PATTERN] });
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().updateReservoir('R1', { head: 50 });
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 10, patternId: '1' });
      useNetworkStore.getState().addPipe('R1', 'J1');
      useNetworkStore.getState().updatePipe('P1', { length: 1000, diameter: 300, roughness: 130 });
      useNetworkStore.getState().updateOptions({ duration: 24 });

      // Solve with default pattern
      await useNetworkStore.getState().solve();
      const state1 = useNetworkStore.getState();
      expect(state1.epsResult).not.toBeNull();

      // Get pressure at a peak hour
      const peakTs = state1.epsResult!.timestamps.find(t => t >= 8 * 3600)!;
      const p1Peak = state1.epsResult!.nodeResults.get(peakTs)!.get('J1')!.pressure;

      // Now change pattern to extreme peak (all at 3.0)
      useNetworkStore.getState().updatePattern('1', new Array(24).fill(3.0));
      await useNetworkStore.getState().solve();
      const state2 = useNetworkStore.getState();

      const p2Peak = state2.epsResult!.nodeResults.get(peakTs)!.get('J1')!.pressure;

      // Higher uniform demand → more headloss → lower pressure everywhere
      expect(p2Peak).toBeLessThan(p1Peak);
    });
  });
});
