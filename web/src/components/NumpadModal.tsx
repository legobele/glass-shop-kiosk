import { useEffect, useState } from 'react';
import { FRACS, toFracStr, splitFrac } from '../lib/frac';
import { makeT } from '../lib/i18n';
import type { Lang } from '../lib/types';

interface Props {
  open: boolean;
  title: string;
  initial: number | null;
  lang: Lang;
  onClose: () => void;
  onDone: (value: number) => void;
}

/** The fraction numpad: whole-inch keys (incl. the signature "00") plus the
 *  16-button grid of 16ths. Decimal internal, fraction display. */
export function NumpadModal({ open, title, initial, lang, onClose, onDone }: Props) {
  const t = makeT(lang);
  const [whole, setWhole] = useState('');
  const [fracVal, setFracVal] = useState(0);

  useEffect(() => {
    if (open) {
      if (initial != null) {
        const { whole: w, frac } = splitFrac(initial);
        setWhole(String(w));
        setFracVal(frac.val);
      } else {
        setWhole('');
        setFracVal(0);
      }
    }
  }, [open, initial]);

  if (!open) return null;
  const value = (parseInt(whole || '0', 10) || 0) + fracVal;

  const press = (d: string) => {
    if (d === '00') {
      if (whole !== '') setWhole((whole + '00').slice(0, 3));
    } else if (whole.length < 3) {
      setWhole(whole + d);
    }
  };
  const back = () => setWhole((w) => w.slice(0, -1));

  return (
    <div className="overlay open" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet" style={{ width: 'min(480px,100%)' }}>
        <h3>{title}</h3>
        <div className="np-display">{whole === '' && fracVal === 0 ? '—' : toFracStr(value)}</div>
        <label className="f-label">{t('npWhole')}</label>
        <div className="np-keys">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((d) => (
            <button key={d} className="np-key" onClick={() => press(d)}>{d}</button>
          ))}
          <button className="np-key" onClick={back} aria-label="Backspace">⌫</button>
        </div>
        <label className="f-label">{t('npFrac')}</label>
        <div className="frac-grid" style={{ marginBottom: 18 }}>
          {FRACS.map((f) => (
            <button
              key={f.label}
              className={fracVal === f.val ? 'sel' : ''}
              aria-pressed={fracVal === f.val}
              onClick={() => setFracVal(f.val)}
            >
              {f.val === 0 ? t('npNone') : f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>{t('cancel')}</button>
          <button className="btn" style={{ flex: 1 }} disabled={value <= 0} onClick={() => onDone(value)}>{t('ok')}</button>
        </div>
      </div>
    </div>
  );
}
