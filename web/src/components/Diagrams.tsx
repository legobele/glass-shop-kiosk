import { toFracStr } from '../lib/frac';

/* Diagrams are drawn SVG with exact labels. Rebuilt properly from the
   v1.0.0 + v1.0.3 changelog geometry notes (the original canvas versions
   were removed in 1.2.0 along with the graphs). */

const INK = '#fafafa';
const MUT = '#a8a8b0';
const DIM = '#6f6f77';
const ACC = '#8e9bb5';

export function SizeDiagram({ w, h }: { w: number | null; h: number | null }) {
  const vw = w ?? 36;
  const vh = h ?? 24;
  const scale = Math.min(250 / vw, 170 / vh);
  const rw = vw * scale;
  const rh = vh * scale;
  const x = (320 - rw) / 2;
  const y = (220 - rh) / 2;
  return (
    <svg viewBox="0 0 320 220" role="img" aria-label="Glass size diagram">
      <rect x={x} y={y} width={rw} height={rh} fill="rgba(255,255,255,.05)" stroke={INK} strokeWidth="1.4" />
      <line x1={x} y1={y - 16} x2={x + rw} y2={y - 16} stroke={DIM} strokeWidth="1" />
      <line x1={x} y1={y - 21} x2={x} y2={y - 11} stroke={DIM} strokeWidth="1" />
      <line x1={x + rw} y1={y - 21} x2={x + rw} y2={y - 11} stroke={DIM} strokeWidth="1" />
      <text x={x + rw / 2} y={y - 24} fill={INK} fontSize="12" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        {toFracStr(w)}
      </text>
      <line x1={x + rw + 16} y1={y} x2={x + rw + 16} y2={y + rh} stroke={DIM} strokeWidth="1" />
      <line x1={x + rw + 11} y1={y} x2={x + rw + 21} y2={y} stroke={DIM} strokeWidth="1" />
      <line x1={x + rw + 11} y1={y + rh} x2={x + rw + 21} y2={y + rh} stroke={DIM} strokeWidth="1" />
      <text x={x + rw + 26} y={y + rh / 2} fill={INK} fontSize="12" fontFamily="JetBrains Mono, monospace" textAnchor="middle" transform={`rotate(90 ${x + rw + 30} ${y + rh / 2})`}>
        {toFracStr(h)}
      </text>
    </svg>
  );
}

/**
 * Bevel cross-section: the bevel angle scales the cut footprint
 * (45 deg = short wide cut, 5 deg = long narrow cut). Angle arc is
 * anchored at the bevel start on the top surface, sweeping downward
 * toward the bottom surface by angle radians.
 */
export function BevelDiagram({ angle, sides }: { angle: number; sides: Record<string, boolean> }) {
  const topY = 34;
  const botY = 156;
  const thick = botY - topY;
  const tan = Math.tan((angle * Math.PI) / 180);
  const bw = Math.max(10, Math.min(96, thick / Math.max(tan, 0.05)));
  const left = 44;
  const right = 356;
  const active = (key: 'e1' | 'e2' | 'e3' | 'e4') => sides[key];
  const col = (on: boolean) => (on ? INK : DIM);
  // top bevel (e1): cut from top-left going down-right
  const arcR = Math.min(52, bw * 0.8);
  const ax = left + bw;
  const ay = topY;
  const aEndX = ax - arcR * Math.cos((angle * Math.PI) / 180);
  const aEndY = ay + arcR * Math.sin((angle * Math.PI) / 180);
  const midX = ax + 46;
  const midY = (topY + botY) / 2;
  return (
    <svg viewBox="0 0 400 190" role="img" aria-label="Bevel angle diagram">
      {/* glass body outline (cross section, edges labeled e1 top, e2 right, e3 bottom, e4 left) */}
      <polygon
        points={`${left + bw},${topY} ${right - bw},${topY} ${right},${midY} ${right - bw},${botY} ${left + bw},${botY} ${left},${midY}`}
        fill="rgba(255,255,255,.05)"
        stroke="none"
      />
      <line x1={left + bw} y1={topY} x2={right - bw} y2={topY} stroke={col(active('e1'))} strokeWidth={active('e1') ? 3 : 1.4} />
      <line x1={right - bw} y1={topY} x2={right} y2={midY} stroke={col(active('e2'))} strokeWidth={active('e2') ? 3 : 1.4} />
      <line x1={right} y1={midY} x2={right - bw} y2={botY} stroke={col(active('e2'))} strokeWidth={active('e2') ? 3 : 1.4} />
      <line x1={right - bw} y1={botY} x2={left + bw} y2={botY} stroke={col(active('e3'))} strokeWidth={active('e3') ? 3 : 1.4} />
      <line x1={left + bw} y1={botY} x2={left} y2={midY} stroke={col(active('e4'))} strokeWidth={active('e4') ? 3 : 1.4} />
      <line x1={left} y1={midY} x2={left + bw} y2={topY} stroke={col(active('e4'))} strokeWidth={active('e4') ? 3 : 1.4} />
      {/* bevel cut lines at the left corner */}
      <line x1={left + bw} y1={topY} x2={left + bw} y2={botY} stroke={DIM} strokeWidth="1" strokeDasharray="3 3" />
      {/* angle arc */}
      <path d={`M ${ax - arcR} ${ay} A ${arcR} ${arcR} 0 0 0 ${aEndX} ${aEndY}`} fill="none" stroke={ACC} strokeWidth="1.6" />
      <text x={ax - arcR - 8} y={ay + 14} fill={ACC} fontSize="13" fontFamily="JetBrains Mono, monospace" textAnchor="end">
        {angle}°
      </text>
      <text x={midX} y={topY - 10} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E1</text>
      <text x={right + 8 > 392 ? right - 4 : right + 6} y={midY + 4} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E2</text>
      <text x={midX} y={botY + 18} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E3</text>
      <text x={left - 22} y={midY + 4} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E4</text>
    </svg>
  );
}

