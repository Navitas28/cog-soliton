/**
 * Undo/redo buttons with stack depth — compact for 52px tool rail.
 */
import { useStore } from 'zustand';
import { useNetworkStore } from '../store/networkStore';

const temporalStore = (useNetworkStore as any).temporal;

export function UndoRedoBadge() {
  const pastLen = useStore(temporalStore, (s: any) => s.pastStates.length);
  const futureLen = useStore(temporalStore, (s: any) => s.futureStates.length);
  const undo = () => temporalStore.getState().undo();
  const redo = () => temporalStore.getState().redo();

  return (
    <div className="undo-redo-badge">
      <button
        className="undo-redo-btn"
        disabled={pastLen === 0}
        onClick={undo}
        title={`Undo (${pastLen})`}
      >
        ↩ <span className="undo-redo-count">{pastLen}</span>
      </button>
      <button
        className="undo-redo-btn"
        disabled={futureLen === 0}
        onClick={redo}
        title={`Redo (${futureLen})`}
      >
        ↪ <span className="undo-redo-count">{futureLen}</span>
      </button>
    </div>
  );
}
