/**
 * Node/pipe search — type ID to find and zoom to element on map.
 */
import { useState, useRef, useEffect } from 'react';
import { useNetworkStore } from '../store/networkStore';

interface SearchBoxProps {
  mapRef: React.RefObject<any>;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'junction' | 'reservoir' | 'tank' | 'pipe' | 'pump' | 'valve';
  label: string;
}

export function SearchBox({ mapRef, onClose }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const model = useNetworkStore(s => s.model);
  const selectElement = useNetworkStore(s => s.selectElement);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results: SearchResult[] = [];
  if (query.length > 0) {
    const q = query.toLowerCase();
    for (const j of model.junctions) {
      if (j.id.toLowerCase().includes(q)) results.push({ id: j.id, type: 'junction', label: `Junction ${j.id}` });
    }
    for (const r of model.reservoirs) {
      if (r.id.toLowerCase().includes(q)) results.push({ id: r.id, type: 'reservoir', label: `Reservoir ${r.id}` });
    }
    for (const t of model.tanks) {
      if (t.id.toLowerCase().includes(q)) results.push({ id: t.id, type: 'tank', label: `Tank ${t.id}` });
    }
    for (const p of model.pipes) {
      if (p.id.toLowerCase().includes(q)) results.push({ id: p.id, type: 'pipe', label: `Pipe ${p.id}` });
    }
    for (const p of model.pumps) {
      if (p.id.toLowerCase().includes(q)) results.push({ id: p.id, type: 'pump', label: `Pump ${p.id}` });
    }
    for (const v of model.valves) {
      if (v.id.toLowerCase().includes(q)) results.push({ id: v.id, type: 'valve', label: `Valve ${v.id}` });
    }
    results.splice(10);
  }

  const handleSelect = (r: SearchResult) => {
    selectElement(r.id, r.type);

    const map = mapRef.current;
    if (!map) { onClose(); return; }

    // Find coordinates
    let coords: [number, number] | null = null;
    const allNodes = [...model.junctions, ...model.reservoirs, ...model.tanks];
    const node = allNodes.find(n => n.id === r.id);
    if (node) {
      coords = [node.x, node.y];
    } else {
      // Link — fly to midpoint
      const link = [...model.pipes, ...model.pumps, ...model.valves].find(l => l.id === r.id);
      if (link) {
        const from = allNodes.find(n => n.id === link.fromNode);
        const to = allNodes.find(n => n.id === link.toNode);
        if (from && to) coords = [(from.x + to.x) / 2, (from.y + to.y) / 2];
      }
    }

    if (coords) {
      map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 15) });
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
  };

  return (
    <div className="search-box">
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Find element..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {results.length > 0 && (
        <div className="search-results">
          {results.map(r => (
            <div key={r.id} className="search-result-item" onClick={() => handleSelect(r)}>
              <span className={`search-result-type search-result-type--${r.type}`}>
                {r.type.charAt(0).toUpperCase()}
              </span>
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}