import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from './networkStore';

describe('Phase 7 — Interaction Foundations', () => {
  beforeEach(() => {
    useNetworkStore.setState({ ...useNetworkStore.getInitialState() });
  });

  describe('moveNode', () => {
    it('updates junction coordinates', () => {
      useNetworkStore.getState().addJunction(100, 200);
      useNetworkStore.getState().moveNode('J1', 150, 250);

      const j = useNetworkStore.getState().model.junctions.find(j => j.id === 'J1');
      expect(j).toBeDefined();
      expect(j!.x).toBe(150);
      expect(j!.y).toBe(250);
    });

    it('updates reservoir coordinates', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().moveNode('R1', 50, 75);

      const r = useNetworkStore.getState().model.reservoirs.find(r => r.id === 'R1');
      expect(r).toBeDefined();
      expect(r!.x).toBe(50);
      expect(r!.y).toBe(75);
    });

    it('recomputes connected pipe length when node moves', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addPipe('R1', 'J1');

      const lengthBefore = useNetworkStore.getState().model.pipes[0].length;

      // Move junction far away
      useNetworkStore.getState().moveNode('J1', 500, 500);

      const lengthAfter = useNetworkStore.getState().model.pipes[0].length;
      expect(lengthAfter).not.toBeCloseTo(lengthBefore, 0);
    });

    it('does NOT recompute pipe length when lengthOverride is true', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addPipe('R1', 'J1');
      useNetworkStore.getState().updatePipe('P1', { length: 999, lengthOverride: true });

      useNetworkStore.getState().moveNode('J1', 500, 500);

      const p = useNetworkStore.getState().model.pipes[0];
      expect(p.length).toBe(999);
    });
  });

  describe('addPump', () => {
    it('creates pump between two nodes', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      const id = useNetworkStore.getState().addPump('R1', 'J1');

      expect(id).toBe('PU1');
      const pump = useNetworkStore.getState().model.pumps.find(p => p.id === 'PU1');
      expect(pump).toBeDefined();
      expect(pump!.fromNode).toBe('R1');
      expect(pump!.toNode).toBe('J1');
      expect(pump!.power).toBeGreaterThan(0);
    });

    it('pump in network serializes to valid INP and solves', async () => {
      // Build: Reservoir → Pump → Junction (with demand)
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().updateReservoir('R1', { head: 20 });
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().updateJunction('J1', { elevation: 50, baseDemand: 5 });

      // Pump boosts head from reservoir to elevated junction
      useNetworkStore.getState().addPump('R1', 'J1');
      useNetworkStore.getState().updatePump('PU1', { power: 50 });

      // Need a pipe too for the network to work (pump alone doesn't carry flow in EPANET without pipe)
      // Actually in EPANET, a pump IS a link — it connects two nodes directly
      // But we need the junction to have a downstream path or demand
      // Let's add a pipe from J1 to a second junction
      useNetworkStore.getState().addJunction(200, 0);
      useNetworkStore.getState().updateJunction('J2', { elevation: 10, baseDemand: 5 });
      useNetworkStore.getState().addPipe('J1', 'J2');
      useNetworkStore.getState().updatePipe('P1', { length: 500, diameter: 300, roughness: 130 });

      await useNetworkStore.getState().solve();
      const state = useNetworkStore.getState();

      // Pump should solve without error (may warn about negative pressures)
      if (state.solveError && !state.solveError.includes('Warning')) {
        // Allow warnings but not hard errors
        expect(state.solveError).toBeNull();
      }
    });
  });

  describe('addValve', () => {
    it('creates valve between two nodes', () => {
      useNetworkStore.getState().addJunction(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      const id = useNetworkStore.getState().addValve('J1', 'J2');

      expect(id).toBe('V1');
      const valve = useNetworkStore.getState().model.valves.find(v => v.id === 'V1');
      expect(valve).toBeDefined();
      expect(valve!.fromNode).toBe('J1');
      expect(valve!.toNode).toBe('J2');
      expect(valve!.type).toBe('PRV');
    });

    it('valve (PRV) in network serializes to valid INP and solves', async () => {
      // Build: Reservoir → Pipe → J1 → PRV → J2 (with demand)
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().updateReservoir('R1', { head: 80 });
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().updateJunction('J1', { elevation: 10, baseDemand: 0 });
      useNetworkStore.getState().addJunction(200, 0);
      useNetworkStore.getState().updateJunction('J2', { elevation: 10, baseDemand: 10 });

      useNetworkStore.getState().addPipe('R1', 'J1');
      useNetworkStore.getState().updatePipe('P1', { length: 500, diameter: 300, roughness: 130 });

      useNetworkStore.getState().addValve('J1', 'J2');
      useNetworkStore.getState().updateValve('V1', { type: 'PRV', setting: 30, diameter: 200 });

      await useNetworkStore.getState().solve();
      const state = useNetworkStore.getState();

      expect(state.solveError).toBeNull();
      expect(state.solveResult).not.toBeNull();

      // PRV should limit downstream pressure
      const j2 = state.solveResult!.nodeResults.get('J2');
      expect(j2).toBeDefined();
      expect(j2!.pressure).toBeLessThanOrEqual(31); // PRV set to 30m, pressure ≈ setting
      expect(j2!.pressure).toBeGreaterThan(0);
    });
  });

  describe('deleteElement — pumps/valves', () => {
    it('removes pump', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addPump('R1', 'J1');

      expect(useNetworkStore.getState().model.pumps).toHaveLength(1);
      useNetworkStore.getState().deleteElement('PU1', 'pump');
      expect(useNetworkStore.getState().model.pumps).toHaveLength(0);
    });

    it('deleting node removes connected pumps and valves', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addJunction(200, 0);
      useNetworkStore.getState().addPump('R1', 'J1');
      useNetworkStore.getState().addValve('J1', 'J2');

      expect(useNetworkStore.getState().model.pumps).toHaveLength(1);
      expect(useNetworkStore.getState().model.valves).toHaveLength(1);

      // Delete J1 — should cascade-remove pump and valve
      useNetworkStore.getState().deleteElement('J1', 'junction');

      expect(useNetworkStore.getState().model.pumps).toHaveLength(0);
      expect(useNetworkStore.getState().model.valves).toHaveLength(0);
    });
  });

  describe('updatePump / updateValve', () => {
    it('updatePump changes pump properties', () => {
      useNetworkStore.getState().addReservoir(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addPump('R1', 'J1');
      useNetworkStore.getState().updatePump('PU1', { power: 75, speed: 1.5 });

      const pump = useNetworkStore.getState().model.pumps[0];
      expect(pump.power).toBe(75);
      expect(pump.speed).toBe(1.5);
    });

    it('updateValve changes valve type and setting', () => {
      useNetworkStore.getState().addJunction(0, 0);
      useNetworkStore.getState().addJunction(100, 0);
      useNetworkStore.getState().addValve('J1', 'J2');
      useNetworkStore.getState().updateValve('V1', { type: 'FCV', setting: 15 });

      const valve = useNetworkStore.getState().model.valves[0];
      expect(valve.type).toBe('FCV');
      expect(valve.setting).toBe(15);
    });
  });
});
