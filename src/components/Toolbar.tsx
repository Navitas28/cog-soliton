import { useNetworkStore, type DrawingTool } from '../store/networkStore';

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

  return (
    <div className="tool-rail">
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
        >
          {t.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 8, color: '#555', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 }}>
        SOLITON
      </div>
    </div>
  );
}
