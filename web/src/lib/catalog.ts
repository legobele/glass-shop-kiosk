// Glass catalog, lite sizes, thickness metadata.
// Ported 1:1 from GLASS_CATALOG / LITE_SIZES in the original index.html.
// Structure: glass type -> color -> thicknesses.
// Swatches are drawn (SVG/CSS), keyed by `sw` token, never images.

import type { GlassTypeKey } from './types';

export interface ColorInfo {
  thicknesses: string[];
  sw: string; // swatch token used by the Swatch component
  key: string; // i18n key for the color name
  lam?: boolean;
}

export const GLASS_CATALOG: Record<GlassTypeKey, Record<string, ColorInfo>> = {
  float: {
    clear: { thicknesses: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'], sw: 'clear', key: 'cClear' },
    'ultra-clear': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'ultra-clear', key: 'cUltraClear' },
    gray: { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'gray', key: 'cGray' },
    bronze: { thicknesses: ['1/8"', '1/4"', '3/8"', '1/2"'], sw: 'bronze', key: 'cBronze' },
    'blue-green': { thicknesses: ['1/4"', '3/8"'], sw: 'blue-green', key: 'cBlueGreen' },
    'arctic-blue': { thicknesses: ['3/8"'], sw: 'arctic-blue', key: 'cArcticBlue' },
    'mirror-clear': { thicknesses: ['1/8"', '1/4"'], sw: 'mirror-clear', key: 'cMirrorClear' },
    'mirror-clear-back': { thicknesses: ['1/8"'], sw: 'mirror-back', key: 'cMirrorBack' },
    'mirror-bronze': { thicknesses: ['1/4"'], sw: 'mirror-bronze', key: 'cMirrorBronze' },
    'mirror-antique': { thicknesses: ['1/4"'], sw: 'mirror-antique', key: 'cMirrorAntique' },
    'cianite-clear': { thicknesses: ['3/16"'], sw: 'cianite-clear', key: 'cCianiteClear' },
    'cianite-bronze': { thicknesses: ['1/4"'], sw: 'cianite-bronze', key: 'cCianiteBronze' },
    rain: { thicknesses: ['3/8"'], sw: 'rain', key: 'cRain' },
    'barb-wire': { thicknesses: ['1/4"'], sw: 'barb-wire', key: 'cBarbWire' },
    'acid-etch': { thicknesses: ['3/8"', '1/2"'], sw: 'acid-etch', key: 'cAcidEtch' },
    'white-lac': { thicknesses: ['1/4"'], sw: 'white-lac', key: 'cWhiteLac' },
    'black-lac': { thicknesses: ['1/4"'], sw: 'black-lac', key: 'cBlackLac' },
    'optic-white': { thicknesses: ['1/8"'], sw: 'optic-white', key: 'cOpticWhite' },
    'low-e': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'low-e', key: 'cLowE' },
  },
  tempered: {
    clear: { thicknesses: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'], sw: 'clear', key: 'cClear' },
    'ultra-clear': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'ultra-clear', key: 'cUltraClear' },
    gray: { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'gray', key: 'cGray' },
    bronze: { thicknesses: ['1/8"', '1/4"', '3/8"', '1/2"'], sw: 'bronze', key: 'cBronze' },
    'blue-green': { thicknesses: ['1/4"', '3/8"'], sw: 'blue-green', key: 'cBlueGreen' },
    'arctic-blue': { thicknesses: ['3/8"'], sw: 'arctic-blue', key: 'cArcticBlue' },
    'cianite-clear': { thicknesses: ['3/16"'], sw: 'cianite-clear', key: 'cCianiteClear' },
    'cianite-bronze': { thicknesses: ['1/4"'], sw: 'cianite-bronze', key: 'cCianiteBronze' },
    rain: { thicknesses: ['3/8"'], sw: 'rain', key: 'cRain' },
    'acid-etch': { thicknesses: ['3/8"', '1/2"'], sw: 'acid-etch', key: 'cAcidEtch' },
    'low-e': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'low-e', key: 'cLowE' },
  },
  'ultra-clear-float': {
    'ultra-clear': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'ultra-clear', key: 'cUltraClear' },
  },
  'ultra-clear-tempered': {
    'ultra-clear': { thicknesses: ['1/4"', '3/8"', '1/2"'], sw: 'ultra-clear', key: 'cUltraClear' },
  },
  laminated: {
    clear: { thicknesses: ['1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'], sw: 'clear', key: 'cClear', lam: true },
    gray: { thicknesses: ['1/4"'], sw: 'gray', key: 'cGray', lam: true },
    bronze: { thicknesses: ['1/4"'], sw: 'bronze', key: 'cBronze', lam: true },
    'blue-green': { thicknesses: ['1/4"'], sw: 'blue-green', key: 'cBlueGreen', lam: true },
    'white-lac': { thicknesses: ['1/4"'], sw: 'white-lac', key: 'cWhiteLac', lam: true },
  },
};

