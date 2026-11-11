import type { ColorInfo } from '../lib/catalog';

/** Drawn glass swatch: a flat tone plus an SVG pattern texture per color.
 *  No photos, no decorative gradients. Keyed by the catalog `sw` token. */
export function Swatch({ color, label }: { color: ColorInfo; label?: string }) {
  const t = color.sw;
  let bg = '#3f4a4d';
  if (t === 'clear') bg = '#7e8f96';
  else if (t === 'ultra-clear') bg = '#9db8c0';
  else if (t === 'bronze' || t === 'mirror-bronze') bg = '#7a5a35';
  else if (t === 'gray') bg = '#5d6066';
  else if (t === 'blue-green') bg = '#3f7a6e';
  else if (t === 'arctic-blue') bg = '#3d6f9e';
  else if (t === 'mirror-clear' || t === 'mirror-antique') bg = '#8b9299';
  else if (t === 'mirror-back') bg = '#26262b';
  else if (t === 'cianite-clear') bg = '#8fd0dc';
  else if (t === 'cianite-bronze') bg = '#b08d57';
  else if (t === 'rain') bg = '#4e5a5e';
  else if (t === 'barb-wire') bg = '#5a6058';
  else if (t === 'acid-etch') bg = '#aeb4ba';
  else if (t === 'white-lac' || t === 'optic-white') bg = '#d5d8db';
  else if (t === 'black-lac') bg = '#17171a';
  else if (t === 'low-e') bg = '#6e7f74';

  const patternId = t.startsWith('cianite')
    ? `sw-${t}`
    : t === 'rain'
      ? 'sw-rain'
      : t === 'barb-wire'
        ? 'sw-barb'
        : null;
  let pattern: React.ReactNode = null;
  if (t.startsWith('cianite')) {
    const base = t === 'cianite-bronze' ? '#b08d57' : '#8fd0dc';
    const stripe = t === 'cianite-bronze' ? '#d9bd8f' : '#cdeef4';
    pattern = (
      <pattern id={patternId!} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="10" height="10" fill={base} />
        <rect width="4" height="10" fill={stripe} />
      </pattern>
    );
  } else if (t === 'rain') {
    pattern = (
      <pattern id="sw-rain" width="7" height="16" patternUnits="userSpaceOnUse">
        <rect width="7" height="16" fill="#4e5a5e" />
        <rect width="2" height="16" fill="#7a8a8e" />
      </pattern>
    );
  } else if (t === 'barb-wire') {
    pattern = (
      <pattern id="sw-barb" width="12" height="12" patternUnits="userSpaceOnUse">
        <rect width="12" height="12" fill="#5a6058" />
        <path d="M0 12 L12 0 M-3 3 L3 -3 M9 15 L15 9" stroke="#8f978f" strokeWidth="1.6" />
        <path d="M0 0 L12 12 M-3 9 L3 15 M9 -3 L15 3" stroke="#8f978f" strokeWidth="1.6" />
      </pattern>
    );
  }

  return (
    <div className="swatch" aria-hidden="true">
      <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
        {pattern && <defs>{pattern}</defs>}
        <rect width="100%" height="100%" fill={patternId ? `url(#${patternId})` : bg} />
        {t === 'mirror-back' && (
          <>
            <rect width="100%" height="100%" fill="#26262b" />
            <path d="M0 78 L110 0 L170 0 L60 78 Z" fill="#4a4a52" opacity="0.7" />
            <text x="10" y="24" fill="#a8a8b0" fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="2">MIRROR BACK</text>
          </>
        )}
      </svg>
      {label && <span className="sw-tag">{label}</span>}
      {color.lam && <span className="lam-badge">LAM</span>}
    </div>
  );
}
