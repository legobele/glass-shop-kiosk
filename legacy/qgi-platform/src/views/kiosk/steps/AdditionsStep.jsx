import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'thick', 'type', 'size', 'color', 'add', 'pay', 'review'];

const ADDITIONS = [
  { key: 'beveling', icon: '📐', nameKey: 'addBevName', descKey: 'addBevDesc' },
  { key: 'diamonfusion', icon: '💧', nameKey: 'addDFName', descKey: 'addDFDesc' },
  { key: 'edgerounding', icon: '⭕', nameKey: 'addERName', descKey: 'addERDesc' },
  { key: 'sandblasting', icon: '🌫️', nameKey: 'addSBName', descKey: 'addSBDesc' },
];

export default function AdditionsStep() {
  const { lang, setStep, order, set } = useKiosk();

  const toggle = (key) => {
    const st = order.additions[key];
    set({ additions: { ...order.additions, [key]: { ...st, active: !st.active } } });
  };

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(5)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={5} />
        <h2 className="page-title mt-3">{t(lang, 'addTitle')}</h2>
        <p className="page-sub">{t(lang, 'addSub')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
          {ADDITIONS.map((a) => {
            const st = order.additions[a.key];
            const sel = st.active;
            return (
              <div
                key={a.key}
                className="glass-card"
                onClick={() => toggle(a.key)}
                style={{
                  padding: 18,
                  cursor: 'pointer',
                  border: sel ? '2px solid var(--success)' : '1px solid var(--border)',
                  background: sel ? 'rgba(16,185,129,0.08)' : undefined,
                }}
              >
                <div className="row" style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: '1.3rem' }}>{a.icon}</span>
                  <strong style={{ flex: 1 }}>{t(lang, a.nameKey)}</strong>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: '2px solid var(--border)',
                      background: sel ? 'var(--success)' : 'transparent',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {sel ? '✓' : ''}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {t(lang, a.descKey)}
                </p>
                {a.key === 'diamonfusion' && sel && (
                  <div style={{ marginTop: 10, fontSize: '0.78rem' }}>
                    <div className="pill pill-warn">⚠️ {t(lang, 'dfWarn')}</div>
                    <div className="pill pill-success" style={{ marginTop: 6 }}>
                      ✅ {t(lang, 'dfWarranty')}
                      {t(lang, 'dfWarrantyDesc')}
                    </div>
                  </div>
                )}
                {a.key === 'beveling' && sel && (
                  <div style={{ marginTop: 10 }}>
                    <label className="muted" style={{ fontSize: '0.78rem' }}>
                      {t(lang, 'bevelAngle')}: <strong>{st.angle}°</strong>
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={45}
                      value={st.angle}
                      onChange={(e) => set({ additions: { ...order.additions, beveling: { ...st, angle: +e.target.value } } })}
                      style={{ width: '100%', accentColor: 'var(--glass)' }}
                    />
                    <p className="muted" style={{ fontSize: '0.72rem' }}>{t(lang, 'bevelNote')}</p>
                  </div>
                )}
                {a.key === 'edgerounding' && sel && (
                  <div style={{ marginTop: 10 }}>
                    <label className="muted" style={{ fontSize: '0.78rem' }}>
                      {t(lang, 'erRadius')}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 6 }}>
                      {[0, 1 / 8, 1 / 4, 3 / 8, 1 / 2].map((r) => (
                        <button
                          key={r}
                          className="btn btn-ghost"
                          style={{ padding: '6px 4px', fontSize: '0.72rem', borderRadius: 8 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            set({ additions: { ...order.additions, edgerounding: { ...st, radius: r } } });
                          }}
                        >
                          {r === 0 ? '—' : `${r}"`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {a.key === 'sandblasting' && sel && (
                  <p className="muted mt-1" style={{ fontSize: '0.75rem' }}>{t(lang, 'sbNote')}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Button block onClick={() => setStep(7)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
