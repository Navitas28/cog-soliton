import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#1a1a2e', color: '#fff',
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            <span style={{ color: '#3a5fcf' }}>S</span>OLITON
          </div>
          <div style={{ color: '#e74c3c', fontSize: 14, maxWidth: 400, textAlign: 'center' }}>
            Something went wrong: {this.state.error}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '8px 20px', border: '1px solid #3a5fcf', borderRadius: 6,
              background: '#3a5fcf', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}>Reload</button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{
              padding: '8px 20px', border: '1px solid #555', borderRadius: 6,
              background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 13,
            }}>Clear data &amp; reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
