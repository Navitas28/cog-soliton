/**
 * New Project dialog — search any Indian city via Nominatim, fly to it, start fresh.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { createEmptyNetwork } from '../model/types';
import { useFocusTrap } from './useFocusTrap';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    state?: string;
    state_district?: string;
  };
}

interface NewProjectDialogProps {
  mapRef: React.RefObject<any>;
  onClose: () => void;
}

export function NewProjectDialog({ mapRef, onClose }: NewProjectDialogProps) {
  const [query, setQuery] = useState('');
  const [projectName, setProjectName] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<NominatimResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useFocusTrap(trapRef, true);

  const loadModel = useNetworkStore(s => s.loadModel);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const searchCity = useCallback((q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    setError('');

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=in&addressdetails=1`;

    fetch(url, {
      headers: { 'User-Agent': 'Soliton/1.0 (hydraulic-design-tool)' },
    })
      .then(res => res.json())
      .then((data: NominatimResult[]) => {
        setResults(data);
        setSearching(false);
      })
      .catch(() => {
        setError('Search requires internet connection');
        setSearching(false);
      });
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(value), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    setSelected(result);
    const cityName = result.address?.city || result.address?.town || result.display_name.split(',')[0];
    setProjectName(cityName || result.display_name.split(',')[0]);
    setResults([]);
    setQuery(result.display_name.split(',').slice(0, 2).join(','));
  };

  const handleCreate = () => {
    if (!selected || !projectName.trim()) return;

    loadModel(createEmptyNetwork(projectName.trim()));

    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [parseFloat(selected.lon), parseFloat(selected.lat)],
        zoom: 13,
        duration: 1500,
      });
    }

    onClose();
  };

  const formatResult = (r: NominatimResult) => {
    const parts = r.display_name.split(',').map(s => s.trim());
    const city = parts[0];
    const state = r.address?.state || parts[parts.length - 2] || '';
    return { city, state };
  };

  return (
    <div ref={trapRef} className="chart-modal-backdrop" onClick={onClose}>
      <div className="import-dialog" onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 92vw)' }}>
        {/* Header */}
        <div className="import-dialog-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Project</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Search for a city to start designing
            </p>
          </div>
          <button className="import-dialog-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {/* City search */}
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            City
          </label>
          <div className="city-search-wrapper">
            <input
              ref={inputRef}
              className="city-search-input"
              type="text"
              placeholder="Search Indian city... (e.g., Delhi, Mumbai, Pune)"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
              }}
              aria-label="Search city"
            />
            {searching && <span className="city-search-spinner">...</span>}
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div className="city-search-results">
              {results.map(r => {
                const { city, state } = formatResult(r);
                return (
                  <button
                    key={r.place_id}
                    className="city-search-result"
                    onClick={() => handleSelect(r)}
                  >
                    <span className="city-search-result-icon">📍</span>
                    <div className="city-search-result-text">
                      <span className="city-search-result-city">{city}</span>
                      <span className="city-search-result-state">{state}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>{error}</div>
          )}

          {/* Selected city indicator */}
          {selected && (
            <div className="city-search-selected">
              <span>📍</span>
              <span>{query}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {parseFloat(selected.lat).toFixed(4)}°N, {parseFloat(selected.lon).toFixed(4)}°E
              </span>
            </div>
          )}

          {/* Project name */}
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginTop: 16, marginBottom: 6 }}>
            Project Name
          </label>
          <input
            className="city-search-input"
            type="text"
            placeholder="e.g., Delhi Water Distribution Network"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="import-back-btn" onClick={onClose}>Cancel</button>
            <button
              className="import-go-btn"
              disabled={!selected || !projectName.trim()}
              onClick={handleCreate}
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
