import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="page" style={{ placeItems: 'center', display: 'grid', padding: 24 }}>
      <div className="glass-panel" style={{ maxWidth: 400, width: '100%', padding: 32 }}>
        <h2 className="page-title" style={{ textAlign: 'center' }}>QGI</h2>
        <p className="page-sub" style={{ textAlign: 'center' }}>{t('en', 'loginSub')}</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>{t('en', 'emailLabel')}</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>{t('en', 'passwordLabel')}</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && (
            <div className="glass-card mb-2" style={{ padding: 12, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
              <strong style={{ color: '#b91c1c', fontSize: '0.85rem' }}>✕ {error}</strong>
            </div>
          )}
          <Button block type="submit" loading={loading} disabled={!email || !password}>
            {t('en', 'signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}
