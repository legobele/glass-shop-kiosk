import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { GLASS_CATALOG, THICKNESS_ORDER, THICK_MM } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'type', 'size', 'thick', 'color', 'add', 'pay', 'review'];

export default function ThickStep() {
  const { lang, setStep, order, set } = useKiosk();
  const catalog = GLASS_CATALOG[order.glassType] || {};
  const thickSet = new Set();
  Object.values(catalog).forEach((ths) => ths.forEach((th) => thickSet.add(th)));
  const available = THICKNESS_ORDER.filter((th) => thickSet.has(th));

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 640 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>QGI</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(3)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={3} />
        <h2 className="page-title mt-3">{t(lang, 'thickTitle')}</h2>
        <p className="page-sub">{t(lang, 'thickSub')}</p>

        <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14 }}>
          {available.map((th) => {
            const sel = order.thickness === th;
            const height = { '1/8"': 10, '5/32"': 14, '3/16"': 18, '1/4"': 24, '5/16"': 30, '3/8"': 38, '1/2"': 50, '5/8"': 64, '3/4"': 78 }[th] || 24;
            return (
              <div
                key={th}
                className="glass-card"
                onClick={() => set({ thickness: th, color: null })}
                style={{
                  padding: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                  border: sel ? '2px solid var(--glass)' : '1px solid var(--border)',
                  boxShadow: sel ? 'var(--glow-md)' : undefined,
                }}
              >
                <div
                  style={{
                    height: 90,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg,#d8eaf6,#b8d4ee)',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height,
                      background: 'linear-gradient(90deg,rgba(255,255,255,.65),rgba(200,220,240,.9))',
                      border: '1px solid rgba(0,91,170,.22)',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>{th}</span>
                  </div>
                </div>
                <div className="card-name" style={{ fontWeight: 700 }}>{th}</div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>{THICK_MM[th]}</div>
                {order.glassType === 'laminated' && (
                  <span className="pill pill-info" style={{ marginTop: 6 }}>X/2+PVB+X/2</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3">
          <Button block disabled={!order.thickness} onClick={() => setStep(5)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
