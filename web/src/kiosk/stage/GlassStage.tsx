import { useEffect, useMemo, useRef, useState } from 'react';
import type { GlassTypeKey, Lang } from '../../lib/types';
import { thickValue } from '../../lib/catalog';
import { toFracStr } from '../../lib/frac';
import { GlassViewer, type FxApi, type GlassKind, COLOR_TINT } from './Glass';
import { FxLayer, type FxCmd, type FxName } from './Fx';
import { Vfd } from './Vfd';

export type StageTrigger = { name: FxName | 'temper' | 'light'; n: number } | null;

const T = {
  en: {
    drag: 'Drag to rotate', hold: 'Press and hold to break it', unbreak: 'Press and hold to restore it.',
    noGl: 'WebGL is unavailable here, showing a flat preview.', note: 'Realtime approximation (preview only)',
    brokeNote: 'Preview only. Your real order is untouched.',
    furnace: 'FURNACE ~650C', quench: 'QUENCH', tempNote: 'Tempering line: heating, then rapid air quench',
    plancha: 'One stock sheet', plancha2: 'Uncut glass (illustrative size)', cutting: 'Diamond-tip cut...',
    runTemper: 'Run through the tempering line', light: 'Shine light through', lightOff: 'Light off',
  },
  es: {
    drag: 'Arrastra para girar', hold: 'Mantén presionado para romperlo', unbreak: 'Mantén presionado para restaurarlo.',
    noGl: 'WebGL no está disponible aquí, se muestra una vista plana.', note: 'Aproximación en tiempo real (solo vista previa)',
    brokeNote: 'Solo vista previa. Tu orden real no cambia.',
    furnace: 'HORNO ~650C', quench: 'ENFRIADO', tempNote: 'Línea de templado: calentar y enfriar con aire',
    plancha: 'Una plancha', plancha2: 'Vidrio sin cortar (tamaño ilustrativo)', cutting: 'Cortando con punta de diamante...',
    runTemper: 'Pasar por la línea de templado', light: 'Luz a través del vidrio', lightOff: 'Apagar luz',
  },
} as const;

function kindOf(g: GlassTypeKey | null): { kind: GlassKind; ultra: boolean } {
  if (g === 'laminated') return { kind: 'lam', ultra: false };
  const ultra = g === 'ultra-clear-float' || g === 'ultra-clear-tempered';
  const temp = g === 'tempered' || g === 'ultra-clear-tempered';
  return { kind: temp ? 'temp' : 'clear', ultra };
}

export interface StageProps {
  lang: Lang;
  slide: string;
  glassType: GlassTypeKey | null;
  color: string | null;
  thickness: string | null;
  width: number | null;
  height: number | null;
  bevel: boolean;
  rounding: boolean;
  phone: boolean;
  trigger: StageTrigger;
  resetKey: number;
  /** returns true when the customer asked for reduced motion */
  reduced: boolean;
  filoOn: boolean;
  vfdValues?: [string, string, string] | null;
  thicknessOptions?: string[];
  onThickness?: (th: string) => void;
  qty?: number | null;
  edgePick?: boolean;
  edgeSel?: 'e1' | 'e2' | 'e3' | 'e4' | null;
  onEdgePick?: (e: 'e1' | 'e2' | 'e3' | 'e4') => void;
  measPick?: boolean;
  measSel?: { kind: 'edge' | 'corner'; id: string } | null;
  onMeasPick?: (sel: { kind: 'edge' | 'corner'; id: string } | null) => void;
  /** size slide: current offset value/units for the selected marker, plus setter for the on-glass handle */
  measVal?: number;
  measDir?: 'h' | 'v';
  measValTxt?: string;
  measSetIds?: string[];
  onMeasVal?: (v: number) => void;
  /** add slide: bevel toggle state + selected edge + its width for the on-glass handle */
  bevSides?: Record<string, boolean>;
  bevWidth?: number;
  bevWidthTxt?: string;
  onBevWidth?: (w: number) => void;
  /** add slide: rounding toggles + selected corner + radius for the on-glass handle */
  roundCorners?: Record<string, boolean>;
  roundSel?: string | null;
  onRoundPick?: (id: string) => void;
  roundRadius?: number;
  roundRadiusTxt?: string;
  onRoundRadius?: (r: number) => void;
  /** per-corner radius (inches) actually rendered in the shader: [c1, c2, c3, c4] */
  erCorners3d?: [number, number, number, number];
  /** tempered is on; turning it off must cancel a running temper animation */
  temperOn?: boolean;
  /** sandblasting is on; turning it off clears the frost */
  frostOn?: boolean;
  /** color slide: available colors shown as a 3D rack of panes behind the main pane */
  rackColors?: { key: string; name: string }[];
  onRackPick?: (key: string) => void;
}

