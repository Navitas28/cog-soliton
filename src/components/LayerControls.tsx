import { useState } from 'react';

export interface LayerVisibility {
  heatmap: boolean;
  pipes: boolean;
  junctions: boolean;
  pumps: boolean;
  reservoirs: boolean;
  tanks: boolean;
  sensors: boolean;
  labels: boolean;
}

const DEFAULT_VISIBILITY: LayerVisibility = {
  heatmap: true,
  pipes: true,
  junctions: true,
  pumps: true,
  reservoirs: true,
  tanks: true,
  sensors: true,
  labels: true,
};

interface LayerControlsProps {
  visibility: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
  heatmapOpacity: number;
  onHeatmapOpacityChange: (opacity: number) => void;
}

export function useLayerVisibility() {
  const [visibility, setVisibility] = useState<LayerVisibility>(DEFAULT_VISIBILITY);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.6);

  const toggle = (layer: keyof LayerVisibility) => {
    setVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return { visibility, toggle, heatmapOpacity, setHeatmapOpacity };
}

const LAYER_ITEMS: { key: keyof LayerVisibility; label: string; icon: string }[] = [
  { key: 'heatmap', label: 'Pressure Heatmap', icon: '🌡' },
  { key: 'pipes', label: 'Pipes', icon: '━' },
  { key: 'junctions', label: 'Junctions', icon: '●' },
  { key: 'reservoirs', label: 'Reservoirs', icon: '◆' },
  { key: 'tanks', label: 'Tanks', icon: '◼' },
  { key: 'pumps', label: 'Pumps', icon: '⚙' },
  { key: 'sensors', label: 'Sensors', icon: '📡' },
  { key: 'labels', label: 'Labels', icon: 'Aa' },
];

export function LayerControls({ visibility, onToggle, heatmapOpacity, onHeatmapOpacityChange }: LayerControlsProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layer-controls">
      <button className="layer-controls-header" onClick={() => setCollapsed(!collapsed)}>
        Layers {collapsed ? '▸' : '▾'}
      </button>
      {!collapsed && (
        <div className="layer-controls-body">
          {LAYER_ITEMS.map(item => (
            <label key={item.key} className="layer-toggle">
              <input
                type="checkbox"
                checked={visibility[item.key]}
                onChange={() => onToggle(item.key)}
              />
              <span className="layer-icon">{item.icon}</span>
              <span>{item.label}</span>
            </label>
          ))}
          {visibility.heatmap && (
            <div className="layer-opacity">
              <span>Opacity</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(heatmapOpacity * 100)}
                onChange={e => onHeatmapOpacityChange(parseInt(e.target.value) / 100)}
              />
              <span>{Math.round(heatmapOpacity * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
