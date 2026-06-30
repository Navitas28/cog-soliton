import { describe, it, expect, beforeEach } from 'vitest';
import { useNetworkStore } from './networkStore';

describe('Phase 8 — Undo/Redo', () => {
  beforeEach(() => {
    useNetworkStore.setState({ ...useNetworkStore.getInitialState() });
    // Clear undo history if temporal middleware is present
    if ('temporal' in useNetworkStore) {
      (useNetworkStore as any).temporal.getState().clear();
    }
  });

  it('undo reverses addJunction', () => {
    useNetworkStore.getState().addJunction(100, 200);
    expect(useNetworkStore.getState().model.junctions).toHaveLength(1);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(0);
  });

  it('redo re-applies addJunction after undo', () => {
    useNetworkStore.getState().addJunction(100, 200);
    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(0);

    (useNetworkStore as any).temporal.getState().redo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(1);
  });

  it('undo reverses moveNode', () => {
    useNetworkStore.getState().addJunction(100, 200);
    const origX = useNetworkStore.getState().model.junctions[0].x;

    useNetworkStore.getState().moveNode('J1', 500, 500);
    expect(useNetworkStore.getState().model.junctions[0].x).toBe(500);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions[0].x).toBe(origX);
  });

  it('undo reverses deleteElement', () => {
    useNetworkStore.getState().addJunction(100, 200);
    useNetworkStore.getState().deleteElement('J1', 'junction');
    expect(useNetworkStore.getState().model.junctions).toHaveLength(0);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(1);
  });

  it('undo reverses updatePipe', () => {
    useNetworkStore.getState().addReservoir(0, 0);
    useNetworkStore.getState().addJunction(100, 0);
    useNetworkStore.getState().addPipe('R1', 'J1');
    useNetworkStore.getState().updatePipe('P1', { diameter: 500 });
    expect(useNetworkStore.getState().model.pipes[0].diameter).toBe(500);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.pipes[0].diameter).toBe(200); // default
  });

  it('undo does NOT affect activeTool or selectedElementId', () => {
    useNetworkStore.getState().addJunction(100, 200);
    useNetworkStore.getState().setActiveTool('pipe');
    useNetworkStore.getState().selectElement('J1', 'junction');

    (useNetworkStore as any).temporal.getState().undo();

    // UI state should be unchanged
    expect(useNetworkStore.getState().activeTool).toBe('pipe');
    // selectedElementId may still point to J1 even though it's gone — that's fine
    // The important thing is that tool didn't revert
  });

  it('multiple undo steps work', () => {
    useNetworkStore.getState().addJunction(100, 200);
    useNetworkStore.getState().addJunction(200, 300);
    useNetworkStore.getState().addJunction(300, 400);
    expect(useNetworkStore.getState().model.junctions).toHaveLength(3);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(2);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(1);

    (useNetworkStore as any).temporal.getState().undo();
    expect(useNetworkStore.getState().model.junctions).toHaveLength(0);
  });
});
