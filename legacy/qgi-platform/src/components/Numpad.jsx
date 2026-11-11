import { useState } from 'react';
import { FRACTIONS, fracToLabel } from '../lib/fractions';

/**
 * Custom kiosk-style numpad for fractional inch entry.
 * whole inches grid + fraction grid (1/16" steps).
 */
export default function Numpad({
  label,
  onConfirm,
  onCancel,
  initial = 0,
  maxWhole = 999,
}) {
  const [whole, setWhole] = useState(initial ? String(Math.floor(initial)) : '');
  const [frac, setFrac] = useState(initial % 1);

  const total = (parseInt(whole) || 0) + (frac || 0);
  const display = total === 0 ? '—' : fracToLabel(total);

  const key = (v) => {
    if (v === '⌫') setWhole((w) => w.slice(0, -1));
    else if (v === '00') setWhole((w) => (w.length < 3 ? w + '00' : w));
    else setWhole((w) => (w.length < 4 ? w + v : w));
  };

  return (
    <div style={{ padding: 4 }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8 }}>
        {label}
      </p>
      <div
        style={{
          background: 'var(--surface-strong)',
          border: '2px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          fontSize: '1.7rem',
          fontWeight: 700,
          textAlign: 'right',
          marginBottom: 14,
          fontFamily: 'var(--font-display)',
        }}
      >
        {display}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
        {['7','8','9','4','5','6','1','2','3','0','00','⌫'].map((k) => (
          <button
            key={k}
            className="btn btn-ghost"
            style={{ padding: 14, fontSize: '1.1rem', borderRadius: 12 }}
            onClick={() => key(k)}
          >
            {k}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>
        Fraction (inches)
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
        {FRACTIONS.map((f) => {
          const sel = Math.abs((frac || 0) - f.val) < 0.001;
          return (
            <button
              key={f.label}
              className="btn btn-ghost"
              onClick={() => setFrac(f.val)}
              style={{
                padding: '8px 4px',
                fontSize: '0.78rem',
                borderRadius: 10,
                border: sel ? '2px solid var(--glass)' : undefined,
                background: sel ? 'rgba(56,189,248,0.18)' : undefined,
              }}
            >
              {f.val === 0 ? '0"' : f.label}
            </button>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={total <= 0}
          onClick={() => onConfirm(total)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
