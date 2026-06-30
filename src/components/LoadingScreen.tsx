/**
 * WASM loading screen — shown while epanet-js initializes.
 */
import { useState, useEffect } from 'react';
import { getWorkspace } from '../engine/engine';

export function LoadingScreen({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkspace()
      .then(() => setReady(true))
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a2e', color: '#e74c3c',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Soliton</div>
        <div>Failed to load hydraulic engine: {error}</div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#1a1a2e', color: '#fff',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: 2 }}>
          <span style={{ color: '#3a5fcf' }}>S</span>OLITON
        </div>
        <div style={{ fontSize: 13, color: '#8a8a9e' }}>
          Hydraulic Network Design Tool
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a8a9e', fontSize: 12 }}>
          <Spinner />
          Loading EPANET engine (WebAssembly)...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Spinner() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx={8} cy={8} r={6} fill="none" stroke="#3a5fcf" strokeWidth={2} strokeDasharray="20 12" />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  );
}
