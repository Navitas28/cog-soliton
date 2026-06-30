/**
 * WASM loading screen — shown while epanet-js initializes.
 */
import { useState, useEffect } from 'react';
import { getWorkspace } from '../engine/engine';
import { useNetworkStore } from '../store/networkStore';
import { createAyodhyaNetwork } from '../data/ayodhya';

export function LoadingScreen({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWorkspace()
      .then(() => {
        setReady(true);
        // Try restoring auto-save, fall back to Ayodhya demo
        const raw = localStorage.getItem('soliton-autosave');
        let restored = false;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.title === 'string') {
              useNetworkStore.getState().loadModel(parsed);
              restored = true;
            }
          } catch { /* parse failed, fall through */ }
        }
        if (!restored) {
          const network = createAyodhyaNetwork('11-wards');
          useNetworkStore.getState().loadModel(network);
        }
        useNetworkStore.getState().solve();
      })
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
        <NetworkSilhouette />
        <div style={{ color: '#8a8a9e', fontSize: 12 }}>
          Loading EPANET engine (WebAssembly)...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function NetworkSilhouette() {
  return (
    <svg width={200} height={120} viewBox="0 0 200 120" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }`}</style>
      {/* Pipes */}
      <line x1={100} y1={15} x2={50} y2={50} stroke="#2980b9" strokeWidth={2} />
      <line x1={100} y1={15} x2={150} y2={50} stroke="#2980b9" strokeWidth={2} />
      <line x1={50} y1={50} x2={50} y2={90} stroke="#2980b9" strokeWidth={2} />
      <line x1={150} y1={50} x2={150} y2={90} stroke="#2980b9" strokeWidth={2} />
      <line x1={50} y1={50} x2={150} y2={50} stroke="#2980b9" strokeWidth={2} />
      <line x1={50} y1={90} x2={100} y2={90} stroke="#2980b9" strokeWidth={2} />
      <line x1={100} y1={90} x2={150} y2={90} stroke="#2980b9" strokeWidth={2} />
      {/* Reservoir (triangle at top) */}
      <polygon points="100,5 90,20 110,20" fill="#3a5fcf" />
      {/* Tank (square) */}
      <rect x={140} y={82} width={20} height={16} fill="#3a5fcf" rx={1} />
      {/* Junctions (circles) */}
      <circle cx={50} cy={50} r={5} fill="#3a5fcf" />
      <circle cx={150} cy={50} r={5} fill="#3a5fcf" />
      <circle cx={50} cy={90} r={5} fill="#3a5fcf" />
      <circle cx={100} cy={90} r={5} fill="#3a5fcf" />
      {/* Labels */}
      <text x={100} y={115} textAnchor="middle" fill="#8a8a9e" fontSize={8} fontFamily="sans-serif">network</text>
    </svg>
  );
}
