import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from './networkStore';

describe('Phase 3 vertical slice', () => {
  beforeEach(() => {
    // Reset store to initial state
    useNetworkStore.setState({
      ...useNetworkStore.getInitialState(),
    });
  });

  it('place reservoir + junction + pipe, solve, verify pressure coloring direction', async () => {
    const store = useNetworkStore.getState();

    // Place a reservoir
    const rId = store.addReservoir(0, 0);
    expect(rId).toBe('R1');

    // Place a junction
    const jId = useNetworkStore.getState().addJunction(100, 0);
    expect(jId).toBe('J1');

    // Set properties
    useNetworkStore.getState().updateReservoir('R1', { head: 50 });
    useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 10 });

    // Draw a pipe between them
    const pId = useNetworkStore.getState().addPipe('R1', 'J1');
    expect(pId).toBe('P1');
    useNetworkStore.getState().updatePipe('P1', { length: 1000, diameter: 300, roughness: 130 });

    // Solve
    await useNetworkStore.getState().solve();

    const state = useNetworkStore.getState();
    expect(state.solveError).toBeNull();
    expect(state.solveResult).not.toBeNull();

    const j1 = state.solveResult!.nodeResults.get('J1');
    expect(j1).toBeDefined();
    expect(j1!.pressure).toBeGreaterThan(20);
    expect(j1!.pressure).toBeLessThan(40);

    // Pressure should be above the 17m floor → green
    expect(j1!.pressure).toBeGreaterThan(state.model.designCriteria.residualPressureFloor);

    // Now reduce pipe diameter → more head loss → lower pressure
    useNetworkStore.getState().updatePipe('P1', { diameter: 100 });
    await useNetworkStore.getState().solve();

    const state2 = useNetworkStore.getState();
    const j1After = state2.solveResult!.nodeResults.get('J1');
    expect(j1After).toBeDefined();
    // Smaller diameter → more headloss → lower pressure
    expect(j1After!.pressure).toBeLessThan(j1!.pressure);
  });

  it('handles disconnected network gracefully', async () => {
    const store = useNetworkStore.getState();

    // Single orphan junction — no source
    store.addJunction(100, 100);
    useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 5 });

    await useNetworkStore.getState().solve();

    // Should either produce an error or very low/zero pressure — not crash
    const state = useNetworkStore.getState();
    // EPANET may error on disconnected network — that's fine, app should capture it
    if (state.solveError) {
      expect(typeof state.solveError).toBe('string');
    }
  });
});
