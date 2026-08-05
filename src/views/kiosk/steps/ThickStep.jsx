import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { allThicknesses, THICK_MM } from '../../../data/catalog';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';

const STEP_IDS = ['customer', 'thick', 'type', 'size', 'color', 'add', 'pay', 'review'];

export default function ThickStep() {
  const { lang, setStep, order, set } = useKiosk();
  const available = allThicknesses();

  const idx = available.indexOf(order.thickness);
  const current = idx >= 0 ? idx : 0;

  const pick = (th) => set({ thickness: th, color: null });

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 560 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(1)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={1} />
        <h2 className="page-title mt-3">{t(lang, 'thickTitle')}</h2>
        <p className="page-sub">{t(lang, 'thickSub')}</p>

        <div className="glass-card" style={{ padding: '26px 24px', marginTop: 6 }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--glass-deep)' }}>
              {available[current] || '—'}
            </div>
            <div className="muted" style={{ fontSize: '0.85rem' }}>{THICK_MM[available[current]] || ''}</div>
          </div>

          <input
            type="range"
            min={0}
            max={available.length - 1}
            step={1}
            value={current}
            onChange={(e) => pick(available[+e.target.value])}
            style={{ width: '100%', accentColor: 'var(--glass-deep)', cursor: 'pointer' }}
            aria-label={t(lang, 'thickTitle')}
          />

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'var(--text-3)' }}>
            <span>{available[0]}</span>
            <span>{available[available.length - 1]}</span>
          </div>

          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 16, justifyContent: 'center' }}>
            {available.map((th) => (
              <button
                key={th}
                className="btn btn-ghost"
                onClick={() => pick(th)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  borderRadius: 20,
                  border: th === available[current] ? '2px solid var(--glass)' : '1px solid var(--border)',
                  background: th === available[current] ? 'rgba(56,189,248,0.18)' : undefined,
                }}
              >
                {th}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Button block disabled={!order.thickness} onClick={() => setStep(3)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
