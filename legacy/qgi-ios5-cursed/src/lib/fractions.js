// Fraction helpers — all measurements in inches, stored as decimal.
export const FRACTIONS = [
  { label: '1/16"', val: 1 / 16 },
  { label: '1/8"', val: 1 / 8 },
  { label: '3/16"', val: 3 / 16 },
  { label: '1/4"', val: 1 / 4 },
  { label: '5/16"', val: 5 / 16 },
  { label: '3/8"', val: 3 / 8 },
  { label: '7/16"', val: 7 / 16 },
  { label: '1/2"', val: 1 / 2 },
  { label: '9/16"', val: 9 / 16 },
  { label: '5/8"', val: 5 / 8 },
  { label: '11/16"', val: 11 / 16 },
  { label: '3/4"', val: 3 / 4 },
  { label: '13/16"', val: 13 / 16 },
  { label: '7/8"', val: 7 / 8 },
  { label: '15/16"', val: 15 / 16 },
];

/** decimal inches → '24 3/8"' — fixed so whole inches render as `5"` not `5"`. */
export function fracToLabel(val) {
  if (val == null) return '—';
  const whole = Math.floor(val);
  const frac = val - whole;
  const match = FRACTIONS.find((f) => Math.abs(f.val - frac) < 0.001);
  const fracStr = match && match.val > 0 ? ' ' + match.label : '"';
  return whole + (match && match.val > 0 ? fracStr : '"');
}

/** '24 3/8"' or '24.375' → decimal inches. Returns null if unparseable. */
export function labelToFrac(str) {
  if (str == null) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d+)\s*(?:(\d+)\/(\d+))?"?$/);
  if (!m) return null;
  const whole = parseInt(m[1], 10) || 0;
  const frac = m[2] && m[3] ? parseInt(m[2], 10) / parseInt(m[3], 10) : 0;
  return whole + frac;
}
