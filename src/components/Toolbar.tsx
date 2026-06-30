import { useNetworkStore, type DrawingTool } from '../store/networkStore';

const tools: { id: DrawingTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⬚' },
  { id: 'reservoir', label: 'Reservoir', icon: '▽' },
  { id: 'junction', label: 'Junction', icon: '●' },
  { id: 'tank', label: 'Tank', icon: '□' },
  { id: 'pipe', label: 'Pipe', icon: '─' },
];

export function Toolbar() {
  const activeTool = useNetworkStore(s => s.activeTool);
  const setActiveTool = useNetworkStore(s => s.setActiveTool);

  return (
    <div className="tool-rail">
      <div style={{ fontSize: 11, color: '#8a8a9e', marginBottom: 4, fontWeight: 600 }}>S</div>
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
    </div>
  );
}
