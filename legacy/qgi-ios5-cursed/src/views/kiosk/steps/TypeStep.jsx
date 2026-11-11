import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_TYPES, typesForThickness } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'thick', 'type', 'size', 'color', 'add', 'pay', 'review'];

export default function TypeStep() {
  const { lang, setStep, order, set } = useKiosk();
  const supported = typesForThickness(order.thickness);

  const pickBase = (type) => {
    const isTempered = type === 'laminated' ? false : order.isTempered;
    const isUltraClear = type === 'laminated' ? false : order.isUltraClear;
    const glassType = resolveType(type, isTempered, isUltraClear);
    // thickness was chosen before this step — keep it if this type supports it
    const thicknessOk = order.thickness && typesForThickness(order.thickness).includes(glassType);
    set({
      baseType: type,
      isTempered,
      isUltraClear,
      glassType,
      thickness: thicknessOk ? order.thickness : null,
      color: null,
    });
  };

  const resolveType = (base, tempered, ultra) => {
    if (base === 'laminated') return 'laminated';
    if (ultra && tempered) return 'ultra-clear-tempered';
    if (ultra) return 'ultra-clear-float';
    if (tempered) return 'tempered';
    return 'float';
  };

  const toggle = (key) => {
    if (order.baseType !== 'float') return;
    const isTempered = key === 'tempered' ? !order.isTempered : order.isTempered;
    const isUltraClear = key === 'ultraclear' ? !order.isUltraClear : order.isUltraClear;
    const glassType = resolveType(order.baseType, isTempered, isUltraClear);
    // switching to tempered/ultra-clear may change the thickness range
    const thicknessOk = order.thickness && typesForThickness(order.thickness).includes(glassType);
    set({
      isTempered,
      isUltraClear,
      glassType,
      thickness: thicknessOk ? order.thickness : null,
      color: null,
    });
  };

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(2)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={2} />
        <h2 className="page-title mt-3">{t(lang, 'typeTitle')}</h2>
        <p className="page-sub">{t(lang, 'typeSub')}</p>

        {!supported.length && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(245,158,11,0.5)', background: 'var(--warn-bg)' }}>
            <strong style={{ color: '#b45309' }}>⚠️ {t(lang, 'thickNoType')}</strong>
          </div>
        )}

        <div className="grid-2">
          {supported.map((type) => {
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
                  background: sel ? 'rgba(56,189,248,0.18)' : undefined,
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
          <Button block disabled={!order.glassType} onClick={() => setStep(4)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
