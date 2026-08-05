import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_CATALOG, COLOR_KEYS, COLOR_SWATCH, colorFitsSize } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'thick', 'type', 'size', 'color', 'add', 'pay', 'review'];

export default function ColorStep() {
  const { lang, setStep, order, set } = useKiosk();
  const catalog = GLASS_CATALOG[order.glassType] || {};
  const available = Object.entries(catalog).filter(([, ths]) => ths.includes(order.thickness));
  // width/height chosen in the previous step — hide colors that can't be cut that big
  const fits = (colorKey) =>
    colorFitsSize(order.width, order.height, order.glassType, colorKey, order.thickness);
  const shown = available.filter(([colorKey]) => fits(colorKey));

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(4)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={4} />
        <h2 className="page-title mt-3">{t(lang, 'colorTitle')}</h2>
        <p className="page-sub">{t(lang, 'colorSub')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14 }}>
          {shown.map(([colorKey]) => {
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

        {!shown.length && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(245,158,11,0.5)', background: 'var(--warn-bg)' }}>
            <strong style={{ color: '#b45309' }}>⚠️ {t(lang, 'colorNoFit')}</strong>
          </div>
        )}

        <div className="mt-3">
          <Button block disabled={!order.color} onClick={() => setStep(6)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
