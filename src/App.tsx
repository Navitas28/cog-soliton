import { useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { Toolbar } from './components/Toolbar';
import { MapCanvas } from './components/MapCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ScenarioPanel } from './components/ScenarioPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import { DigitalTwinView } from './components/DigitalTwinView';
import { useNetworkStore } from './store/networkStore';
import { createAyodhyaNetwork } from './data/ayodhya';
import './styles/layout.css';

function App() {
  const activeView = useNetworkStore(s => s.activeView);
  const loadModel = useNetworkStore(s => s.loadModel);
  const solve = useNetworkStore(s => s.solve);

  // Auto-load Ayodhya demo and solve on first mount
  useEffect(() => {
    const network = createAyodhyaNetwork('11-wards');
    loadModel(network);
    solve();
  }, []);

  return (
    <LoadingScreen>
      {activeView === 'twin' ? (
        <DigitalTwinView />
      ) : (
        <div className="app-layout">
          <Toolbar />
          <MapCanvas />
          <ScenarioPanel />
          <ResultsDashboard />
          <PropertiesPanel />
        </div>
      )}
    </LoadingScreen>
  );
}

export default App;
