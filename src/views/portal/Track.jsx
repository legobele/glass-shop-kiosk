import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { t } from '../../i18n';
import { functions } from '../../firebase';
import { GLASS_TYPES, COLOR_KEYS } from '../../data/catalog';
import { fracToLabel } from '../../lib/fractions';
import Button from '../../components/Button';
import Pill from '../../components/Pill';

const STATUS_TONE = {
  pending: 'warn',
  'in-progress': 'info',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

export default function Track() {
  const [params] = useSearchParams();
  const [lang, setLang] = useState('en');
  const [orderId, setOrderId] = useState(params.get('order') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 520 }}>
        <div className="row mb-3">
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
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

        {error && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
            <strong style={{ color: '#b91c1c' }}>✕ {error}</strong>
          </div>
        )}

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
                {order.glassType ? t(lang, GLASS_TYPES[order.glassType].labelKey) : ''} ·{' '}
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
