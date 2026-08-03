import { useState } from 'react';
import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_TYPES, COLOR_KEYS } from '../../../data/catalog';
import { fracToLabel } from '../../../lib/fractions';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase';

const STEP_IDS = ['customer', 'type', 'size', 'thick', 'color', 'add', 'pay', 'review'];

export default function ReviewStep() {
  const { lang, setStep, order, set } = useKiosk();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const additionsList = Object.entries(order.additions)
    .filter(([, v]) => v.active)
    .map(([k, v]) => {
      if (k === 'beveling') return `beveling:angle=${v.angle}`;
      if (k === 'edgerounding') return `edgerounding:radius=${fracToLabel(v.radius)}`;
      return k;
    });

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      customerName: order.customerName,
      projectName: order.projectName,
      contact: order.contact,
      glassType: order.glassType,
      color: order.color,
      thickness: order.thickness,
      width: order.width,
      height: order.height,
      additions: additionsList,
      payment: order.paymentMethod,
      isFullLite: order.isFullLite,
      lang,
    };
    try {
      const placeOrder = httpsCallable(functions, 'placeOrder');
      const res = await placeOrder(payload);
      const data = res.data;
      set({ result: { orderId: data.orderId, changePIN: data.changePIN } });
      setStep(9);
    } catch (err) {
      console.error('Order error:', err);
      setError(err?.message || 'Failed to place order. Please try again.');
      setSubmitting(false);
    }
  };

  const rows = [
    { label: t(lang, 'revType'), val: order.glassType ? t(lang, GLASS_TYPES[order.glassType].labelKey) : '—' },
    { label: t(lang, 'revDims'), val: `${fracToLabel(order.width)} x ${fracToLabel(order.height)}${order.isFullLite ? ' ⚠️' : ''}` },
    { label: t(lang, 'thickTitle'), val: order.thickness || '—' },
    { label: t(lang, 'colorTitle'), val: order.color ? t(lang, COLOR_KEYS[order.color] || 'cClear') : '—' },
    {
      label: t(lang, 'revMethod'),
      val: order.paymentMethod
        ? t(lang, { cash: 'payCash', 'credit-debit': 'payCard', 'apple-google-ath': 'payDigital' }[order.paymentMethod])
        : '—',
    },
  ];

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 560 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(7)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={7} />
        <h2 className="page-title mt-3">{t(lang, 'reviewTitle')}</h2>
        <p className="page-sub">{t(lang, 'reviewSub')}</p>

        <div className="glass-card" style={{ padding: 24 }}>
          <div className="review-section-title" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>
            {t(lang, 'revCustomer')}
          </div>
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

          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

          <div className="review-section-title" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>
            {t(lang, 'revGlass')}
          </div>
          {rows.map((r) => (
            <div key={r.label} className="row" style={{ justifyContent: 'space-between', padding: '3px 0' }}>
              <span className="muted">{r.label}</span>
              <strong>{r.val}</strong>
            </div>
          ))}

          {additionsList.length > 0 && (
            <>
              <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
              <div className="review-section-title" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>
                {t(lang, 'revAdditions')}
              </div>
              {additionsList.map((a) => (
                <div key={a} className="row" style={{ padding: '3px 0' }}>
                  <span className="muted">✓</span>
                  <strong>{a.split(':')[0]}</strong>
                </div>
              ))}
            </>
          )}
        </div>

        {order.isFullLite && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(245,158,11,0.5)', background: 'var(--warn-bg)' }}>
            <strong style={{ color: '#b45309' }}>⚠️ {t(lang, 'flTitle')}</strong>
            <p style={{ fontSize: '0.82rem', color: '#92400e', marginTop: 4 }}>{t(lang, 'flReviewNote')}</p>
          </div>
        )}

        {error && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.08)' }}>
            <strong style={{ color: '#b91c1c' }}>✕ {error}</strong>
          </div>
        )}

        <div className="mt-3">
          <Button block variant="success" loading={submitting} onClick={submit} disabled={submitting}>
            {t(lang, 'confirmBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
