/**
 * Demo loader — load sample networks for multiple cities.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { createAyodhyaNetwork, SCENARIO_LABELS, type AyodhyaScenario } from '../data/ayodhya';
import { createBhubaneswarNetwork, BBSR_SCENARIO_LABELS, type BhubaneswarScenario } from '../data/bhubaneswar';
import { createRanchiNetwork, RANCHI_SCENARIO_LABELS, type RanchiScenario } from '../data/ranchi';
import { createBareillyNetwork, BAREILLY_SCENARIO_LABELS, type BareillyScenario } from '../data/bareilly';

type City = 'ayodhya' | 'bhubaneswar' | 'ranchi' | 'bareilly';

const CITIES: { key: City; label: string }[] = [
  { key: 'ayodhya', label: 'Ayodhya' },
  { key: 'bhubaneswar', label: 'Bhubaneswar' },
  { key: 'ranchi', label: 'Ranchi' },
  { key: 'bareilly', label: 'Bareilly' },
];

export function DemoLoader() {
  const loadModel = useNetworkStore(s => s.loadModel);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('ayodhya');

  const handleLoad = (model: ReturnType<typeof createAyodhyaNetwork>) => {
    loadModel(model);
    setShowPicker(false);
  };

  const scenarios = {
    ayodhya: Object.entries(SCENARIO_LABELS) as [AyodhyaScenario, string][],
    bhubaneswar: Object.entries(BBSR_SCENARIO_LABELS) as [BhubaneswarScenario, string][],
    ranchi: Object.entries(RANCHI_SCENARIO_LABELS) as [RanchiScenario, string][],
    bareilly: Object.entries(BAREILLY_SCENARIO_LABELS) as [BareillyScenario, string][],
  };

  const loaders = {
    ayodhya: (k: string) => handleLoad(createAyodhyaNetwork(k as AyodhyaScenario)),
    bhubaneswar: (k: string) => handleLoad(createBhubaneswarNetwork(k as BhubaneswarScenario)),
    ranchi: (k: string) => handleLoad(createRanchiNetwork(k as RanchiScenario)),
    bareilly: (k: string) => handleLoad(createBareillyNetwork(k as BareillyScenario)),
  };

  return (
    <div className="demo-loader">
      <button className="demo-loader-btn" onClick={() => setShowPicker(!showPicker)}>
        🏛 Demo {showPicker ? '▴' : '▾'}
      </button>

      {showPicker && (
        <>
          <div className="export-dropdown-backdrop" onClick={() => setShowPicker(false)} />
          <div className="demo-loader-menu">
            <div className="demo-city-tabs">
              {CITIES.map(c => (
                <button
                  key={c.key}
                  className={`demo-city-tab ${selectedCity === c.key ? 'active' : ''}`}
                  onClick={() => setSelectedCity(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="demo-loader-header">
              AMRUT 2.0 {CITIES.find(c => c.key === selectedCity)?.label} — Select Scenario
            </div>

            {scenarios[selectedCity].map(([key, label]) => (
              <button key={key} className="demo-loader-item" onClick={() => loaders[selectedCity](key)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
