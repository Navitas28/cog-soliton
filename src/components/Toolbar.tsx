import { useNetworkStore, type DrawingTool } from '../store/networkStore';

const tools: { id: DrawingTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select (S)', icon: '⬚' },
  { id: 'reservoir', label: 'Place Reservoir (R)', icon: '▽' },
  { id: 'junction', label: 'Place Junction (J)', icon: '●' },
  { id: 'tank', label: 'Place Tank (T)', icon: '□' },
  { id: 'pipe', label: 'Draw Pipe (P)', icon: '─' },
];

export function Toolbar() {
  const activeTool = useNetworkStore(s => s.activeTool);
  const setActiveTool = useNetworkStore(s => s.setActiveTool);

  return (
    <div className="tool-rail">
      {/* Logo slot */}
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
      {tools.map(t => (
        <button
          key={t.id}
          className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
          onClick={() => setActiveTool(t.id)}
          title={t.label}
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
