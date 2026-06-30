/**
 * Demo loader — load sample networks for Ayodhya or Bhubaneswar.
 */
import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { createAyodhyaNetwork, SCENARIO_LABELS, type AyodhyaScenario } from '../data/ayodhya';
import { createBhubaneswarNetwork, BBSR_SCENARIO_LABELS, type BhubaneswarScenario } from '../data/bhubaneswar';

type City = 'ayodhya' | 'bhubaneswar';

const CITY_LABELS: Record<City, string> = {
  ayodhya: 'Ayodhya',
  bhubaneswar: 'Bhubaneswar',
};

export function DemoLoader() {
  const loadModel = useNetworkStore(s => s.loadModel);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('ayodhya');

  const handleLoadAyodhya = (scenario: AyodhyaScenario) => {
    loadModel(createAyodhyaNetwork(scenario));
    setShowPicker(false);
  };

  const handleLoadBbsr = (scenario: BhubaneswarScenario) => {
    loadModel(createBhubaneswarNetwork(scenario));
    setShowPicker(false);
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
            {/* City tabs */}
            <div className="demo-city-tabs">
              {(Object.entries(CITY_LABELS) as [City, string][]).map(([key, label]) => (
                <button
                  key={key}
                  className={`demo-city-tab ${selectedCity === key ? 'active' : ''}`}
                  onClick={() => setSelectedCity(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Scenarios for selected city */}
            <div className="demo-loader-header">
              {selectedCity === 'ayodhya' ? 'AMRUT 2.0 Ayodhya' : 'AMRUT 2.0 Bhubaneswar'} — Select Scenario
            </div>

            {selectedCity === 'ayodhya' && (
              (Object.entries(SCENARIO_LABELS) as [AyodhyaScenario, string][]).map(([key, label]) => (
                <button key={key} className="demo-loader-item" onClick={() => handleLoadAyodhya(key)}>
                  {label}
                </button>
              ))
            )}

            {selectedCity === 'bhubaneswar' && (
              (Object.entries(BBSR_SCENARIO_LABELS) as [BhubaneswarScenario, string][]).map(([key, label]) => (
                <button key={key} className="demo-loader-item" onClick={() => handleLoadBbsr(key)}>
                  {label}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
