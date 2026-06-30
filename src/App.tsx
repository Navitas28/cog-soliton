import { Toolbar } from './components/Toolbar';
import { MapCanvas } from './components/MapCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import './styles/layout.css';

function App() {
  return (
    <div className="app-layout">
      <Toolbar />
      <MapCanvas />
      <PropertiesPanel />
    </div>
  );
}

export default App;
