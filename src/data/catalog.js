// Glass catalog — ported from glass-shop-kiosk, with the mirror per-thickness
// lite-size bug fixed (mirror sizes now depend on thickness, not a float fallback).

export const GLASS_TYPES = {
  float: { labelKey: 'tFloat', icon: '🪟', descKey: 'typeFloatDesc' },
  tempered: { labelKey: 'tTempered', icon: '🔥', descKey: 'typeTempDesc' },
  'ultra-clear-float': { labelKey: 'tUltraClear', icon: '💎', descKey: 'typeUcDesc' },
  'ultra-clear-tempered': { labelKey: 'tUltraClearTempered', icon: '💎', descKey: 'typeUcTempDesc' },
  laminated: { labelKey: 'tLaminated', icon: '🔲', descKey: 'typeLamDesc' },
};

// colorKey → i18n key
export const COLOR_KEYS = {
  clear: 'cClear',
  'ultra-clear': 'cUltraClear',
  gray: 'cGray',
  bronze: 'cBronze',
  'blue-green': 'cBlueGreen',
  'arctic-blue': 'cArcticBlue',
  'mirror-clear': 'cMirrorClear',
  'mirror-clear-back': 'cMirrorBack',
  'mirror-bronze': 'cMirrorBronze',
  'mirror-antique': 'cMirrorAntique',
  'cianite-clear': 'cCianiteClear',
  'cianite-bronze': 'cCianiteBronze',
  rain: 'cRain',
  'barb-wire': 'cBarbWire',
  'acid-etch': 'cAcidEtch',
  'white-lac': 'cWhiteLac',
  'black-lac': 'cBlackLac',
  'optic-white': 'cOpticWhite',
  'low-e': 'cLowE',
};

// CSS swatch class per color (used by Kiosk swatches)
export const COLOR_SWATCH = {
  clear: 'sw-clear',
  'ultra-clear': 'sw-ultra-clear',
  gray: 'sw-gray',
  bronze: 'sw-bronze',
  'blue-green': 'sw-blue-green',
  'arctic-blue': 'sw-arctic-blue',
  'mirror-clear': 'sw-mirror-clear',
  'mirror-clear-back': 'sw-mirror-back',
  'mirror-bronze': 'sw-mirror-bronze',
  'mirror-antique': 'sw-mirror-antique',
  'cianite-clear': 'sw-cianite-clear',
  'cianite-bronze': 'sw-cianite-bronze',
  rain: 'sw-rain',
  'barb-wire': 'sw-barb-wire',
  'acid-etch': 'sw-acid-etch',
  'white-lac': 'sw-white-lac',
  'black-lac': 'sw-black-lac',
  'optic-white': 'sw-optic-white',
  'low-e': 'sw-low-e',
};

// type → color → [thicknesses]
export const GLASS_CATALOG = {
  float: {
    clear: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
    gray: ['1/4"', '3/8"', '1/2"'],
    bronze: ['1/8"', '1/4"', '3/8"', '1/2"'],
    'blue-green': ['1/4"', '3/8"'],
    'arctic-blue': ['3/8"'],
    'mirror-clear': ['1/8"', '1/4"'],
    'mirror-clear-back': ['1/8"'],
    'mirror-bronze': ['1/4"'],
    'mirror-antique': ['1/4"'],
    'cianite-clear': ['3/16"'],
    'cianite-bronze': ['1/4"'],
    rain: ['3/8"'],
    'barb-wire': ['1/4"'],
    'acid-etch': ['3/8"', '1/2"'],
    'white-lac': ['1/4"'],
    'black-lac': ['1/4"'],
    'optic-white': ['1/8"'],
    'low-e': ['1/4"', '3/8"', '1/2"'],
  },
  tempered: {
    clear: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
    gray: ['1/4"', '3/8"', '1/2"'],
    bronze: ['1/8"', '1/4"', '3/8"', '1/2"'],
    'blue-green': ['1/4"', '3/8"'],
    'arctic-blue': ['3/8"'],
    'cianite-clear': ['3/16"'],
    'cianite-bronze': ['1/4"'],
    rain: ['3/8"'],
    'acid-etch': ['3/8"', '1/2"'],
    'low-e': ['1/4"', '3/8"', '1/2"'],
  },
  'ultra-clear-float': {
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
  },
  'ultra-clear-tempered': {
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
  },
  laminated: {
    clear: ['1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    gray: ['1/4"'],
    bronze: ['1/4"'],
    'blue-green': ['1/4"'],
    'white-lac': ['1/4"'],
  },
};

// Max lite sizes per type. Key is glassType OR a per-thickness mirror key.
// Fix: mirror sizes now depend on thickness (1/8" → 83×129, 1/4" → 141×97)
// instead of falling back to float sizes.
export const LITE_SIZES = {
  float: [{ w: 130, h: 96 }, { w: 142, h: 98 }],
  tempered: [{ w: 130, h: 96 }, { w: 142, h: 98 }],
  'ultra-clear-float': [{ w: 130, h: 96 }, { w: 142, h: 98 }],
  'ultra-clear-tempered': [{ w: 130, h: 96 }, { w: 142, h: 98 }],
  laminated: [{ w: 71, h: 95 }, { w: 84, h: 130 }],
  // per-thickness mirror limits
  'mirror-1/8"': [{ w: 83, h: 129 }],
  'mirror-1/4"': [{ w: 141, h: 97 }],
};

export const THICK_MM = {
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

export const THICKNESS_ORDER = [
  '1/8"',
  '5/32"',
  '3/16"',
  '1/4"',
  '5/16"',
  '3/8"',
  '1/2"',
  '5/8"',
  '3/4"',
];

/** Resolve lite sizes for an order (glassType + color + thickness). */
export function getLiteSizes(glassType, color, thickness) {
  // mirror is a float color whose lite size depends on thickness
  if (color && color.startsWith('mirror')) {
    const key = `mirror-${thickness || ''}`;
    if (LITE_SIZES[key]) return LITE_SIZES[key];
  }
  return LITE_SIZES[glassType] || LITE_SIZES.float;
}

/** Is this order a full-lite (exceeds all available lites, with 1" margin, rotatable)? */
export function isFullLite(width, height, glassType, color, thickness) {
  if (!width || !height) return false;
  const sizes = getLiteSizes(glassType, color, thickness);
  for (const s of sizes) {
    if (width <= s.w - 1 && height <= s.h - 1) return false;
    if (height <= s.w - 1 && width <= s.h - 1) return false; // rotated
  }
  return true;
}
