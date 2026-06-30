/**
 * Demo loader — one-click load of the Ayodhya sample network.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { createAyodhyaNetwork, SCENARIO_LABELS, type AyodhyaScenario } from '../data/ayodhya';

export function DemoLoader() {
  const loadModel = useNetworkStore(s => s.loadModel);
  const [showPicker, setShowPicker] = useState(false);

  const handleLoad = (scenario: AyodhyaScenario) => {
    const model = createAyodhyaNetwork(scenario);
    loadModel(model);
    setShowPicker(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          padding: '6px 14px', border: '1px solid #8e44ad', borderRadius: 4,
          background: '#8e44ad', color: '#fff', cursor: 'pointer', fontSize: 12,
          fontWeight: 600,
        }}
      >
        🏛 Load Ayodhya Demo
      </button>

      {showPicker && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', border: '1px solid #ddd', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: 8,
          width: 280, zIndex: 30,
        }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8, fontWeight: 600 }}>
            AMRUT 2.0 Ayodhya — Select Scenario
          </div>
          {(Object.entries(SCENARIO_LABELS) as [AyodhyaScenario, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleLoad(key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', border: 'none', borderRadius: 4,
                background: 'transparent', cursor: 'pointer', fontSize: 13,
                marginBottom: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
