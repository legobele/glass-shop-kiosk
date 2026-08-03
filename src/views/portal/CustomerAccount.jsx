import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../firebase';
import { t } from '../../i18n';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../hooks/useAuth';

// Customer account hub: register (mandatory 2FA), login, claim orders, view mine.
export default function CustomerAccount() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'claim'

  if (user) return <SignedIn />;
  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 520 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <a href="#/kiosk" style={{ fontSize: '0.8rem' }}>← {t('en', 'backToKiosk')}</a>
        </div>
        <h2 className="page-title">Customer Account</h2>
        <p className="page-sub">Track your orders and manage changes. Account registration requires two-factor authentication.</p>

        <div className="row mb-2" style={{ gap: 8 }}>
          {['login', 'register', 'claim'].map((t2) => (
            <button
              key={t2}
              className="btn"
              style={{
                padding: '7px 16px',
                borderRadius: 40,
                fontSize: '0.8rem',
                background: tab === t2 ? 'var(--glass-active)' : 'var(--surface-glass)',
                color: tab === t2 ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
              onClick={() => setTab(t2)}
            >
              {t2 === 'login' ? 'Sign in' : t2 === 'register' ? 'Register' : 'Claim an order'}
            </button>
          ))}
        </div>

        <div className="glass-panel" style={{ padding: 24 }}>
          {tab === 'login' && <LoginForm />}
          {tab === 'register' && <RegisterForm />}
          {tab === 'claim' && <ClaimForm />}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState(null); // { resolver, phone }
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { signInWithEmailAndPassword, multiFactor } = await import('firebase/auth');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // If the user has MFA enrolled, signIn throws with a resolver.
      // (firebase sdk surfaces second factor as a MultiFactorError needing resolution)
      toast.success('Signed in');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/multi-factor-auth-required') {
        // Second factor required — set up the resolver to collect the code.
        setMfa({ resolver: err.resolver });
        setError(null);
      } else {
        setError(err?.message || 'Failed to sign in');
      }
      setLoading(false);
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError(null);
    try {
      const { multiFactor, PhoneMultiFactorGenerator, RecaptchaVerifier, TotpMultiFactorGenerator } = await import('firebase/auth');
      const factor = mfa.resolver.hints[0];
      if (factor.factorId === 'totp') {
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(factor, mfaCode);
        await mfa.resolver.resolveSignIn(assertion);
      } else {
        // SMS second factor — the resolver provides the phone number.
        const verifier = new RecaptchaVerifier('mfa-recaptcha', { size: 'invisible' }, auth);
        const assertion = PhoneMultiFactorGenerator.assertion(mfa.resolver, verifier, factor.phoneNumber);
        await mfa.resolver.resolveSignIn(assertion);
      }
      toast.success('Signed in!');
      // auth state updates → SignedIn renders
    } catch (err) {
      console.error(err);
      setMfaError(err?.message || 'Invalid code');
    } finally {
      setMfaLoading(false);
    }
  };

  if (mfa) {
    return (
      <form onSubmit={submitMfa}>
        <p className="muted mb-2" style={{ fontSize: '0.85rem' }}>
          Two-factor authentication required. Enter the code from your authenticator app or SMS.
        </p>
        <div className="field">
          <label>Verification code</label>
          <input
            className="input"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            inputMode="numeric"
            placeholder="123456"
            autoFocus
          />
        </div>
        <div id="mfa-recaptcha" />
        {mfaError && <ErrorBox msg={mfaError} />}
        <Button block type="submit" loading={mfaLoading} disabled={mfaCode.length < 6}>
          Verify code
        </Button>
        <button className="btn btn-ghost mt-1" onClick={() => setMfa(null)} style={{ width: '100%' }}>
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>{t('en', 'emailLabel')}</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>{t('en', 'passwordLabel')}</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <ErrorBox msg={error} />}
      <Button block type="submit" loading={loading} disabled={!email || !password}>
        {t('en', 'signIn')}
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('totp'); // 'totp' | 'sms'
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name || email.split('@')[0] });
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName: name || email.split('@')[0],
        role: 'customer',
        trusted: false,
        mfaMethod, // store enrollment intent; actual 2FA enrollment flows next
        createdAt: new Date().toISOString(),
      });
      toast.success('Account created. Set up 2FA.');
      // 2FA enrollment happens in SignedIn (mandatory)
    } catch (err) {
      setError(err?.message || 'Failed to register');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label>{t('en', 'displayName')}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'emailLabel')}</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'passwordLabel')}</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label>2FA method</label>
        <div className="row" style={{ gap: 8 }}>
          {[
            { k: 'totp', label: '🔐 Authenticator app' },
            { k: 'sms', label: '📱 SMS code' },
          ].map((m) => (
            <button
              key={m.k}
              type="button"
              className="btn"
              style={{
                padding: '8px 14px',
                borderRadius: 40,
                fontSize: '0.78rem',
                background: mfaMethod === m.k ? 'var(--glass-deep)' : 'var(--surface-glass)',
                color: mfaMethod === m.k ? '#fff' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
              onClick={() => setMfaMethod(m.k)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {error && <ErrorBox msg={error} />}
      <Button block type="submit" loading={loading} disabled={!email || !password || password.length < 6}>
        Create account
      </Button>
    </form>
  );
}

function ClaimForm() {
  const [orderId, setOrderId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Sign in first to claim an order.');
      const fn = httpsCallable(functions, 'claimOrder');
      await fn({ orderId, changePIN: pin });
      toast.success('Order claimed!');
      setOrderId('');
      setPin('');
    } catch (err) {
      setError(err?.message || 'Failed to claim order');
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="muted mb-2" style={{ fontSize: '0.82rem' }}>
        Claim an order to your account using the Order ID and change PIN from your receipt. You must be signed in.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label>{t('en', 'orderIdLabel')}</label>
          <input className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder={t('en', 'orderIdPh')} />
        </div>
        <div className="field">
          <label>{t('en', 'changePinLabel')}</label>
          <input className="input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="6-digit PIN" />
        </div>
        {error && <ErrorBox msg={error} />}
        <Button block type="submit" loading={loading} disabled={!orderId || !pin}>
          Claim order
        </Button>
      </form>
    </div>
  );
}

function SignedIn() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [need2fa, setNeed2fa] = useState(false);
  const [mfa, setMfa] = useState(null); // enrollment state
  const toast = useToast();

  // Load my orders
  const loadOrders = async () => {
    try {
      const fn = httpsCallable(functions, 'getMyOrders');
      const res = await fn();
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    loadOrders();
  }, []);

  // Check if 2FA is enrolled
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { multiFactor } = await import('firebase/auth');
        const mfaUser = multiFactor(user);
        const enrolled = await mfaUser.getEnrolledFactors();
        if (active) {
          if (enrolled.length === 0) setNeed2fa(true);
          else setMfa({ enrolled: enrolled.length });
        }
      } catch (err) {
        console.error('MFA check failed:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <span className="pill pill-info">{profile?.role}</span>
          {profile?.trusted && <span className="pill pill-success">✓ Trusted</span>}
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>

        <h2 className="page-title">Hi, {profile?.displayName || user?.email}</h2>
        <p className="page-sub">Your orders and account.</p>

        {need2fa && (
          <div className="glass-card mb-3" style={{ padding: 18, borderColor: 'var(--glass)' }}>
            <strong>🔐 Set up two-factor authentication</strong>
            <p className="muted" style={{ fontSize: '0.85rem', margin: '6px 0' }}>
              Two-factor authentication is required for customer accounts. Choose a method to continue.
            </p>
            <div className="row mt-1" style={{ gap: 8 }}>
              <Button variant="ghost" onClick={() => setMfa({ step: 'totp' })}>🔐 Authenticator app</Button>
              <Button variant="ghost" onClick={() => setMfa({ step: 'sms' })}>📱 SMS code</Button>
            </div>
          </div>
        )}

        {mfa && mfa.step && <EnrollMfa user={user} method={mfa.step} onDone={() => { setNeed2fa(false); setMfa(null); }} />}

        {orders.length === 0 ? (
          <p className="muted">{t('en', 'noOrders')}</p>
        ) : (
          <div className="grid-2">
            {orders.map((o) => (
              <div key={o.orderId} className="glass-card" style={{ padding: 18 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{o.orderId}</strong>
                  <Pill tone={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'danger' : 'info'}>{o.status}</Pill>
                </div>
                <div className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
                  {o.glassType} · {o.thickness} · {o.width}"×{o.height}"
                </div>
                {o.projectName && <div className="muted" style={{ fontSize: '0.8rem' }}>{o.projectName}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 2FA enrollment — TOTP or SMS via Firebase Multi-Factor.
function EnrollMfa({ user, method, onDone }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationId, setVerificationId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const startTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { multiFactor, TotpMultiFactorGenerator } = await import('firebase/auth');
      const mfaUser = multiFactor(user);
      const session = await mfaUser.getSession();
      const assertion = await TotpMultiFactorGenerator.assertionForEnrollment(mfaUser, session);
      const opts = assertion.factorEnrollmentOptions;
      setQr(opts && opts.generateQrCodeUrl ? opts.generateQrCodeUrl() : null);
      setSecret(opts && opts.secret ? opts.secret : null);
      window.__totpAssertion = assertion;
    } catch (err) {
      setError(err?.message || 'Failed to start TOTP enrollment');
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    setLoading(true);
    setError(null);
    try {
      const { multiFactor } = await import('firebase/auth');
      const mfaUser = multiFactor(user);
      const assertion = window.__totpAssertion;
      if (!assertion) throw new Error('Start enrollment first.');
      await mfaUser.enroll(assertion, 'Authenticator app');
      toast.success('2FA enabled!');
      onDone();
    } catch (err) {
      setError(err?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const startSms = async () => {
    setLoading(true);
    setError(null);
    try {
      const { multiFactor, PhoneMultiFactorGenerator, RecaptchaVerifier } = await import('firebase/auth');
      const mfaUser = multiFactor(user);
      const session = await mfaUser.getSession();
      const verifier = new RecaptchaVerifier('recaptcha', { size: 'invisible' }, auth);
      const phoneInfo = PhoneMultiFactorGenerator.assertion(mfaUser, verifier, phone);
      const vid = await phoneInfo.verificationId;
      setVerificationId(vid);
    } catch (err) {
      setError(err?.message || 'Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  const verifySms = async () => {
    setLoading(true);
    setError(null);
    try {
      const { multiFactor, PhoneMultiFactorGenerator, PhoneAuthProvider } = await import('firebase/auth');
      const mfaUser = multiFactor(user);
      const cred = PhoneAuthProvider.credential(verificationId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      await mfaUser.enroll(assertion, 'Phone SMS');
      toast.success('2FA enabled!');
      onDone();
    } catch (err) {
      setError(err?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  if (method === 'totp') {
    return (
      <div className="glass-card mb-3" style={{ padding: 18, borderColor: 'var(--glass)' }}>
        <strong>Authenticator app</strong>
        {!qr ? (
          <>
            <p className="muted" style={{ fontSize: '0.82rem', margin: '6px 0' }}>
              Open Google Authenticator / Authy, scan the QR, then enter the 6-digit code.
            </p>
            <Button loading={loading} onClick={startTotp}>Generate QR</Button>
          </>
        ) : (
          <>
            {qr && <img src={qr} alt="TOTP QR" style={{ width: 180, height: 180, borderRadius: 10, margin: '10px 0' }} />}
            {secret && (
              <p className="muted" style={{ fontSize: '0.75rem', wordBreak: 'break-all', margin: '6px 0' }}>
                Manual entry: <code>{secret}</code>
              </p>
            )}
            <div className="field">
              <label>Enter code</label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" />
            </div>
            {error && <ErrorBox msg={error} />}
            <Button loading={loading} onClick={verifyTotp} disabled={code.length < 6}>Enable 2FA</Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card mb-3" style={{ padding: 18, borderColor: 'var(--glass)' }}>
      <strong>SMS code</strong>
      {!verificationId ? (
        <>
          <div className="field">
            <label>Phone number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+17875550123" />
          </div>
          <div id="recaptcha" />
          {error && <ErrorBox msg={error} />}
          <Button loading={loading} onClick={startSms} disabled={!phone}>Send code</Button>
        </>
      ) : (
        <>
          <div className="field">
            <label>Enter code from SMS</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" />
          </div>
          {error && <ErrorBox msg={error} />}
          <Button loading={loading} onClick={verifySms} disabled={code.length < 6}>Verify & enable</Button>
        </>
      )}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="glass-card mb-2" style={{ padding: 12, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
      <strong style={{ color: '#b91c1c', fontSize: '0.85rem' }}>✕ {msg}</strong>
    </div>
  );
}
