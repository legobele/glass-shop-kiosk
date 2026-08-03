import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_TYPES } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'type', 'size', 'thick', 'color', 'add', 'pay', 'review'];

export default function TypeStep() {
  const { lang, setStep, order, set } = useKiosk();

  const pickBase = (type) => {
    const patch = { baseType: type };
    if (type === 'laminated') {
      patch.isTempered = false;
      patch.isUltraClear = false;
    }
    resolve(type, patch.isTempered ?? order.isTempered, patch.isUltraClear ?? order.isUltraClear);
  };

  const resolve = (base, tempered, ultra) => {
    let glassType = null;
    if (base === 'laminated') glassType = 'laminated';
    else if (ultra && tempered) glassType = 'ultra-clear-tempered';
    else if (ultra) glassType = 'ultra-clear-float';
    else if (tempered) glassType = 'tempered';
    else glassType = 'float';
    set({ glassType, thickness: null, color: null });
  };

  const toggle = (key) => {
    const isTempered = key === 'tempered' ? !order.isTempered : order.isTempered;
    const isUltraClear = key === 'ultraclear' ? !order.isUltraClear : order.isUltraClear;
    set({ isTempered, isUltraClear });
    resolve(order.baseType, isTempered, isUltraClear);
  };

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(1)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={1} />
        <h2 className="page-title mt-3">{t(lang, 'typeTitle')}</h2>
        <p className="page-sub">{t(lang, 'typeSub')}</p>

        <div className="grid-2">
          {['float', 'laminated'].map((type) => {
            const info = GLASS_TYPES[type];
            const sel = order.baseType === type;
            return (
              <div
                key={type}
                className="glass-card"
                onClick={() => pickBase(type)}
                style={{
                  padding: 22,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 14,
                  alignItems: 'center',
                  border: sel ? '2px solid var(--glass)' : '1px solid var(--border)',
                  boxShadow: sel ? 'var(--glow-md)' : undefined,
                  background: sel ? 'rgba(56,189,248,0.1)' : undefined,
                }}
              >
                <span style={{ fontSize: 30 }}>{info.icon}</span>
                <div>
                  <h3 style={{ fontSize: '1rem' }}>{t(lang, info.labelKey)}</h3>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                    {t(lang, info.descKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* modifier switches — enabled only for float */}
        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          {[
            { key: 'tempered', label: t(lang, 'swTemp'), icon: '🔥' },
            { key: 'ultraclear', label: t(lang, 'swUC'), icon: '💎' },
          ].map((sw) => {
            const on = sw.key === 'tempered' ? order.isTempered : order.isUltraClear;
            const disabled = order.baseType !== 'float';
            return (
              <button
                key={sw.key}
                className="btn"
                onClick={() => toggle(sw.key)}
                disabled={disabled}
                style={{
                  padding: '10px 18px',
                  borderRadius: 40,
                  background: on ? 'var(--glass-deep)' : 'var(--surface-glass)',
                  color: on ? '#fff' : 'var(--text)',
                  border: on ? '1px solid var(--glass)' : '1px solid var(--border)',
                  opacity: disabled ? 0.4 : 1,
                  pointerEvents: disabled ? 'none' : 'auto',
                }}
              >
                {sw.icon} {sw.label}
              </button>
            );
          })}
        </div>

        {order.glassType && (
          <div className="glass-card mt-2" style={{ padding: '12px 18px', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{t(lang, 'selType')}</span>
            <strong style={{ color: 'var(--glass-deep)' }}>{t(lang, GLASS_TYPES[order.glassType].labelKey)}</strong>
          </div>
        )}

        <div className="mt-3">
          <Button block disabled={!order.glassType} onClick={() => setStep(3)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
