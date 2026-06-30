import { useState } from 'react';
import { useNetworkStore, type DrawingTool } from '../store/networkStore';
import { UndoRedoBadge } from './UndoRedoBadge';
import { ImportDialog } from './ImportDialog';

const nodeTools: { id: DrawingTool; label: string; shortcut: string; icon: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'S', icon: '⬚' },
  { id: 'reservoir', label: 'Reservoir', shortcut: 'R', icon: '▽' },
  { id: 'junction', label: 'Junction', shortcut: 'J', icon: '●' },
  { id: 'tank', label: 'Tank', shortcut: 'T', icon: '□' },
];

const linkTools: { id: DrawingTool; label: string; shortcut: string; icon: string }[] = [
  { id: 'pipe', label: 'Pipe', shortcut: 'P', icon: '─' },
  { id: 'pump', label: 'Pump', shortcut: 'U', icon: '⊕' },
  { id: 'valve', label: 'Valve', shortcut: 'V', icon: '⊘' },
];

export function Toolbar() {
  const activeTool = useNetworkStore(s => s.activeTool);
  const setActiveTool = useNetworkStore(s => s.setActiveTool);

  const [showImport, setShowImport] = useState(false);
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  );

  const toggleDark = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('soliton-theme', next);
    setIsDark(!isDark);
    window.dispatchEvent(new CustomEvent('soliton-theme-change', { detail: next }));
  };

  return (
    <div className="tool-rail" role="navigation" aria-label="Drawing tools">
      {/* Logo */}
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'linear-gradient(135deg, #3a5fcf, #2980b9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 16, fontWeight: 800, letterSpacing: -1,
        marginBottom: 4,
      }}>
        S
      </div>

      <div className="tool-divider" />

      {/* Node tools */}
      <div className="tool-section-label">Nodes</div>
      {nodeTools.map(t => (
        <button
          key={t.id}
          className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
          onClick={() => setActiveTool(t.id)}
          data-tooltip={`${t.label} (${t.shortcut})`}
          aria-label={`${t.label} (${t.shortcut})`}
        >
          {t.icon}
        </button>
      ))}

      <div className="tool-divider" />

      {/* Link tools */}
      <div className="tool-section-label">Links</div>
      {linkTools.map(t => (
        <button
          key={t.id}
          className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
          onClick={() => setActiveTool(t.id)}
          data-tooltip={`${t.label} (${t.shortcut})`}
          aria-label={`${t.label} (${t.shortcut})`}
        >
          {t.icon}
        </button>
      ))}

      <div className="tool-divider" />

      {/* Import */}
      <button
        className="tool-btn"
        onClick={() => setShowImport(true)}
        data-tooltip="Import GeoJSON (I)"
        aria-label="Import GeoJSON (I)"
        style={{ fontSize: 14 }}
      >
        &#8681;
      </button>

      <div className="tool-divider" />
      <UndoRedoBadge />

      <div style={{ flex: 1 }} />
      <button className="tool-btn" onClick={toggleDark} data-tooltip="Toggle dark mode" aria-label="Toggle dark mode">
        {isDark ? '\u2600' : '\uD83C\uDF19'}
      </button>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 }}>
        SOLITON
      </div>

      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
}
