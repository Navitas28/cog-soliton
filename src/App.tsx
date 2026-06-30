import { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileWarning } from './components/MobileWarning';
import { LoadingScreen } from './components/LoadingScreen';
import { SignInPage } from './components/SignInPage';
import { Toolbar } from './components/Toolbar';
import { MapCanvas } from './components/MapCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ScenarioPanel } from './components/ScenarioPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import { DigitalTwinView } from './components/DigitalTwinView';
import { useNetworkStore } from './store/networkStore';
import './styles/layout.css';

// Restore saved theme before first paint to prevent flash
if (typeof document !== 'undefined') {
  const saved = localStorage.getItem('soliton-theme');
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const activeView = useNetworkStore(s => s.activeView);
  const showPropertiesPanel = useNetworkStore(s => s.showPropertiesPanel);
  const setShowPropertiesPanel = useNetworkStore(s => s.setShowPropertiesPanel);

  if (!authenticated) {
    return <SignInPage onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <>
      <MobileWarning />
      <ErrorBoundary>
        <LoadingScreen>
          {activeView === 'twin' ? (
            <DigitalTwinView />
          ) : (
            <div className="app-layout">
              <Toolbar />
              <MapCanvas />
              <ScenarioPanel />
              <ResultsDashboard />
              <div className={`properties-wrapper ${showPropertiesPanel ? '' : 'collapsed'}`}>
                <button
                  className="panel-toggle-btn"
                  onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
                  title={showPropertiesPanel ? 'Collapse panel' : 'Expand panel'}
                  aria-label={showPropertiesPanel ? 'Collapse properties panel' : 'Expand properties panel'}
                >
                  {showPropertiesPanel ? '›' : '‹'}
                </button>
                {showPropertiesPanel && <PropertiesPanel />}
              </div>
            </div>
          )}
        </LoadingScreen>
      </ErrorBoundary>
    </>
  );
}

export default App;
