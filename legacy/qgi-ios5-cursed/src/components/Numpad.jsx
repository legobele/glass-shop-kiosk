import { useState } from 'react';
import { FRACTIONS, fracToLabel } from '../lib/fractions';

/**
 * iOS 5 keyboard-style numpad for fractional inch entry.
 * Dark keyboard chrome, glossy keys, aqua confirm.
 */
const KEY_STYLE = {
  background: 'linear-gradient(180deg, #fdfdfd 0%, #f2f2f2 50%, #e0e0e0 100%)',
  border: '1px solid #9a9a9a',
  borderRadius: 6,
  boxShadow: '0 1px 0 #fff inset, 0 -1px 2px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.2)',
  color: '#000',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
};

export default function Numpad({ label, onConfirm, onCancel, initial = 0 }) {
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
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a4a4a', marginBottom: 8 }}>
        {label}
      </p>
      <div
        style={{
          background: '#fff',
          border: '1px solid #b5b5b5',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: '1.6rem',
          fontWeight: 700,
          textAlign: 'right',
          marginBottom: 12,
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        }}
      >
        {display}
      </div>
      <div
        style={{
          background: '#d1d4db',
          borderRadius: 8,
          padding: 10,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 8 }}>
          {['7','8','9','4','5','6','1','2','3','0','00','⌫'].map((k) => (
            <button
              key={k}
              style={{ ...KEY_STYLE, padding: 12, fontSize: '1.05rem' }}
              onClick={() => key(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4a4a4a', margin: '4px 0 6px', textAlign: 'center' }}>
          Fraction (inches)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, marginBottom: 4 }}>
          {FRACTIONS.map((f) => {
            const sel = Math.abs((frac || 0) - f.val) < 0.001;
            return (
              <button
                key={f.label}
                style={{
                  ...KEY_STYLE,
                  padding: '7px 2px',
                  fontSize: '0.72rem',
                  background: sel
                    ? 'linear-gradient(180deg, #6db5f6 0%, #0e6fd8 100%)'
                    : KEY_STYLE.background,
                  color: sel ? '#fff' : '#000',
                }}
                onClick={() => setFrac(f.val)}
              >
                {f.val === 0 ? '0"' : f.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={total <= 0} onClick={() => onConfirm(total)}>
          OK
        </button>
      </div>
    </div>
  );
}
