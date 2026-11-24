// Admin-configured pricing for the kiosk price display.
// SCOPE: this is a local-only app. The config lives in this browser's
// localStorage, so it is NOT backend-protected and anyone with access to this
// browser profile can read it. The customer-facing kiosk only ever receives
// computed subtotal/tax/total strings (via computeVfd), never the raw rates.
import { useSyncExternalStore } from 'react';
import type { GlassTypeKey } from './types';

const KEY = 'qgi.pricing.v1';
export const PRICED_TYPES: GlassTypeKey[] = ['float', 'tempered', 'ultra-clear-float', 'ultra-clear-tempered', 'laminated'];

export interface PricingConfig {
  enabled: boolean;
  /** USD per square foot, per glass type. null/undefined = not configured. */
  ratePerSqFt: Partial<Record<GlassTypeKey, number | null>>;
  /** Tax percent (e.g. 11.5). null = not configured, which keeps the display on dashes. */
  taxPercent: number | null;
}

const EMPTY: PricingConfig = { enabled: false, ratePerSqFt: {}, taxPercent: null };
let cache: PricingConfig | null = null;
const subs = new Set<() => void>();

function read(): PricingConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const j = JSON.parse(raw);
    return { enabled: !!j.enabled, ratePerSqFt: j.ratePerSqFt && typeof j.ratePerSqFt === 'object' ? j.ratePerSqFt : {}, taxPercent: typeof j.taxPercent === 'number' ? j.taxPercent : null };
  } catch { return EMPTY; }
}
function snap(): PricingConfig { if (!cache) cache = read(); return cache; }
export function savePricing(c: PricingConfig) {
  cache = c;
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
  subs.forEach((f) => f());
}
function subscribe(f: () => void) {
  subs.add(f);
  const on = (e: StorageEvent) => { if (e.key === KEY) { cache = null; f(); } };
  window.addEventListener('storage', on);
  return () => { subs.delete(f); window.removeEventListener('storage', on); };
}
export function usePricing(): PricingConfig { return useSyncExternalStore(subscribe, snap, snap); }

/** [subtotal, total, tax] display strings in the VFD tab order, or null when pricing is off or incomplete. */
export function computeVfd(cfg: PricingConfig, type: GlassTypeKey | null, wIn: number | null, hIn: number | null, qty = 1): [string, string, string] | null {
  if (!cfg.enabled || cfg.taxPercent == null || !type || !wIn || !hIn) return null;
  const rate = cfg.ratePerSqFt[type];
  if (rate == null || !(rate >= 0)) return null;
  const sub = Math.round((wIn * hIn) / 144 * rate * qty * 100) / 100;
  const tax = Math.round(sub * cfg.taxPercent) / 100;
  const f = (n: number) => n.toFixed(2);
  return [f(sub), f(sub + tax), f(tax)];
}
