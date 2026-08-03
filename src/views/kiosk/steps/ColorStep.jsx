import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_CATALOG, COLOR_KEYS, COLOR_SWATCH } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'type', 'size', 'thick', 'color', 'add', 'pay', 'review'];

export default function ColorStep() {
  const { lang, setStep, order, set } = useKiosk();
  const catalog = GLASS_CATALOG[order.glassType] || {};
  const available = Object.entries(catalog).filter(([, ths]) => ths.includes(order.thickness));

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(4)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={4} />
        <h2 className="page-title mt-3">{t(lang, 'colorTitle')}</h2>
        <p className="page-sub">{t(lang, 'colorSub')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14 }}>
          {available.map(([colorKey]) => {
            const sel = order.color === colorKey;
            const sw = COLOR_SWATCH[colorKey] || 'sw-clear';
            return (
              <div
                key={colorKey}
                className="glass-card"
                onClick={() => set({ color: colorKey })}
                style={{
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: sel ? '2px solid var(--glass)' : '1px solid var(--border)',
                  boxShadow: sel ? 'var(--glow-md)' : undefined,
                }}
              >
                <div className={sw} style={{ height: 90 }} />
                <div style={{ padding: '10px 12px', fontWeight: 600, fontSize: '0.85rem' }}>
                  {t(lang, COLOR_KEYS[colorKey] || 'cClear')}
                  {sel && <span style={{ float: 'right', color: 'var(--glass-deep)' }}>✓</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Button block disabled={!order.color} onClick={() => setStep(6)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
