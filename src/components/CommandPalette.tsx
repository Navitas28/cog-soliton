import { useState, useRef, useEffect, useMemo } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { useFocusTrap } from './useFocusTrap';

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  category: string;
  shortcut?: string;
  available: boolean;
  execute: () => void;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useRef<HTMLDivElement>(null);
  useFocusTrap(trapRef, true);

  const model = useNetworkStore(s => s.model);
  const solveResult = useNetworkStore(s => s.solveResult);
  const epsResult = useNetworkStore(s => s.epsResult);
  const setActiveTool = useNetworkStore(s => s.setActiveTool);
  const solve = useNetworkStore(s => s.solve);
  const setShowScenarioPanel = useNetworkStore(s => s.setShowScenarioPanel);
  const setShowResultsDashboard = useNetworkStore(s => s.setShowResultsDashboard);
  const setActiveView = useNetworkStore(s => s.setActiveView);

  const hasResults = !!(solveResult || epsResult);

  const actions: PaletteAction[] = useMemo(() => [
    // Design
    { id: 'tool-select', label: 'Select Tool', description: 'Switch to selection mode', category: 'Design', shortcut: 'S', available: true, execute: () => { setActiveTool('select'); onClose(); } },
    { id: 'tool-reservoir', label: 'Place Reservoir', description: 'Add a water source node', category: 'Design', shortcut: 'R', available: true, execute: () => { setActiveTool('reservoir'); onClose(); } },
    { id: 'tool-junction', label: 'Place Junction', description: 'Add a demand node', category: 'Design', shortcut: 'J', available: true, execute: () => { setActiveTool('junction'); onClose(); } },
    { id: 'tool-tank', label: 'Place Tank', description: 'Add a storage tank', category: 'Design', shortcut: 'T', available: true, execute: () => { setActiveTool('tank'); onClose(); } },
    { id: 'tool-pipe', label: 'Draw Pipe', description: 'Connect two nodes with a pipe', category: 'Design', shortcut: 'P', available: true, execute: () => { setActiveTool('pipe'); onClose(); } },
    { id: 'tool-pump', label: 'Draw Pump', description: 'Add a pump between nodes', category: 'Design', shortcut: 'U', available: true, execute: () => { setActiveTool('pump'); onClose(); } },
    { id: 'tool-valve', label: 'Draw Valve', description: 'Add a valve between nodes', category: 'Design', shortcut: 'V', available: true, execute: () => { setActiveTool('valve'); onClose(); } },

    // Configure
    { id: 'open-scenario', label: 'Scenario Settings', description: 'CPHEEO criteria, patterns, simulation mode', category: 'Configure', available: true, execute: () => { setShowScenarioPanel(true); onClose(); } },

    // Compute
    { id: 'run-compute', label: 'Run Compute', description: 'Execute hydraulic analysis', category: 'Compute', available: true, execute: () => { solve(); onClose(); } },

    // Analysis
    { id: 'results-dashboard', label: 'Results Dashboard', description: 'Pressure, velocity, and demand tables', category: 'Analysis', available: true, execute: () => { setShowResultsDashboard(true); onClose(); } },
    { id: 'fire-flow', label: 'Fire Flow Analysis', description: 'Test hydrant adequacy at each junction', category: 'Analysis', available: hasResults, execute: () => onClose() },
    { id: 'criticality', label: 'Criticality (N-1)', description: 'Identify single points of failure', category: 'Analysis', available: hasResults, execute: () => onClose() },
    { id: 'dma-zones', label: 'DMA / Zones', description: 'District metering area boundaries', category: 'Analysis', available: hasResults, execute: () => onClose() },
    { id: 'calibrate', label: 'Calibrate (Field Data)', description: 'Compare model vs field measurements', category: 'Analysis', available: hasResults, execute: () => onClose() },
    { id: 'digital-twin', label: 'Digital Twin', description: 'Live monitoring satellite view', category: 'Analysis', available: hasResults, execute: () => { setActiveView('twin'); onClose(); } },

    // View
    { id: 'shortcuts', label: 'Keyboard Shortcuts', description: 'Show all keyboard shortcuts', category: 'View', shortcut: '?', available: true, execute: () => onClose() },
  ], [hasResults, setActiveTool, solve, setShowScenarioPanel, setShowResultsDashboard, setActiveView, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(a =>
      a.label.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }, [query, actions]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item?.available) item.execute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, PaletteAction[]>();
    for (const a of filtered) {
      const list = map.get(a.category) || [];
      list.push(a);
      map.set(a.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Flat index mapping for keyboard nav
  let flatIdx = 0;

  return (
    <div ref={trapRef} className="chart-modal-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-palette-input-row">
          <span className="command-palette-icon">⌘</span>
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            placeholder="Search actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search actions"
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>
        <div className="command-palette-results">
          {groups.length === 0 && (
            <div className="command-palette-empty">No matching actions</div>
          )}
          {groups.map(([category, items]) => (
            <div key={category}>
              <div className="command-palette-category">{category}</div>
              {items.map(item => {
                const idx = flatIdx++;
                return (
                  <button
                    key={item.id}
                    className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                    aria-disabled={!item.available || undefined}
                    onClick={() => { if (item.available) item.execute(); }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="command-palette-item-main">
                      <span className="command-palette-item-label">{item.label}</span>
                      <span className="command-palette-item-desc">{item.available ? item.description : 'Requires results — run Compute first'}</span>
                    </div>
                    {item.shortcut && (
                      <kbd className="command-palette-shortcut">{item.shortcut}</kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
