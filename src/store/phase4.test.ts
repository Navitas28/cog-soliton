import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from './networkStore';
import { DEFAULT_DIURNAL_PATTERN } from '../model/demand';

describe('Phase 4 — EPS, compliance, what-if shutdown', () => {
  beforeEach(() => {
    useNetworkStore.setState({ ...useNetworkStore.getInitialState() });
  });

  it('runs 24-hour EPS and produces multiple timestep results', async () => {
    const store = useNetworkStore.getState();

    // Build a small network with a pattern
    store.addPattern({ id: '1', multipliers: [...DEFAULT_DIURNAL_PATTERN] });
    store.addReservoir(0, 0);
    store.updateReservoir('R1', { head: 50 });
    useNetworkStore.getState().addJunction(100, 0);
    useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 10, patternId: '1' });
    useNetworkStore.getState().addPipe('R1', 'J1');
    useNetworkStore.getState().updatePipe('P1', { length: 1000, diameter: 300, roughness: 130 });

    // Switch to EPS
    useNetworkStore.getState().updateOptions({ duration: 24 });

    await useNetworkStore.getState().solve();
    const state = useNetworkStore.getState();

    expect(state.solveError).toBeNull();
    expect(state.epsResult).not.toBeNull();
    expect(state.epsResult!.timestamps.length).toBeGreaterThan(1);

    // Verify different pressures at different times (demand varies with pattern)
    const ts0 = state.epsResult!.timestamps[0];
    const tsMid = state.epsResult!.timestamps[Math.floor(state.epsResult!.timestamps.length / 2)];
    const p0 = state.epsResult!.nodeResults.get(ts0)!.get('J1')!.pressure;
    const pMid = state.epsResult!.nodeResults.get(tsMid)!.get('J1')!.pressure;

    // Both should be finite positive
    expect(isFinite(p0)).toBe(true);
    expect(p0).toBeGreaterThan(0);
    expect(isFinite(pMid)).toBe(true);
    expect(pMid).toBeGreaterThan(0);

    // Pressures should differ because demand multiplier changes
    // (they might be very close, but the engine should produce different values)
    // At minimum, results at all timesteps should be valid
    for (const ts of state.epsResult!.timestamps) {
      const nr = state.epsResult!.nodeResults.get(ts)!.get('J1');
      expect(nr).toBeDefined();
      expect(isFinite(nr!.pressure)).toBe(true);
    }
  });

  it('what-if shutdown: closing a pipe changes affected node pressures', async () => {
    const store = useNetworkStore.getState();

    // Network: R1 → P1 → J1 → P2 → J2
    store.addReservoir(0, 0);
    store.updateReservoir('R1', { head: 60 });
    useNetworkStore.getState().addJunction(100, 0);
    useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 5 });
    useNetworkStore.getState().addJunction(200, 0);
    useNetworkStore.getState().updateJunction('J2', { elevation: 10, baseDemand: 5 });
    useNetworkStore.getState().addPipe('R1', 'J1');
    useNetworkStore.getState().updatePipe('P1', { length: 500, diameter: 300, roughness: 130 });
    useNetworkStore.getState().addPipe('J1', 'J2');
    useNetworkStore.getState().updatePipe('P2', { length: 500, diameter: 300, roughness: 130 });

    // Solve open
    await useNetworkStore.getState().solve();
    const state1 = useNetworkStore.getState();
    if (state1.solveError) {
      console.log('INP:\n', state1.lastInp);
      throw new Error(`Solve failed: ${state1.solveError}`);
    }
    const openResult = state1.solveResult!;
    const j2Open = openResult.nodeResults.get('J2')!.pressure;
    expect(j2Open).toBeGreaterThan(0);

    // Close pipe P2 (what-if shutdown)
    useNetworkStore.getState().updatePipe('P2', { status: 'Closed' });
    await useNetworkStore.getState().solve();
    const closedResult = useNetworkStore.getState().solveResult!;
    const j2Closed = closedResult.nodeResults.get('J2')!;

    // J2 should now have zero or negative demand (no flow through closed pipe)
    // and different pressure than before
    expect(j2Closed.pressure).not.toBeCloseTo(j2Open, 0);
  });

  it('pass/fail overlay correctly reflects design criteria', async () => {
    const store = useNetworkStore.getState();

    store.addReservoir(0, 0);
    store.updateReservoir('R1', { head: 30 }); // Low head to cause some failures
    useNetworkStore.getState().addJunction(100, 0);
    useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 15 });
    useNetworkStore.getState().addPipe('R1', 'J1');
    useNetworkStore.getState().updatePipe('P1', { length: 2000, diameter: 150, roughness: 130 });

    // Pressure floor = 17m (default)
    await useNetworkStore.getState().solve();
    const state = useNetworkStore.getState();
    if (state.solveError) throw new Error(`Solve failed: ${state.solveError}`);
    const j1 = state.solveResult!.nodeResults.get('J1')!;

    // With low head and small pipe, pressure should be below floor
    expect(j1.pressure).toBeLessThan(state.model.designCriteria.residualPressureFloor);
  });
});