// camera targets that actually face the selected edge/corner (view matrix maps +yaw to the -x face, +pitch to the +y face)
const EDGE_CAM: Record<'e1' | 'e2' | 'e3' | 'e4', { yaw: number; pitch: number }> = {
  e1: { yaw: 0, pitch: 1.05 }, e2: { yaw: -1.35, pitch: 0.05 },
  e3: { yaw: 0, pitch: -1.05 }, e4: { yaw: 1.35, pitch: 0.05 },
};
const CORNER_CAM: Record<string, { yaw: number; pitch: number }> = {
  c1: { yaw: -0.7, pitch: 0.6 }, c2: { yaw: -0.7, pitch: -0.6 },
  c3: { yaw: 0.7, pitch: -0.6 }, c4: { yaw: 0.7, pitch: 0.6 },
};

// world-space anchor points (front face, z = -hz to match the dims tickers)
const MEAS_PTS = (g: { hx: number; hy: number; hz: number }): Record<string, [number, number, number]> => ({
  e1: [0, g.hy, -g.hz], e2: [g.hx, 0, -g.hz], e3: [0, -g.hy, -g.hz], e4: [-g.hx, 0, -g.hz],
  c1: [g.hx, g.hy, -g.hz], c2: [g.hx, -g.hy, -g.hz], c3: [-g.hx, -g.hy, -g.hz], c4: [-g.hx, g.hy, -g.hz],
});
const EDGE_OUT: Record<string, [number, number]> = { e1: [0, 1], e2: [1, 0], e3: [0, -1], e4: [-1, 0] };
const CORNER_OUT = (id: string, dir: 'h' | 'v'): [number, number] => {
  const sx = id === 'c1' || id === 'c2' ? 1 : -1, sy = id === 'c1' || id === 'c4' ? 1 : -1;
  return dir === 'h' ? [sx, 0] : [0, sy];
};

// draggable value handle that lives on the glass: drag along its axis, hold to zoom in for precision
function DragHandle({ api, base, axis, val, max, txt, corner, onVal }: {
  api: FxApi; base: () => [number, number, number]; axis: [number, number]; val: number; max: number; txt: string; corner?: boolean; onVal: (v: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ lx: number; ly: number; v: number } | null>(null);
  const holdT = useRef(0);
  const valRef = useRef(val); valRef.current = val;
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        const b = base();
        const off = (drag.current?.v ?? valRef.current) * g.sc;
        const [x, y] = pr(b[0] + axis[0] * off, b[1] + axis[1] * off, b[2]);
        const mx = el.parentElement?.clientWidth ?? 1e9, my = el.parentElement?.clientHeight ?? 1e9;
        el.style.left = Math.min(Math.max(x, 30), mx - 30) + 'px'; el.style.top = Math.min(Math.max(y, 30), my - 30) + 'px';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);
  useEffect(() => () => { window.clearTimeout(holdT.current); if (api.zoomT) api.zoomT.current = 1; }, [api]);
  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
    drag.current = { lx: e.clientX, ly: e.clientY, v: valRef.current };
    window.clearTimeout(holdT.current);
    holdT.current = window.setTimeout(() => { if (api.zoomT) api.zoomT.current = 2.4; }, 380);
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current; if (!d) return;
    const pr = api.proj.current, g = api.geo.current;
    const b = base();
    const p0 = pr(b[0], b[1], b[2]);
    const p1 = pr(b[0] + axis[0] * g.sc, b[1] + axis[1] * g.sc, b[2]);
    const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
    const L2 = vx * vx + vy * vy || 1;
    const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
    d.lx = e.clientX; d.ly = e.clientY;
    let nv = d.v + (dx * vx + dy * vy) / L2;
    nv = Math.min(max, Math.max(0, nv));
    nv = Math.round(nv * 16) / 16;
    if (nv !== d.v) { d.v = nv; onVal(nv); }
  };
  const onUp = () => { drag.current = null; window.clearTimeout(holdT.current); if (api.zoomT) api.zoomT.current = 1; };
  return (
    <button ref={ref} type="button" className={`k-handle${corner ? ' corner' : ''}`}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <span>{txt}</span>
    </button>
  );
}

