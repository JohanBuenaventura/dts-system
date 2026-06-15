// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const LoginPage = () => {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Theme state initialization (Syncs with system settings or local preferences if preferred)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root} className={isDarkMode ? 'dark-theme' : 'light-theme'}>
      
      {/* Floating Theme Switcher Toggle */}
      <button
        type="button"
        onClick={() => setIsDarkMode(v => !v)}
        style={styles.themeToggle}
        aria-label="Toggle visual theme"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* Left panel — brand (Preserved dark branding consistency across modes) */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.mark}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#1a1a2e"/>
              <path d="M7 8h14M7 13h10M7 18h12" stroke="#e8e8f0" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span style={styles.markLabel}>EDTS</span>
          </div>

          <div style={styles.taglineBlock}>
            <p style={styles.tagline}>Electronic Document<br />Tracking System</p>
            <p style={styles.sub}>Route, trace, and manage documents<br />across every department.</p>
          </div>

          <div style={styles.featureList}>
            {[
              'Real-time document routing',
              'Role-based access control',
              'Full audit trail',
            ].map((f) => (
              <div key={f} style={styles.featureItem}>
                <span style={styles.featureDot} />
                <span style={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Sign in</h2>
            <p style={styles.formSub}>Enter your credentials to continue</p>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{flexShrink:0,marginTop:1}}>
                <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--error-stroke)" strokeWidth="1.3"/>
                <path d="M7.5 4.5v4M7.5 10.5v.5" stroke="var(--error-stroke)" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@organization.gov"
                style={styles.input}
                onFocus={e => e.target.style.borderColor = 'var(--accent-focus)'}
                onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  style={{ ...styles.input, paddingRight: '2.8rem' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent-focus)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20C7 20 2.73 16.39 1 12a10.94 10.94 0 013.06-4.94M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.61 11 8a10.95 10.95 0 01-1.41 2.63"/>
                      <path d="M1 1l22 22"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = 'var(--submit-hover)'; }}
              onMouseLeave={e => { e.target.style.background = 'var(--submit-bg)'; }}
            >
              {loading ? (
                <span style={styles.spinnerRow}>
                  <span style={styles.spinner} />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={styles.registerRow}>
            No account?{' '}
            <Link to="/register" style={styles.registerLink}>
              Request access
            </Link>
          </p>
        </div>
      </div>

      {/* Reactive Design Tokens Injector */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

        .light-theme {
          --root-bg: #f5f5f7;
          --panel-right-bg: #ffffff;
          --text-main: #1a1a2e;
          --text-sub: #6b6b80;
          --text-dim: #9999aa;
          --border-color: #d8d8e0;
          --input-bg: #ffffff;
          --accent-focus: #1a1a2e;
          
          --error-bg: #fff5f5;
          --error-border: #f5c6c6;
          --error-stroke: #c0392b;

          --submit-bg: #1a1a2e;
          --submit-hover: #2d2d4e;
          --submit-text: #e8e8f0;
          --toggle-hover-bg: #e4e4e7;
        }

        .dark-theme {
          --root-bg: #09090b;
          --panel-right-bg: #121214;
          --text-main: #f4f4f5;
          --text-sub: #a1a1aa;
          --text-dim: #71717a;
          --border-color: #27272a;
          --input-bg: #18181b;
          --accent-focus: #a5b4fc;

          --error-bg: #1f1315;
          --error-border: #4c1d24;
          --error-stroke: #f87171;

          --submit-bg: #f4f4f5;
          --submit-hover: #e4e4e7;
          --submit-text: #09090b;
          --toggle-hover-bg: #18181b;
        }
      `}</style>
    </div>
  );
};

/* ── Dynamic Design Tokens Map ───────────────────────────────────────────── */
const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--root-bg)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    transition: 'background 0.2s ease',
    position: 'relative',
  },

  themeToggle: {
    position: 'absolute',
    top: '1.25rem',
    right: '1.25rem',
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.5rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    zIndex: 10,
  },

  /* Left — Constant Ink Panel */
  left: {
    width: '42%',
    background: '#1a1a2e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    '@media(max-width:768px)': { display: 'none' },
  },
  leftInner: {
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
  },
  mark: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  markLabel: {
    color: '#e8e8f0',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
  },
  taglineBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  tagline: {
    color: '#e8e8f0',
    fontSize: '1.9rem',
    fontWeight: 300,
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  sub: {
    color: '#8888a4',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    fontWeight: 400,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#5555cc',
    flexShrink: 0,
  },
  featureText: {
    color: '#aaaabc',
    fontSize: '0.825rem',
    fontWeight: 400,
  },

  /* Right — Responsive Forms with Variable Themes */
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: 'var(--panel-right-bg)',
    transition: 'background-color 0.2s ease',
  },
  formCard: {
    width: '100%',
    maxWidth: 380,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  formTitle: {
    fontSize: '1.6rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    letterSpacing: '-0.03em',
  },
  formSub: {
    fontSize: '0.875rem',
    color: 'var(--text-sub)',
    fontWeight: 400,
  },

  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    background: 'var(--error-bg)',
    border: '1px solid var(--error-border)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.825rem',
    color: 'var(--error-stroke)',
    lineHeight: 1.5,
  },

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--text-sub)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    border: '1.5px solid var(--border-color)',
    borderRadius: '8px',
    padding: '0.7rem 0.9rem',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    background: 'var(--input-bg)',
    outline: 'none',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
  },

  submitBtn: {
    marginTop: '0.25rem',
    width: '100%',
    background: 'var(--submit-bg)',
    color: 'var(--submit-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.8rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    letterSpacing: '0.01em',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  spinnerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    display: 'inline-block',
    width: 14,
    height: 14,
    border: '2px solid rgba(232,232,240,0.3)',
    borderTopColor: 'var(--submit-text)',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },

  registerRow: {
    textAlign: 'center',
    fontSize: '0.825rem',
    color: 'var(--text-dim)',
  },
  registerLink: {
    color: 'var(--text-main)',
    fontWeight: 600,
    textDecoration: 'none',
    borderBottom: '1px solid var(--text-main)',
    paddingBottom: '1px',
  },
};

export default LoginPage;