export interface LiteSize {
  w: number;
  h: number;
}

// Max stock lite sizes per type (inches). A cut fits when it fits a lite
// with 1" of margin, in either orientation (glass can be rotated).
export const LITE_SIZES: Record<GlassTypeKey, LiteSize[]> = {
  float: [
    { w: 130, h: 96 },
    { w: 142, h: 98 },
  ],
  tempered: [
    { w: 130, h: 96 },
    { w: 142, h: 98 },
  ],
  'ultra-clear-float': [
    { w: 130, h: 96 },
    { w: 142, h: 98 },
  ],
  'ultra-clear-tempered': [
    { w: 130, h: 96 },
    { w: 142, h: 98 },
  ],
  laminated: [
    { w: 71, h: 95 },
    { w: 84, h: 130 },
  ],
};

// Mirror keeps its own limits per thickness (changelog, v1.0.0 spec notes).
export const MIRROR_LITE_SIZES: Record<string, LiteSize[]> = {
  '1/8"': [{ w: 83, h: 129 }],
  '1/4"': [{ w: 141, h: 97 }],
};

export function liteSizesFor(
  glassType: GlassTypeKey,
  color?: string | null,
  thickness?: string | null,
): LiteSize[] {
  if (color && color.startsWith('mirror') && thickness && MIRROR_LITE_SIZES[thickness]) {
    return MIRROR_LITE_SIZES[thickness];
  }
  return LITE_SIZES[glassType] || LITE_SIZES.float;
}

/** True when w x h fits no lite (with 1" margin) in either orientation. */
export function isFullLite(
  glassType: GlassTypeKey,
  w: number,
  h: number,
  color?: string | null,
  thickness?: string | null,
): boolean {
  const sizes = liteSizesFor(glassType, color, thickness);
  for (const s of sizes) {
    if (w <= s.w - 1 && h <= s.h - 1) return false;
    if (h <= s.w - 1 && w <= s.h - 1) return false; // rotated
  }
  return true;
}

export const THICK_ORDER = [
  '1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"',
];

export const THICK_MM: Record<string, string> = {
  '1/8"': '3mm',
  '5/32"': '4mm',
  '3/16"': '5mm',
  '1/4"': '6mm',
  '5/16"': '8mm',
  '3/8"': '10mm',
  '1/2"': '12mm',
  '5/8"': '16mm',
  '3/4"': '19mm',
};

/** Decimal value of a thickness label like '3/8"'. */
export function thickValue(th: string): number {
  const m = th.replace('"', '').trim();
  if (m.includes('/')) {
    const [a, b] = m.split('/');
    return parseFloat(a) / parseFloat(b);
  }
  return parseFloat(m);
}

/** All thicknesses offered by a glass type, in catalog order. */
export function thicknessesForType(type: GlassTypeKey): string[] {
  const set = new Set<string>();
  Object.values(GLASS_CATALOG[type]).forEach((c) =>
    c.thicknesses.forEach((th) => set.add(th)),
  );
  return THICK_ORDER.filter((th) => set.has(th));
}

/** Colors of a type that come in the given thickness. */
export function colorsForThickness(
  type: GlassTypeKey,
  thickness: string,
): [string, ColorInfo][] {
  return Object.entries(GLASS_CATALOG[type]).filter(([, info]) =>
    info.thicknesses.includes(thickness),
  );
}

/** Every color key known to any type (for admin edit selects). */
export function allColorKeys(): string[] {
  const set = new Set<string>();
  (Object.keys(GLASS_CATALOG) as GlassTypeKey[]).forEach((t) =>
    Object.keys(GLASS_CATALOG[t]).forEach((c) => set.add(c)),
  );
  return [...set];
}

export const TYPE_I18N_KEY: Record<GlassTypeKey, string> = {
  float: 'tFloat',
  tempered: 'tTempered',
  'ultra-clear-float': 'tUltraClear',
  'ultra-clear-tempered': 'tUltraClearTempered',
  laminated: 'tLaminated',
};

/** Base type + modifier switches -> catalog key (original resolveGlassType). */
export function resolveGlassType(
  baseType: 'float' | 'laminated' | null,
  isTempered: boolean,
  isUltraClear: boolean,
): GlassTypeKey | null {
  if (!baseType) return null;
  if (baseType === 'laminated') return 'laminated';
  if (isUltraClear && isTempered) return 'ultra-clear-tempered';
  if (isUltraClear) return 'ultra-clear-float';
  if (isTempered) return 'tempered';
  return 'float';
}
