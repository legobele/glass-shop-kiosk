import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('signin'); // 'signin' | 'bootstrap'
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      console.error(err);
      setError(t('en', 'invalidCreds'));
      setLoading(false);
    }
  };

  // First-run: create the initial admin account (bootstrapAdmin is idempotent).
  const bootstrap = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const fn = httpsCallable(functions, 'bootstrapAdmin');
      await fn();
      // set display name
      await auth.currentUser?.updateProfile({ displayName: name || 'Admin' });
      navigate('/admin');
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create admin');
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ placeItems: 'center', display: 'grid', padding: 24 }}>
      <div className="glass-panel-dark" style={{ maxWidth: 400, width: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🪟</div>
          <h2 className="page-title" style={{ fontSize: '1.6rem' }}>QGI Platform</h2>
          <p className="page-sub" style={{ marginBottom: 0 }}>{t('en', 'loginSub')}</p>
        </div>

        <div className="row mb-2" style={{ justifyContent: 'center', gap: 8 }}>
          <button
            className="btn"
            style={{
              padding: '7px 16px',
              borderRadius: 40,
              fontSize: '0.8rem',
              background: mode === 'signin' ? 'var(--glass-active)' : 'var(--surface-glass)',
              color: mode === 'signin' ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
            onClick={() => { setMode('signin'); setError(null); }}
          >
            Sign in
          </button>
          <button
            className="btn"
            style={{
              padding: '7px 16px',
              borderRadius: 40,
              fontSize: '0.8rem',
              background: mode === 'bootstrap' ? 'var(--glass-active)' : 'var(--surface-glass)',
              color: mode === 'bootstrap' ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
            onClick={() => { setMode('bootstrap'); setError(null); }}
          >
            First-time setup
          </button>
        </div>

        <form onSubmit={mode === 'signin' ? submit : bootstrap}>
          {mode === 'bootstrap' && (
            <div className="field">
              <label>{t('en', 'displayName')}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shop owner / manager" />
            </div>
          )}
          <div className="field">
            <label>{t('en', 'emailLabel')}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t('en', 'passwordLabel')}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {mode === 'bootstrap' && (
            <p className="muted mb-2" style={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
              First-time setup creates the initial admin account for the shop. Only do this once.
            </p>
          )}

          {error && (
            <div className="glass-card mb-2" style={{ padding: 12, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
              <strong style={{ color: '#b91c1c', fontSize: '0.85rem' }}>✕ {error}</strong>
            </div>
          )}

          <Button block type="submit" loading={loading} disabled={!email || !password}>
            {mode === 'signin' ? t('en', 'signIn') : 'Create admin account'}
          </Button>
        </form>

        <div className="mt-2" style={{ textAlign: 'center' }}>
          <a href="#/kiosk" style={{ fontSize: '0.8rem' }}>← {t('en', 'backToKiosk')}</a>
        </div>
      </div>
    </div>
  );
}
