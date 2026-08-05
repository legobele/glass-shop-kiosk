import { useState } from 'react';
import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import { getLiteSizes, isFullLite } from '../../../data/catalog';
import { fracToLabel } from '../../../lib/fractions';
import Stepper from '../../../components/Stepper';
import Button from '../../../components/Button';
import Numpad from '../../../components/Numpad';
import Modal from '../../../components/Modal';

const STEP_IDS = ['customer', 'thick', 'type', 'size', 'color', 'add', 'pay', 'review'];

export default function SizeStep() {
  const { lang, setStep, order, set } = useKiosk();
  const [target, setTarget] = useState(null); // 'width' | 'height'

  const sizes = getLiteSizes(order.glassType, order.color, order.thickness);
  const fullLite = isFullLite(order.width, order.height, order.glassType, order.color, order.thickness);

  const confirm = (val) => {
    const patch = target === 'width' ? { width: val } : { height: val };
    set(patch);
    setTarget(null);
  };

  const bothSet = order.width && order.height;

  return (
    <div className="page">
      <div className="page-main" style={{ maxWidth: 560 }}>
        <div className="row mb-3">
          <span className="muted-on-dark" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Quality Glass</span>
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={() => setStep(3)}>←</button>
        </div>
        <Stepper steps={STEP_IDS} current={3} />
        <h2 className="page-title mt-3">{t(lang, 'sizeTitle')}</h2>
        <p className="page-sub">{t(lang, 'sizeSub')}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {[
            { key: 'width', label: t(lang, 'wLabel'), val: order.width },
            { key: 'height', label: t(lang, 'hLabel'), val: order.height },
          ].map((f) => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <button
                className="glass-card"
                onClick={() => setTarget(f.key)}
                style={{
                  padding: '18px 20px',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: f.val ? 'var(--text)' : 'var(--text-3)',
                  border: f.val ? '2px solid var(--glass)' : '1px solid var(--border)',
                  minHeight: 64,
                  cursor: 'pointer',
                }}
              >
                {f.val ? fracToLabel(f.val) : '—'}
              </button>
            </div>
          ))}
        </div>
        <p className="muted" style={{ textAlign: 'center', fontSize: '0.78rem', marginTop: 4 }}>
          {t(lang, 'inchesUnit')}
        </p>

        <div className="glass-card mt-2" style={{ padding: 16 }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8 }}>
            {t(lang, 'maxCutHdr')}
          </h4>
          {sizes.map((s, i) => (
            <div key={i} className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
              <span>
                {t(lang, 'wLabel')}: {s.w - 1}" &nbsp; {t(lang, 'hLabel')}: {s.h - 1}"
              </span>
              <span className="muted">({s.w}"×{s.h}" lite)</span>
            </div>
          ))}
        </div>

        {fullLite && bothSet && (
          <div className="glass-card mt-2" style={{ padding: 14, borderColor: 'rgba(245,158,11,0.5)', background: 'var(--warn-bg)' }}>
            <strong style={{ color: '#b45309' }}>⚠️ {t(lang, 'flTitle')}</strong>
            <p style={{ fontSize: '0.82rem', color: '#92400e', marginTop: 4 }}>{t(lang, 'flDesc')}</p>
          </div>
        )}

        <div className="mt-3">
          <Button block disabled={!bothSet} onClick={() => setStep(5)}>
            {t(lang, 'continueBtn')}
          </Button>
        </div>

        <Modal open={!!target} onClose={() => setTarget(null)}>
          <Numpad
            label={target === 'width' ? `${t(lang, 'wLabel')} (${t(lang, 'inchesUnit')})` : `${t(lang, 'hLabel')} (${t(lang, 'inchesUnit')})`}
            onConfirm={confirm}
            onCancel={() => setTarget(null)}
            initial={target === 'width' ? order.width : order.height}
          />
        </Modal>
      </div>
    </div>
  );
}
