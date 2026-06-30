import { useState } from 'react';

const VALID_EMAIL = 'admin@soliton.com';
const VALID_PASSWORD = 'SolitonAdmin';

interface SignInPageProps {
  onAuth: () => void;
}

export function SignInPage({ onAuth }: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate auth delay
    setTimeout(() => {
      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        onAuth();
      } else {
        setError('Invalid email or password');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="signin-page">
      {/* Left — marketing */}
      <div className="signin-left">
        <div className="signin-left-content">
          {/* Logo */}
          <div className="signin-logo">
            <div className="signin-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="1.5"/>
                <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="signin-logo-name">Soliton</div>
              <div className="signin-logo-sub">Hydraulic Network Design Platform</div>
            </div>
          </div>

          {/* Headline */}
          <h1 className="signin-headline">
            The Future of<br />
            Water Infrastructure<br />
            Design.
          </h1>

          <p className="signin-desc">
            A browser-based hydraulic design tool for Indian municipal water distribution.
            EPANET 2.2 WebAssembly engine with CPHEEO design criteria.
            No installation, no license, no server.
          </p>

          {/* Features */}
          <div className="signin-features">
            <div className="signin-feature">
              <span className="signin-feature-icon">&#x1F4A7;</span>
              <div>
                <div className="signin-feature-title">EPANET 2.2 Engine</div>
                <div className="signin-feature-desc">Full hydraulic analysis via WebAssembly. Steady-state and extended period simulation.</div>
              </div>
            </div>
            <div className="signin-feature">
              <span className="signin-feature-icon">&#x1F3D7;</span>
              <div>
                <div className="signin-feature-title">CPHEEO Design Criteria</div>
                <div className="signin-feature-desc">Built-in Indian municipal design standards. Pressure, velocity, NRW compliance.</div>
              </div>
            </div>
            <div className="signin-feature">
              <span className="signin-feature-icon">&#x1F30D;</span>
              <div>
                <div className="signin-feature-title">Interactive Map</div>
                <div className="signin-feature-desc">Draw networks on real satellite and street maps. Drag, zoom, click to design.</div>
              </div>
            </div>
            <div className="signin-feature">
              <span className="signin-feature-icon">&#x1F4CA;</span>
              <div>
                <div className="signin-feature-title">Digital Twin View</div>
                <div className="signin-feature-desc">Pressure heatmap overlay on satellite imagery. Real-time SCADA integration seam.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right — sign-in form */}
      <div className="signin-right">
        <div className="signin-form-container">
          <h2 className="signin-form-title">Sign in</h2>
          <p className="signin-form-subtitle">Enter your credentials to access the platform</p>

          <form onSubmit={handleSubmit}>
            <div className="signin-field">
              <label className="signin-label">EMAIL ADDRESS</label>
              <input
                type="email"
                className="signin-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@soliton.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="signin-field">
              <label className="signin-label">PASSWORD</label>
              <div className="signin-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="signin-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="signin-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <div className="signin-error">{error}</div>}

            <button type="submit" className="signin-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in \u2192'}
            </button>
          </form>

          <div className="signin-footer">
            <strong>Need an account?</strong>
            <p>To sign up or get platform access, please reach out to our team at</p>
            <a href="mailto:info@cognecto.com">info@cognecto.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
