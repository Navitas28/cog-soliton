import { LoadingScreen } from './components/LoadingScreen';
import { Toolbar } from './components/Toolbar';
import { MapCanvas } from './components/MapCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ScenarioPanel } from './components/ScenarioPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import './styles/layout.css';

function App() {
  return (
    <LoadingScreen>
      <div className="app-layout">
        <Toolbar />
        <MapCanvas />
        <ScenarioPanel />
        <ResultsDashboard />
        <PropertiesPanel />
      </div>
    </LoadingScreen>
  );
}

export default App;
