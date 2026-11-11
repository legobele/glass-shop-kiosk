// Display formatting shared by admin and portal.

import type { Additions, OrderStatus, PaymentMethod } from './types';
import { GLASS_CATALOG, TYPE_I18N_KEY } from './catalog';
import { toFracStr } from './frac';
import { makeT } from './i18n';
import type { Lang } from './types';

export const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'in-progress',
  'ready',
  'completed',
  'cancelled',
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Semantic signal colors only (Neue law: color is status, never branding).
export const STATUS_SIGNAL: Record<OrderStatus, 'warn' | 'info' | 'ok' | 'dim' | 'err'> = {
  pending: 'warn',
  'in-progress': 'info',
  ready: 'ok',
  completed: 'dim',
  cancelled: 'err',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  'credit-debit': 'Credit/Debit Card',
  'apple-google-ath': 'Apple Pay / Google Pay / ATH Móvil',
};

export function colorName(colorKey: string, lang: Lang = 'en'): string {
  for (const type of Object.values(GLASS_CATALOG)) {
    const info = type[colorKey];
    if (info) return makeT(lang)(info.key);
  }
  return colorKey;
}

export function typeName(order: { specifications: { glassType: keyof typeof TYPE_I18N_KEY } }, lang: Lang = 'en'): string {
  return makeT(lang)(TYPE_I18N_KEY[order.specifications.glassType]);
}

/** Serialize additions into the original wire strings (server contract). */
export function additionsToStrings(a: Additions): string[] {
  const out: string[] = [];
  if (a.beveling.active) {
    const edges = (['e1', 'e2', 'e3', 'e4'] as const)
      .filter((k) => a.beveling.sides[k])
      .map((k) => k.replace('e', ''))
      .join(',');
    out.push(`beveling:angle=${a.beveling.angle}:edges=${edges}`);
  }
  if (a.diamonfusion.active) out.push('diamonfusion');
  if (a.edgerounding.active) {
    let s = `edgerounding:radius=${toFracStr(a.edgerounding.radius)}`;
    const edges = (['e1', 'e2', 'e3', 'e4'] as const)
      .filter((k) => a.edgerounding.edges[k])
      .map((k) => k.replace('e', ''))
      .join(',');
    const corners = (['c1', 'c2', 'c3', 'c4'] as const)
      .filter((k) => a.edgerounding.corners[k])
      .map((k) => k.replace('c', ''))
      .join(',');
    if (edges) s += `:edges=${edges}`;
    if (corners) s += `:corners=${corners}`;
    out.push(s);
  }
  if (a.sandblasting.active) out.push('sandblasting');
  return out;
}

/** Human-readable one-liners for addition chips (admin + portal). */
export function additionLabels(a: Additions): string[] {
  const out: string[] = [];
  if (a.beveling.active) out.push(`Beveling (${a.beveling.angle}°)`);
  if (a.diamonfusion.active) out.push('Diamon-Fusion®');
  if (a.edgerounding.active)
    out.push(`Edge Rounding (r ${toFracStr(a.edgerounding.radius)})`);
  if (a.sandblasting.active) out.push('Sandblasting');
  return out;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
