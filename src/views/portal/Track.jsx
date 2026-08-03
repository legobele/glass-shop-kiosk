import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { t } from '../../i18n';
import { functions } from '../../firebase';
import { GLASS_TYPES, COLOR_KEYS } from '../../data/catalog';
import { fracToLabel } from '../../lib/fractions';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast';

const STATUS_TONE = {
  pending: 'warn',
  'in-progress': 'info',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

export default function Track() {
  const [params] = useSearchParams();
  const { user, profile } = useAuth();
  const toast = useToast();
  const [lang, setLang] = useState('en');
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const getOrder = httpsCallable(functions, 'getOrder');
      const res = await getOrder({ orderId });
      setOrder(res.data);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  // Is this signed-in customer the owner of the looked-up order?
  const isOwner = user && order && profile?.role === 'customer';

  // Request an order change — trusted customers skip the PIN (server-verified)
  // but still see the warning before it executes.
  const requestChange = async (patch) => {
    setSaving(true);
    setError(null);
    try {
      const editOrder = httpsCallable(functions, 'editOrder');
      await editOrder({ orderId: order.orderId, changePIN: pin, ...patch });
      toast.success('Order updated');
      setOrder({ ...order, ...patch });
      setPin('');
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const confirmChange = (patch, label) => {
    const isTrusted = profile?.trusted === true;
    // Trusted: warn, then proceed without PIN.
    if (isTrusted) {
      if (confirm(`⚠️ Confirm change: ${label}?`)) requestChange(patch);
      return;
    }
    // Non-trusted: require PIN + warning.
    if (!pin.trim()) {
      alert('Enter your change PIN to authorize this change.');
      return;
    }
    if (confirm(`${label}? This change is authorized by your PIN.`)) requestChange(patch);
  };

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 520 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          {user ? (
            <span className="pill pill-info">{profile?.displayName || user.email}</span>
          ) : (
            <a href="#/account" style={{ fontSize: '0.8rem' }}>Customer account →</a>
          )}
          <button className="btn btn-ghost" onClick={() => setLang(lang === 'en' ? 'es' : 'en')}>
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
        <h2 className="page-title">{t(lang, 'trackTitle')}</h2>
        <p className="page-sub">{t(lang, 'trackSub')}</p>

        <div className="glass-card" style={{ padding: 24 }}>
          <div className="field">
            <label>{t(lang, 'orderIdLabel')}</label>
            <input
              className="input"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder={t(lang, 'orderIdPh')}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
            />
          </div>
          <Button block loading={loading} onClick={lookup} disabled={!orderId.trim()}>
            {t(lang, 'trackBtn')}
          </Button>
        </div>

        {error && <ErrorBox msg={error} />}

        {order && (
          <div className="glass-card mt-2" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>{order.orderId}</strong>
              <Pill tone={STATUS_TONE[order.status] || 'neutral'}>
                {t(lang, 'st' + order.status[0].toUpperCase() + order.status.slice(1))}
              </Pill>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{t(lang, 'nameLabel')}</span>
              <strong>{order.customerName}</strong>
            </div>
            {order.projectName && (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="muted">{t(lang, 'projLabel')}</span>
                <strong>{order.projectName}</strong>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{t(lang, 'revGlass')}</span>
              <strong>
                {order.glassType ? t(lang, GLASS_TYPES[order.glassType]?.labelKey || 'tFloat') : ''} ·{' '}
                {order.color ? t(lang, COLOR_KEYS[order.color] || 'cClear') : ''} · {order.thickness}
              </strong>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted">{t(lang, 'revDims')}</span>
              <strong>
                {fracToLabel(order.width)} x {fracToLabel(order.height)}
              </strong>
            </div>
            {order.isFullLite && <Pill tone="warn">⚠️ {t(lang, 'flTitle')}</Pill>}

            {/* change request — signed-in owner only */}
            {isOwner && (
              <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <strong style={{ fontSize: '0.9rem' }}>Request a change</strong>
                {profile?.trusted === true ? (
                  <div className="pill pill-success" style={{ margin: '8px 0' }}>
                    ✓ You're a trusted customer — changes don't need your PIN, but a confirmation will appear.
                  </div>
                ) : (
                  <div className="field mt-1">
                    <label>{t(lang, 'changePinLabel')}</label>
                    <input
                      className="input"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="6-digit change PIN"
                      inputMode="numeric"
                    />
                  </div>
                )}
                <div className="row" style={{ gap: 8 }}>
                  <Button variant="ghost" loading={saving} onClick={() => confirmChange({ customerName: order.customerName }, 'Update contact')}>
                    Update contact
                  </Button>
                  <Button variant="ghost" loading={saving} onClick={() => confirmChange({ projectName: order.projectName }, 'Update project')}>
                    Update project
                  </Button>
                </div>
                <p className="muted mt-1" style={{ fontSize: '0.75rem' }}>
                  {t(lang, 'callUsSub')} · 📞 {t(lang, 'phoneDisplay')}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="glass-card mt-2" style={{ padding: 18 }}>
          <strong>📞 {t(lang, 'callUs')}</strong>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '6px 0' }}>{t(lang, 'callUsSub')}</p>
          <a className="btn btn-primary" style={{ marginTop: 8 }} href="tel:+17877649404">
            {t(lang, 'callNow')} {t(lang, 'phoneDisplay')}
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
      <strong style={{ color: '#b91c1c' }}>✕ {msg}</strong>
    </div>
  );
}
