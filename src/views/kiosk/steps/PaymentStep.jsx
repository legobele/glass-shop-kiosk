import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'type', 'size', 'thick', 'color', 'add', 'pay', 'review'];

const METHODS = [
  { key: 'cash', icon: '💵', labelKey: 'payCash' },
  { key: 'credit-debit', icon: '💳', labelKey: 'payCard' },
  { key: 'apple-google-ath', icon: '📱', labelKey: 'payDigital' },
];

export default function PaymentStep() {
  const { lang, setStep, order, set } = useKiosk();

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 560 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(6)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={6} />
        <h2 className="page-title mt-3">{t(lang, 'payTitle')}</h2>
        <p className="page-sub">{t(lang, 'paySub')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {METHODS.map((m) => {
            const sel = order.paymentMethod === m.key;
            return (
              <div
                key={m.key}
                className="glass-card"
                onClick={() => set({ paymentMethod: m.key })}
                style={{
                  padding: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  border: sel ? '2px solid var(--glass)' : '1px solid var(--border)',
                  boxShadow: sel ? 'var(--glow-md)' : undefined,
                  background: sel ? 'rgba(56,189,248,0.1)' : undefined,
                }}
              >
                <span style={{ fontSize: 26 }}>{m.icon}</span>
                <strong style={{ fontSize: '0.9rem' }}>{t(lang, m.labelKey)}</strong>
              </div>
            );
          })}
        </div>

        <div className="glass-card mt-2" style={{ padding: 16, borderColor: 'rgba(16,185,129,0.5)' }}>
          <strong style={{ color: '#047857' }}>🧾 {t(lang, 'payNoticeTitle')}</strong>
          <p style={{ fontSize: '0.82rem', color: '#065f46', marginTop: 4 }}>{t(lang, 'payNoticeDesc')}</p>
        </div>

        <div className="mt-3">
          <Button block disabled={!order.paymentMethod} onClick={() => setStep(8)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
