import { useState, useCallback } from 'react';
import { solveSteadyState } from './engine/engine';
import { MINIMAL_INP } from './engine/minimalInp';
import './App.css';

interface Result {
  junctionPressure: number;
  junctionHead: number;
  junctionDemand: number;
  pipeFlow: number;
  pipeVelocity: number;
  pipeHeadloss: number;
}

function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInp, setShowInp] = useState(false);

  const runSolve = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { nodeResults, linkResults } = await solveSteadyState(MINIMAL_INP);
      const j1 = nodeResults.get('J1');
      const p1 = linkResults.get('P1');
      if (!j1 || !p1) throw new Error('Missing node/link results');
      setResult({
        junctionPressure: j1.pressure,
        junctionHead: j1.head,
        junctionDemand: j1.demand,
        pipeFlow: p1.flow,
        pipeVelocity: p1.velocity,
        pipeHeadloss: p1.headloss,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1>Soliton — Phase 1 Engine Proof</h1>
      <p>
        Minimal network: Reservoir (head 50 m) → Pipe (1000 m, Ø300 mm, C=130) → Junction (elev 10 m, demand 10 LPS).
      </p>

      <button onClick={runSolve} disabled={loading} style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
        {loading ? 'Solving…' : 'Run EPANET Solve'}
      </button>

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee', border: '1px solid #c00', borderRadius: 4 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Results (from EPANET WASM)</h2>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>Parameter</th>
                <th style={thStyle}>Value</th>
                <th style={thStyle}>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>Junction J1 Pressure</td><td style={tdStyle}>{result.junctionPressure.toFixed(2)}</td><td style={tdStyle}>m</td></tr>
              <tr><td style={tdStyle}>Junction J1 Head</td><td style={tdStyle}>{result.junctionHead.toFixed(2)}</td><td style={tdStyle}>m</td></tr>
              <tr><td style={tdStyle}>Junction J1 Demand</td><td style={tdStyle}>{result.junctionDemand.toFixed(2)}</td><td style={tdStyle}>LPS</td></tr>
              <tr><td style={tdStyle}>Pipe P1 Flow</td><td style={tdStyle}>{result.pipeFlow.toFixed(2)}</td><td style={tdStyle}>LPS</td></tr>
              <tr><td style={tdStyle}>Pipe P1 Velocity</td><td style={tdStyle}>{result.pipeVelocity.toFixed(2)}</td><td style={tdStyle}>m/s</td></tr>
              <tr><td style={tdStyle}>Pipe P1 Head Loss</td><td style={tdStyle}>{result.pipeHeadloss.toFixed(2)}</td><td style={tdStyle}>m/km</td></tr>
            </tbody>
          </table>

          {/* Sanity check: pressure must be positive and finite */}
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: isFinite(result.junctionPressure) && result.junctionPressure > 0 ? '#efe' : '#fee',
            border: `1px solid ${isFinite(result.junctionPressure) && result.junctionPressure > 0 ? '#0a0' : '#c00'}`,
            borderRadius: 4,
          }}>
            {isFinite(result.junctionPressure) && result.junctionPressure > 0
              ? `✓ PASS — Junction pressure is ${result.junctionPressure.toFixed(2)} m (finite, positive, physically sane)`
              : `✗ FAIL — Junction pressure is ${result.junctionPressure} (expected finite positive value)`
            }
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => setShowInp(!showInp)} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          {showInp ? 'Hide' : 'Show'} Generated INP
        </button>
        {showInp && (
          <pre style={{ marginTop: '0.5rem', padding: '1rem', background: '#f5f5f5', overflow: 'auto', fontSize: '0.85rem', borderRadius: 4 }}>
            {MINIMAL_INP}
          </pre>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #333' };
const tdStyle: React.CSSProperties = { padding: '0.5rem', borderBottom: '1px solid #ddd' };

export default App;
