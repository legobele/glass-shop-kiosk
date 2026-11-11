// Fraction math. Measurements are stored as decimal inches internally and
// displayed as whole + 16th fractions everywhere a human reads them,
// exactly like the original toFracStr() (24.375 -> 24 3/8").

export interface Frac {
  label: string;
  val: number;
}

export const FRACS: Frac[] = [
  { label: '0', val: 0 },
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

// Edge rounding only goes up to 1/2" (reasonable corner rounding range).
export const ER_FRACS: Frac[] = FRACS.filter((f) => f.val <= 0.5);

const EPS = 0.001;

/** Display a decimal inch measurement as e.g. 24 3/8" (or 36" when whole). */
export function toFracStr(val: number | null | undefined): string {
  if (val == null || Number.isNaN(val)) return '—';
  const whole = Math.floor(val);
  const frac = val - whole;
  const match = FRACS.find((f) => Math.abs(f.val - frac) < EPS);
  if (match && match.val > 0) return `${whole} ${match.label}`;
  return `${whole}"`;
}

/** Snap an arbitrary decimal to the nearest 1/16 (for diagram fidelity). */
export function snap16(val: number): number {
  return Math.round(val * 16) / 16;
}

/** Split a decimal into whole inches + nearest fraction entry. */
export function splitFrac(val: number): { whole: number; frac: Frac } {
  const whole = Math.floor(val);
  const rem = val - whole;
  let best = FRACS[0];
  for (const f of FRACS) {
    if (Math.abs(f.val - rem) < Math.abs(best.val - rem)) best = f;
  }
  return { whole, frac: best };
}
