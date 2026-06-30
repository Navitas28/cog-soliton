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
    <div className="demo-loader">
      <button className="demo-loader-btn" onClick={() => setShowPicker(!showPicker)}>
        🏛 Ayodhya {showPicker ? '▴' : '▾'}
      </button>

      {showPicker && (
        <>
          <div className="export-dropdown-backdrop" onClick={() => setShowPicker(false)} />
          <div className="demo-loader-menu">
            <div className="demo-loader-header">AMRUT 2.0 Ayodhya — Select Scenario</div>
            {(Object.entries(SCENARIO_LABELS) as [AyodhyaScenario, string][]).map(([key, label]) => (
              <button key={key} className="demo-loader-item" onClick={() => handleLoad(key)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