// tappable side/corner markers on the size slide (clearance / desnivel)
function MeasPick({ api, sel, onPick, label, val, valTxt, dir, setIds, onVal }: { api: FxApi; sel: { kind: string; id: string } | null; onPick: (s: { kind: 'edge' | 'corner'; id: string } | null) => void; label: (k: string, id: string) => string; val: number; valTxt: string; dir: 'h' | 'v'; setIds?: string[]; onVal: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        Object.entries(MEAS_PTS(g)).forEach(([k, pt]) => {
          const b = el.querySelector<HTMLElement>(`[data-m="${k}"]`);
          if (!b) return;
          const [x, y] = pr(pt[0], pt[1], pt[2]);
          const mx = el.parentElement?.clientWidth ?? 1e9, my = el.parentElement?.clientHeight ?? 1e9;
          b.style.left = Math.min(Math.max(x, 22), mx - 22) + 'px'; b.style.top = Math.min(Math.max(y, 22), my - 22) + 'px';
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api]);
  const Btn = ({ kind, id }: { kind: 'edge' | 'corner'; id: string }) => (
    <button data-m={id} type="button"
      className={`k-edgebtn${kind === 'corner' ? ' corner' : ''}${sel?.id === id ? ' sel' : ''}${setIds?.includes(id) ? ' has' : ''}`}
      aria-label={label(kind, id)}
      onClick={() => onPick(sel?.id === id ? null : { kind, id })} />
  );
  const axis: [number, number] = sel ? (sel.kind === 'edge' ? EDGE_OUT[sel.id] : CORNER_OUT(sel.id, dir)) : [0, 0];
  return (
    <div ref={ref} className="k-edgepick">
      {(['e1', 'e2', 'e3', 'e4'] as const).map((k) => <Btn key={k} kind="edge" id={k} />)}
      {(['c1', 'c2', 'c3', 'c4'] as const).map((k) => <Btn key={k} kind="corner" id={k} />)}
      {sel && (
        <DragHandle api={api} corner={sel.kind === 'corner'} val={val} max={sel.kind === 'edge' ? 1 : 2} txt={valTxt}
          base={() => { const g = api.geo.current; return MEAS_PTS(g)[sel.id]; }}
          axis={axis} onVal={onVal} />
      )}
    </div>
  );
}

// tappable corner markers on the add slide (edge rounding)
function RoundPick({ api, on, sel, onPick, radius, radiusTxt, onRadius }: { api: FxApi; on: Record<string, boolean>; sel: string | null; onPick: (id: string) => void; radius: number; radiusTxt: string; onRadius: (r: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        const pts = MEAS_PTS(g);
        (['c1', 'c2', 'c3', 'c4'] as const).forEach((k) => {
          const b = el.querySelector<HTMLElement>(`[data-r="${k}"]`);
          if (!b) return;
          const [x, y] = pr(pts[k][0], pts[k][1], pts[k][2]);
          const mx = el.parentElement?.clientWidth ?? 1e9, my = el.parentElement?.clientHeight ?? 1e9;
          b.style.left = Math.min(Math.max(x, 22), mx - 22) + 'px'; b.style.top = Math.min(Math.max(y, 22), my - 22) + 'px';
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api]);
  const inDiag = (id: string): [number, number] => {
    const sx = id === 'c1' || id === 'c2' ? -1 : 1, sy = id === 'c1' || id === 'c4' ? -1 : 1;
    return [sx * 0.7071, sy * 0.7071];
  };
  return (
    <div ref={ref} className="k-edgepick">
      {(['c1', 'c2', 'c3', 'c4'] as const).map((k) => (
        <button key={k} data-r={k} type="button"
          className={`k-edgebtn corner${on[k] ? ' on' : ''}${sel === k ? ' sel' : ''}`}
          aria-label={`Corner ${k.slice(1)}`}
          onClick={() => onPick(k)} />
      ))}
      {sel && (
        <DragHandle api={api} corner val={radius} max={0.5} txt={radiusTxt}
          base={() => { const g = api.geo.current; return MEAS_PTS(g)[sel]; }}
          axis={inDiag(sel)} onVal={onRadius} />
      )}
    </div>
  );
}

// color slide: tappable markers projected over each rack pane
function RackPick({ api, n, sel, tints, names, onPick, label }: { api: FxApi; n: number; sel: number; tints: [number, number, number][]; names: string[]; onPick: (i: number) => void; label: (i: number) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.projU.current, g = api.geo.current;
        const mid = (n + 1) / 2;
        const maxX = el.parentElement?.clientWidth ?? 1e9, maxY = el.parentElement?.clientHeight ?? 1e9;
        const bs: { b: HTMLElement; x: number; y: number; w: number }[] = [];
        for (let k = 1; k <= n; k++) {
          const b = el.querySelector<HTMLElement>(`[data-r="${k}"]`);
          if (!b) continue;
          const dx = (k - mid) * (g.hx * 2.15);
          const dz = 0.8 + 0.12 * Math.abs(k - mid) + 0.03 * k;
          const [x, y] = pr(dx, -g.hy * 1.02 - g.hy * 0.12, dz);
          bs.push({ b, x, y, w: b.offsetWidth || 56 });
        }
        // keep every chip inside the stage and stop neighbours overlapping; when one row cannot hold them all, use two staggered rows
        bs.forEach((it) => { it.x = Math.min(Math.max(it.x, it.w / 2 + 8), maxX - it.w / 2 - 8); });
        bs.sort((a, b2) => a.x - b2.x);
        const need1 = bs.reduce((t, it) => t + it.w + 6, 0) + 10;
        const rows = need1 > maxX ? 2 : 1;
        const rowY: number[] = [];
        for (let r = 0; r < rows; r++) {
          const grp = bs.filter((_, i) => i % rows === r);
          grp.forEach((it) => { rowY.push(0); (it as { row?: number }).row = r; });
          for (let i = 1; i < grp.length; i++) {
            const need = grp[i - 1].x + (grp[i - 1].w + grp[i].w) / 2 + 6;
            if (grp[i].x < need) grp[i].x = Math.min(need, maxX - grp[i].w / 2 - 8);
          }
          // if clamping squeezed the tail back into its neighbour, spread the row left
          for (let i = grp.length - 2; i >= 0; i--) {
            const lim = grp[i + 1].x - (grp[i].w + grp[i + 1].w) / 2 - 6;
            if (grp[i].x > lim) grp[i].x = Math.max(lim, grp[i].w / 2 + 8);
          }
        }
        const barLim = window.innerWidth < 900 ? 96 : 20; // keep chips clear of the Front/3-4/Edge-on/Break row on small screens
        bs.forEach((it) => { it.y = Math.min(it.y, maxY - barLim) - (rows - 1 - ((it as { row?: number }).row || 0)) * 28; });
        bs.forEach((it) => { it.x = Math.min(Math.max(it.x, (it.b.offsetWidth || it.w) / 2 + 6), maxX - (it.b.offsetWidth || it.w) / 2 - 6); });
        bs.forEach((it) => {
          it.b.style.left = it.x + 'px'; it.b.style.top = Math.max(it.y, 20) + 'px';
          it.b.style.visibility = 'visible';
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api, n]);
  return (
    <div ref={ref} className="k-edgepick">
      {Array.from({ length: n }, (_, i) => i + 1).map((k) => (
        <button key={k} data-r={k} type="button" className={`k-edgebtn k-rackbtn${sel === k - 1 ? ' sel' : ''}`}
          style={{
            background: `rgba(${Math.round(Math.min(tints[k - 1][0], 1) * 255)},${Math.round(Math.min(tints[k - 1][1], 1) * 255)},${Math.round(Math.min(tints[k - 1][2], 1) * 255)},.82)`,
            color: (tints[k - 1][0] + tints[k - 1][1] + tints[k - 1][2]) / 3 > 0.55 ? '#0a0a0c' : '#f2f2f4',
            textShadow: (tints[k - 1][0] + tints[k - 1][1] + tints[k - 1][2]) / 3 > 0.55 ? '0 0 3px rgba(255,255,255,.6)' : '0 0 3px rgba(0,0,0,.7)',
          }}
          aria-label={label(k - 1)} onClick={() => onPick(k - 1)}>{names[k - 1]}</button>
      ))}
    </div>
  );
}

// handoff: when the glass morphs to phone size, dress it as a phone (bezel, screen, camera, speaker, home bar)
function PhoneFx({ api }: { api: FxApi }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pm = api.pm?.current ?? 0;
        const g = api.geo.current, pr = api.proj.current, z = -g.hz;
        // same rounded rect the shader carves into the glass (corner radius 0.2*pm in world units), sampled and projected with the stage camera
        const rc = Math.max(0.001, Math.min(0.2 * pm, g.hx * 0.98, g.hy * 0.98));
        const rr = (inset: number) => {
          const ax = g.hx - inset, ay = g.hy - inset, r = Math.max(0.001, Math.min(rc - inset * 0.5, ax, ay));
          const out: string[] = [];
          const corners: [number, number, number][] = [[ax - r, ay - r, 0], [-ax + r, ay - r, 1], [-ax + r, -ay + r, 2], [ax - r, -ay + r, 3]];
          corners.forEach(([cx0, cy0, q]) => { for (let i = 0; i <= 8; i++) { const a = (q * 90 + (i / 8) * 90) * Math.PI / 180; out.push(pr(cx0 + r * Math.cos(a), cy0 + r * Math.sin(a), z).map((n) => n.toFixed(1)).join(',')); } });
          return out.join(' ');
        };
        const set = (id: string, attr: string, val: string) => el.querySelector(`#${id}`)?.setAttribute(attr, val);
        el.style.opacity = String(Math.max(0, (pm - 0.55) / 0.45));
        set('ph-bz', 'points', rr(0.045)); set('ph-sc', 'points', rr(0.11));
        const [cx, cy] = pr(0, (g.hy - 0.082), z), [sx, sy] = pr(-g.hx * 0.3, (g.hy - 0.082), z), [ex, ey] = pr(g.hx * 0.3, (g.hy - 0.082), z);
        set('ph-cam', 'cx', String(cx + (ex - sx) * 0.62)); set('ph-cam', 'cy', String(cy + (ey - sy) * 0.62));
        set('ph-spk', 'x1', String(sx)); set('ph-spk', 'y1', String(sy)); set('ph-spk', 'x2', String(ex - (ex - sx) * 0.3)); set('ph-spk', 'y2', String(ey - (ey - sy) * 0.3));
        const [bx1, by1] = pr(-g.hx * 0.3, -(g.hy - 0.16), z), [bx2, by2] = pr(g.hx * 0.3, -(g.hy - 0.16), z);
        set('ph-bar', 'x1', String(bx1)); set('ph-bar', 'y1', String(by1)); set('ph-bar', 'x2', String(bx2)); set('ph-bar', 'y2', String(by2));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api]);
  return (
    <svg ref={ref} className="k-phonefx" aria-hidden="true" style={{ opacity: 0 }}>
      <polygon id="ph-bz" fill="none" stroke="#0b0b0e" strokeWidth="9" strokeLinejoin="round" />
      <polygon id="ph-sc" fill="rgba(70,120,255,.14)" stroke="rgba(160,190,255,.5)" strokeWidth="1.5" strokeLinejoin="round" />
      <line id="ph-spk" stroke="#1d1d22" strokeWidth="4" strokeLinecap="round" />
      <circle id="ph-cam" r="4.5" fill="#15151a" stroke="#6b7fa8" strokeWidth="1.5" />
      <line id="ph-bar" stroke="rgba(255,255,255,.75)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// size slide: diamond-tip scoring wheel riding the moving cut line while the stock sheet shrinks
function CutterFx({ api, on }: { api: FxApi; on: boolean }) {
  const wref = useRef<HTMLDivElement>(null);
  const lref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => {
      const w = wref.current, l = lref.current;
      if (w && l) {
        const ov = (window as unknown as { __qgCutQ?: number }).__qgCutQ; // test hook: pin the cut to a fixed phase
        const q = ov != null ? ov : api.cut?.current;
        const g = api.geo.current, pr = api.proj.current; // wheel rides the main pane, which rotates in place
        if (q == null) { w.style.display = 'none'; l.style.display = 'none'; }
        else {
          w.style.display = 'block'; l.style.display = 'block';
          let wx: number, wy: number, ax: number, ay: number;
          const ey = g.hy * 0.97, ex = g.hx * 0.97; // stay on the flat face, inside the rounded corners
          if (q < 0.5) { const a = q * 2; wx = ex; ax = ex; wy = -ey + 2 * ey * a; ay = -ey; }
          else { const a = (q - 0.5) * 2; wx = ex - 2 * ex * a; ax = ex; wy = ey; ay = ey; }
          const [sx, sy] = pr(wx, wy, -g.hz);
          const [lx, ly] = pr(ax, ay, -g.hz);
          w.style.left = sx + 'px'; w.style.top = sy + 'px';
          l.style.left = lx + 'px'; l.style.top = ly + 'px';
          l.style.width = Math.hypot(sx - lx, sy - ly) + 'px';
          l.style.transform = `rotate(${Math.atan2(sy - ly, sx - lx)}rad)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api, on]);
  if (!on) return null;
  return (<><div ref={lref} className="k-score" /><div ref={wref} className="k-cutter"><i /></div></>);
}

// tappable edge-midpoint markers projected from the 3D glass
function EdgePick({ api, sel, onPick, label, on, width, widthTxt, onWidth }: { api: FxApi; sel: string | null; onPick: (e: 'e1' | 'e2' | 'e3' | 'e4') => void; label: (e: string) => string; on?: Record<string, boolean>; width?: number; widthTxt?: string; onWidth?: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        const pts = MEAS_PTS(g);
        (['e1', 'e2', 'e3', 'e4'] as const).forEach((k) => {
          const b = el.querySelector<HTMLElement>(`[data-e="${k}"]`);
          if (!b) return;
          const [x, y] = pr(pts[k][0], pts[k][1], pts[k][2]);
          b.style.left = x + 'px'; b.style.top = y + 'px';
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [api]);
  const inw = (id: string): [number, number] => [-EDGE_OUT[id][0], -EDGE_OUT[id][1]];
  return (
    <div ref={ref} className="k-edgepick" aria-hidden={false}>
      {(['e1', 'e2', 'e3', 'e4'] as const).map((k) => (
        <button key={k} data-e={k} type="button" className={`k-edgebtn${on?.[k] ? ' on' : ''}${sel === k ? ' sel' : ''}`}
          aria-label={label(k)} onClick={() => onPick(k)} />
      ))}
      {sel && onWidth && width != null && (
        <DragHandle api={api} val={width} max={1.5} txt={widthTxt ?? ''}
          base={() => { const g = api.geo.current; return MEAS_PTS(g)[sel]; }}
          axis={inw(sel)} onVal={onWidth} />
      )}
    </div>
  );
}

export default function GlassStage(p: StageProps) {
  const t = T[p.lang];
  const fxApi = useRef<FxApi>({ surf: { current: null }, proj: { current: () => [-999, -999] }, projU: { current: () => [-999, -999] }, geo: { current: { hx: 1, hy: 1, hz: 0.1, sc: 1 } }, cut: { current: null }, pm: { current: 0 }, zoom: { current: 1 }, zoomT: { current: 1 }, throwT: { current: 0 } }).current;
  const [fxCmd, setFxCmd] = useState<FxCmd>(null);
  const [shk, setShk] = useState(0);
  const [temper, setTemper] = useState(0);
  const [sand, setSand] = useState(p.filoOn ? 1 : 0);
  const [light, setLight] = useState(false);
  const [pl, setPl] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [stk, setStk] = useState({ n: 0, keep: 0, brk: false });
  const stkRef = useRef(stk);
  const [camEdge, setCamEdge] = useState(false);
  const planchaDone = useRef(false);
  const raf = useRef(0);
  const traf = useRef(0);
  const { kind, ultra: ultraType } = kindOf(p.glassType);
  const ultra = ultraType || p.color === 'ultra-clear';
  const w = p.width ?? 36, h = p.height ?? 72;
  const th = p.thickness ? thickValue(p.thickness) : 0.375;

  // new order: forget per-order animation state
  useEffect(() => { planchaDone.current = false; setLight(false); setTemper(0); setSand(0); setFxCmd(null); stkRef.current = { n: 0, keep: 0, brk: false }; setStk(stkRef.current); if (fxApi.throwT) fxApi.throwT.current = 0; if (fxApi.zoomT) fxApi.zoomT.current = 1; }, [p.resetKey]);

  // order placed: launch the pane out of frame with momentum (success slide keeps the stage)
  const prevSlide = useRef(p.slide);
  useEffect(() => {
    if (p.slide === 'success' && prevSlide.current !== 'success' && fxApi.throwT) fxApi.throwT.current = performance.now();
    prevSlide.current = p.slide;
  }, [p.slide]);

  // turning tempered off mid-run cancels the tempering line immediately
  useEffect(() => { if (p.temperOn === false) { cancelAnimationFrame(traf.current); setTemper(0); } }, [p.temperOn]);

  // qty slide: show a stack of stock panes (rendered count capped); picking fewer shatters the extras off
  useEffect(() => {
    if (p.slide !== 'qty') { stkRef.current = { n: 0, keep: 0, brk: false }; setStk(stkRef.current); return; }
    const SHOWN = 5;
    const q = p.qty ?? 0;
    const shown = q === 0 ? SHOWN : Math.min(q, SHOWN);
    const cur = stkRef.current.n;
    if (q === 0) { stkRef.current = { n: SHOWN, keep: SHOWN, brk: false }; setStk(stkRef.current); }
    else if (cur === 0 || shown >= cur) { stkRef.current = { n: shown, keep: shown, brk: false }; setStk(stkRef.current); }
    else {
      stkRef.current = { n: cur, keep: shown, brk: true };
      setStk(stkRef.current);
      window.setTimeout(() => { stkRef.current = { n: shown, keep: shown, brk: false }; setStk(stkRef.current); }, 1400);
    }
  }, [p.slide, p.qty]);

  // external triggers (tempering switch, finishes, payment, light)
  const lastTrig = useRef(0);
  useEffect(() => {
    const tr = p.trigger;
    if (!tr || tr.n === lastTrig.current) return;
    lastTrig.current = tr.n;
    if (tr.name === 'temper') runTemper();
    else if (tr.name === 'light') setLight((x) => !x);
    else if (tr.name === 'bevel') {
      // machine swipe, then settle on a sloped end
      setFxCmd({ name: 'bevel', n: tr.n, shatter: false });
      if (!p.reduced) { setCamEdge(true); window.setTimeout(() => setCamEdge(false), 3400); }
    }
    else setFxCmd({ name: tr.name, n: tr.n, shatter: kind === 'temp' && Math.random() < 0.6 && (tr.name === 'card' || tr.name === 'cash' || tr.name === 'phone') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.trigger]);

  // the tempering animation belongs to the type slide: stop it when the customer moves on
  useEffect(() => { if (p.slide !== 'type') { cancelAnimationFrame(traf.current); setTemper(0); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.slide]);

  function runTemper() {
    cancelAnimationFrame(traf.current);
    if (p.reduced) { setTemper(0); return; }
    const t0 = performance.now(), dur = 7000;
    const tick = (n: number) => { const q = Math.min((n - t0) / dur, 1); setTemper(q >= 1 ? 0 : Math.max(q, 0.001)); if (q < 1) traf.current = requestAnimationFrame(tick); };
    traf.current = requestAnimationFrame(tick);
  }
  function runSand() {
    cancelAnimationFrame(raf.current);
    if (p.reduced) { setSand(1); return; }
    setSand(0);
    const t0 = performance.now(), dur = 3800;
    const tick = (n: number) => { const q = Math.min((n - t0) / dur, 1); setSand(q); if (q < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
  }
  const prevFilo = useRef(p.filoOn);
  useEffect(() => {
    if (prevFilo.current === p.filoOn) return;
    prevFilo.current = p.filoOn;
    if (p.filoOn) runSand(); else { cancelAnimationFrame(raf.current); setSand(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.filoOn]);
  useEffect(() => () => { cancelAnimationFrame(raf.current); cancelAnimationFrame(traf.current); }, []);

  // Una Plancha: uncut stock sheet, diamond-tip cut, then Filo Matado on (new order only)
  useEffect(() => {
    if (p.slide !== 'size') { setPl(0); setCutting(false); fxApi.cut!.current = null; return; }
    if (planchaDone.current) { setPl(0); return; }
    if (p.reduced) { planchaDone.current = true; setPl(0); return; }
    setPl(1);
    let r = 0, t0 = 0;
    const hold = window.setTimeout(() => {
      setCutting(true);
      const tick = (ts: number) => {
        if (!t0) t0 = ts;
        const q = Math.min(1, (ts - t0) / 2600);
        fxApi.cut!.current = q;
        setPl(1 - (q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2));
        if (q < 1) r = requestAnimationFrame(tick);
        else { fxApi.cut!.current = null; setCutting(false); setPl(0); planchaDone.current = true; if (p.filoOn) runSand(); }
      };
      r = requestAnimationFrame(tick);
    }, 1400);
    return () => { clearTimeout(hold); cancelAnimationFrame(r); fxApi.cut!.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.slide]);

  const edge = p.bevel ? 'bevel' : p.rounding ? 'bull' : 'pencil';
  const bw = Math.max(w, 4), bh = Math.max(h, 4);
  const spec = useMemo(() => ({
    w: bw + pl * (Math.max(96, bw) - bw), h: bh + pl * (Math.max(130, bh) - bh), t: th, edge: edge as 'bevel' | 'bull' | 'pencil', filo: p.filoOn, sand: pl > 0 ? 0 : sand, kind, temper, ultra, flat: p.slide !== 'size',
    focus: p.slide === 'thick', front: p.slide === 'size' || p.slide === 'add', phone: p.phone, color: p.color || 'clear',
    labelW: toFracStr(bw), labelH: toFracStr(bh), labelT: p.thickness || '', breakKey: shk, light,
    stack: p.slide === 'qty' ? stk.n : 0, stackKeep: stk.keep, stackBrk: stk.brk,
    rack: p.slide === 'color' && p.rackColors && p.rackColors.length ? p.rackColors.slice(0, 6).map((c) => COLOR_TINT[c.key] || [1, 1, 1] as [number, number, number]) : undefined,
    rackSel: p.slide === 'color' && p.rackColors ? p.rackColors.slice(0, 6).findIndex((c) => c.key === p.color) : undefined,
    cam: p.measSel?.kind === 'edge' ? EDGE_CAM[p.measSel.id as 'e1']
      : p.measSel?.kind === 'corner' ? CORNER_CAM[p.measSel.id]
      : p.roundSel ? CORNER_CAM[p.roundSel]
      : p.edgeSel ? EDGE_CAM[p.edgeSel]
      : camEdge ? { yaw: -1.35, pitch: 0.05 } : null,
    erCorners: p.erCorners3d,
  }), [bw, bh, pl, th, edge, p.filoOn, sand, kind, temper, ultra, p.slide, p.phone, p.color, p.thickness, shk, light, stk, p.edgeSel, p.measSel, camEdge, p.rackColors, p.roundSel, p.erCorners3d]);

  const dims = `${toFracStr(bw)} x ${toFracStr(bh)}${p.thickness ? ' x ' + p.thickness : ''}`;
  return (
    <div className="k-stage" aria-label="3D glass preview">
      <FxLayer cmd={fxCmd} reduced={p.reduced} onShatter={() => setShk((k) => k + 1)} resetKey={p.resetKey} api={fxApi} aspect={bw / bh} heat={temper} frostOn={p.frostOn ?? true} />
      <div className="k-panel" style={{ filter: 'brightness(1) contrast(1.4)' }}>
      <GlassViewer fxApi={fxApi} spec={spec} reduced={p.reduced} labels={{ drag: t.drag, hold: t.hold, unbreak: t.unbreak, noGl: t.noGl, note: t.note, dims, brokeNote: t.brokeNote, furnace: t.furnace, quench: t.quench, tempNote: t.tempNote }} />
      </div>
      {pl > 0 && <div className="k-plancha" role="status"><b>{t.plancha}</b><small>{cutting ? t.cutting : t.plancha2}</small></div>}
      <CutterFx api={fxApi} on={cutting} />
      <PhoneFx api={fxApi} />
      {p.slide === 'thick' && p.thicknessOptions && p.onThickness && (() => {
        const opts = [...p.thicknessOptions].reverse();
        const n = opts.length;
        const sel = Math.max(0, opts.indexOf(p.thickness || ''));
        const pickAt = (clientY: number, track: HTMLElement) => {
          const r = track.getBoundingClientRect();
          const frac = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
          const o = opts[Math.round(frac * (n - 1))];
          if (o && o !== p.thickness) p.onThickness!(o);
        };
        const vertical = (track: HTMLElement) => getComputedStyle(track).flexDirection === 'column';
        const dragStart = (e: React.PointerEvent<HTMLDivElement>) => {
          const track = e.currentTarget;
          if (!vertical(track)) return; // small screens show a horizontal strip: tap only
          track.setPointerCapture(e.pointerId);
          pickAt(e.clientY, track);
        };
        const dragMove = (e: React.PointerEvent<HTMLDivElement>) => {
          const track = e.currentTarget;
          if (!track.hasPointerCapture(e.pointerId) || !vertical(track)) return;
          pickAt(e.clientY, track);
        };
        return (
        <div className="k-ruler" role="radiogroup" aria-label={p.lang === 'es' ? 'Grosor' : 'Thickness'}>
          <b>{p.thickness || '\u2014'}</b>
          <div className="k-ruler-track" onPointerDown={dragStart} onPointerMove={dragMove}>
            <span className="k-ruler-thumb" style={{ top: `calc(15px + (100% - 30px) * ${n > 1 ? sel / (n - 1) : 0})` }} />
            {opts.map((o) => (
              <button type="button" role="radio" aria-checked={o === p.thickness} key={o} className={o === p.thickness ? 'on' : ''} onClick={() => p.onThickness!(o)}>
                <i />{o}
              </button>
            ))}
          </div>
        </div>
        );
      })()}
      {p.measPick && p.onMeasPick && (
        <MeasPick api={fxApi} sel={p.measSel ?? null} onPick={p.onMeasPick}
          val={p.measVal ?? 0} valTxt={p.measValTxt ?? ''} dir={p.measDir ?? 'h'} setIds={p.measSetIds}
          onVal={(v) => p.onMeasVal?.(v)}
          label={(kind, id) => (kind === 'edge' ? (p.lang === 'es' ? 'Canto ' : 'Edge ') : (p.lang === 'es' ? 'Esquina ' : 'Corner ')) + id.slice(1)} />
      )}
      {p.roundCorners && p.onRoundPick && p.slide === 'add' && (
        <RoundPick api={fxApi} on={p.roundCorners} sel={p.roundSel ?? null} onPick={p.onRoundPick}
          radius={p.roundRadius ?? 0} radiusTxt={p.roundRadiusTxt ?? ''} onRadius={(r) => p.onRoundRadius?.(r)} />
      )}
      {p.slide === 'color' && p.rackColors && p.rackColors.length > 0 && p.onRackPick && (
        <RackPick api={fxApi} n={Math.min(p.rackColors.length, 6)}
          sel={p.rackColors.slice(0, 6).findIndex((c) => c.key === p.color)}
          tints={p.rackColors.slice(0, 6).map((c) => COLOR_TINT[c.key] || [1, 1, 1] as [number, number, number])}
          names={p.rackColors.slice(0, 6).map((c) => c.name)}
          onPick={(i) => p.onRackPick!(p.rackColors![i].key)}
          label={(i) => (p.lang === 'es' ? 'Color ' : 'Color ') + (p.rackColors![i]?.name ?? '')} />
      )}
      {p.edgePick && p.onEdgePick && (
        <EdgePick api={fxApi} sel={p.edgeSel ?? null} onPick={p.onEdgePick} label={(e) => (p.lang === 'es' ? 'Canto ' : 'Edge ') + e.slice(1)}
          on={p.bevSides} width={p.bevWidth} widthTxt={p.bevWidthTxt} onWidth={p.onBevWidth} />
      )}
      <div className="k-stage-bar">
        {kind === 'temp' && p.slide === 'type' && <button type="button" className="btn ghost" onClick={runTemper} disabled={temper > 0}>{t.runTemper}</button>}
        {p.slide === 'review' && <button type="button" className="btn ghost" aria-pressed={light} onClick={() => setLight(!light)}>{light ? t.lightOff : t.light}</button>}
      </div>
      <div className="k-vfd"><Vfd lang={p.lang} values={p.vfdValues} /></div>
    </div>
  );
                                                    }