/** Rounded rectangle whose corner radius scales with the chosen fraction. */
export function EdgeRoundingDiagram({
  radius,
  edges,
  corners,
}: {
  radius: number;
  edges: Record<string, boolean>;
  corners: Record<string, boolean>;
}) {
  const W = 280;
  const H = 190;
  const x = 60;
  const y = 45;
  const r = Math.max(2, Math.min(88, radius * 176));
  const col = (on: boolean) => (on ? INK : DIM);
  const wdt = (on: boolean) => (on ? 3 : 1.4);
  const cornerPt = (cx: number, cy: number, on: boolean, label: string, lx: number, ly: number) => (
    <g key={label}>
      <circle cx={cx} cy={cy} r="4" fill={on ? INK : 'none'} stroke={col(on)} strokeWidth="1.4" />
      <text x={lx} y={ly} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 400 280" role="img" aria-label="Edge rounding diagram">
      <rect x={x + r} y={y} width={W - 2 * r} height={H} fill="none" stroke={col(edges.e1)} strokeWidth={wdt(edges.e1)} />
      <rect x={x} y={y + r} width={W} height={H - 2 * r} fill="none" stroke="none" />
      <line x1={x} y1={y + r} x2={x} y2={y + H - r} stroke={col(edges.e4)} strokeWidth={wdt(edges.e4)} />
      <line x1={x + W} y1={y + r} x2={x + W} y2={y + H - r} stroke={col(edges.e2)} strokeWidth={wdt(edges.e2)} />
      <line x1={x + r} y1={y + H} x2={x + W - r} y2={y + H} stroke={col(edges.e3)} strokeWidth={wdt(edges.e3)} />
      {/* corners: C1 top-right, C2 bottom-right, C3 bottom-left, C4 top-left */}
      <path d={`M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y}`} fill="none" stroke={col(corners.c4)} strokeWidth={wdt(corners.c4)} />
      <path d={`M ${x + W - r} ${y} A ${r} ${r} 0 0 1 ${x + W} ${y + r}`} fill="none" stroke={col(corners.c1)} strokeWidth={wdt(corners.c1)} />
      <path d={`M ${x + W} ${y + H - r} A ${r} ${r} 0 0 1 ${x + W - r} ${y + H}`} fill="none" stroke={col(corners.c2)} strokeWidth={wdt(corners.c2)} />
      <path d={`M ${x + r} ${y + H} A ${r} ${r} 0 0 1 ${x} ${y + H - r}`} fill="none" stroke={col(corners.c3)} strokeWidth={wdt(corners.c3)} />
      {cornerPt(x + W, y, corners.c1, 'C1', x + W + 10, y - 6)}
      {cornerPt(x + W, y + H, corners.c2, 'C2', x + W + 10, y + H + 16)}
      {cornerPt(x, y + H, corners.c3, 'C3', x - 26, y + H + 16)}
      {cornerPt(x, y, corners.c4, 'C4', x - 26, y - 6)}
      <text x={x + W / 2} y={y - 14} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">E1</text>
      <text x={x + W + 12} y={y + H / 2} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E2</text>
      <text x={x + W / 2} y={y + H + 22} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">E3</text>
      <text x={x - 24} y={y + H / 2} fill={MUT} fontSize="10" fontFamily="JetBrains Mono, monospace">E4</text>
      <text x={200} y={268} fill={INK} fontSize="13" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
        R = {toFracStr(radius)}
      </text>
    </svg>
  );
}
