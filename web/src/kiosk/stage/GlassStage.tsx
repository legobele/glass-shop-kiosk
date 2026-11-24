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
    drag: 'Drag to rotate', front: 'Front', angle: '3/4 view', edge: 'Edge-on',
    noGl: 'WebGL is unavailable here, showing a flat preview.', note: 'Realtime approximation (preview only)',
    brk: 'Break it', restore: 'Restore glass', brokeNote: 'Preview only. Your real order is untouched.',
    furnace: 'FURNACE ~650C', quench: 'QUENCH', tempNote: 'Tempering line: heating, then rapid air quench',
    plancha: 'One stock sheet', plancha2: 'Uncut glass (illustrative size)', cutting: 'Diamond-tip cut...',
    runTemper: 'Run through the tempering line', light: 'Shine light through', lightOff: 'Light off',
  },
  es: {
    drag: 'Arrastra para girar', front: 'Frente', angle: 'Vista 3/4', edge: 'De canto',
    noGl: 'WebGL no está disponible aquí, se muestra una vista plana.', note: 'Aproximación en tiempo real (solo vista previa)',
    brk: 'Romperlo', restore: 'Restaurar vidrio', brokeNote: 'Solo vista previa. Tu orden real no cambia.',
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
  /** color slide: available colors shown as a 3D rack of panes behind the main pane */
  rackColors?: { key: string; name: string }[];
  onRackPick?: (key: string) => void;
}

const EDGE_CAM: Record<'e1' | 'e2' | 'e3' | 'e4', { yaw: number; pitch: number }> = {
  e1: { yaw: 0, pitch: -1.05 }, e2: { yaw: 1.35, pitch: 0.05 },
  e3: { yaw: 0, pitch: 1.05 }, e4: { yaw: -1.35, pitch: 0.05 },
};
const CORNER_CAM: Record<string, { yaw: number; pitch: number }> = {
  c1: { yaw: 0.7, pitch: -0.6 }, c2: { yaw: 0.7, pitch: 0.6 },
  c3: { yaw: -0.7, pitch: 0.6 }, c4: { yaw: -0.7, pitch: -0.6 },
};

// tappable side/corner markers on the size slide (clearance / desnivel)
function MeasPick({ api, sel, onPick, label }: { api: FxApi; sel: { kind: string; id: string } | null; onPick: (s: { kind: 'edge' | 'corner'; id: string } | null) => void; label: (k: string, id: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        const pts: Record<string, [number, number, number]> = {
          e1: [0, g.hy, g.hz], e2: [g.hx, 0, g.hz], e3: [0, -g.hy, g.hz], e4: [-g.hx, 0, g.hz],
          c1: [g.hx, g.hy, g.hz], c2: [g.hx, -g.hy, g.hz], c3: [-g.hx, -g.hy, g.hz], c4: [-g.hx, g.hy, g.hz],
        };
        Object.entries(pts).forEach(([k, pt]) => {
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
      className={`k-edgebtn${kind === 'corner' ? ' corner' : ''}${sel?.id === id ? ' sel' : ''}`}
      aria-label={label(kind, id)}
      onClick={() => onPick(sel?.id === id ? null : { kind, id })} />
  );
  return (
    <div ref={ref} className="k-edgepick">
      {(['e1', 'e2', 'e3', 'e4'] as const).map((k) => <Btn key={k} kind="edge" id={k} />)}
      {(['c1', 'c2', 'c3', 'c4'] as const).map((k) => <Btn key={k} kind="corner" id={k} />)}
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
          const dx = (k - mid) * (g.hx * 1.28);
          const dz = 0.8 + 0.3 * Math.abs(k - mid) + 0.06 * k;
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
function EdgePick({ api, sel, onPick, label }: { api: FxApi; sel: string | null; onPick: (e: 'e1' | 'e2' | 'e3' | 'e4') => void; label: (e: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const pr = api.proj.current, g = api.geo.current;
        const pts: Record<string, [number, number, number]> = {
          e1: [0, g.hy, g.hz], e2: [g.hx, 0, g.hz], e3: [0, -g.hy, g.hz], e4: [-g.hx, 0, g.hz],
        };
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
  return (
    <div ref={ref} className="k-edgepick" aria-hidden={false}>
      {(['e1', 'e2', 'e3', 'e4'] as const).map((k) => (
        <button key={k} data-e={k} type="button" className={`k-edgebtn${sel === k ? ' sel' : ''}`}
          aria-label={label(k)} onClick={() => onPick(k)} />
      ))}
    </div>
  );
}

export default function GlassStage(p: StageProps) {
  const t = T[p.lang];
  const fxApi = useRef<FxApi>({ surf: { current: null }, proj: { current: () => [-999, -999] }, projU: { current: () => [-999, -999] }, geo: { current: { hx: 1, hy: 1, hz: 0.1 } }, cut: { current: null }, pm: { current: 0 } }).current;
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
  const { kind, ultra } = kindOf(p.glassType);
  const w = p.width ?? 36, h = p.height ?? 72;
  const th = p.thickness ? thickValue(p.thickness) : 0.375;

  // new order: forget per-order animation state
  useEffect(() => { planchaDone.current = false; setLight(false); setTemper(0); setSand(0); setFxCmd(null); stkRef.current = { n: 0, keep: 0, brk: false }; setStk(stkRef.current); }, [p.resetKey]);

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
  const [bright, setBright] = useState(100);
  const [ctlOpen, setCtlOpen] = useState(false);
  const [contrast, setContrast] = useState(100);
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
    w: bw + pl * (Math.max(96, bw) - bw), h: bh + pl * (Math.max(130, bh) - bh), t: th, edge: edge as 'bevel' | 'bull' | 'pencil', filo: p.filoOn, sand: pl > 0 ? 0 : sand, kind, temper, ultra,
    focus: p.slide === 'size' || p.slide === 'thick', front: p.slide === 'add', phone: p.phone, color: p.color || 'clear',
    labelW: toFracStr(bw), labelH: toFracStr(bh), labelT: p.thickness || '', breakKey: shk, light,
    stack: p.slide === 'qty' ? stk.n : 0, stackKeep: stk.keep, stackBrk: stk.brk,
    rack: p.slide === 'color' && p.rackColors && p.rackColors.length ? p.rackColors.slice(0, 6).map((c) => COLOR_TINT[c.key] || [1, 1, 1] as [number, number, number]) : undefined,
    rackSel: p.slide === 'color' && p.rackColors ? p.rackColors.slice(0, 6).findIndex((c) => c.key === p.color) : undefined,
    cam: p.edgeSel ? EDGE_CAM[p.edgeSel]
      : p.measSel?.kind === 'edge' ? EDGE_CAM[p.measSel.id as 'e1']
      : p.measSel?.kind === 'corner' ? CORNER_CAM[p.measSel.id]
      : camEdge ? { yaw: 1.35, pitch: 0.05 } : null,
  }), [bw, bh, pl, th, edge, p.filoOn, sand, kind, temper, ultra, p.slide, p.phone, p.color, p.thickness, shk, light, stk, p.edgeSel, p.measSel, camEdge, p.rackColors]);

  const dims = `${toFracStr(bw)} x ${toFracStr(bh)}${p.thickness ? ' x ' + p.thickness : ''}`;
  return (
    <div className="k-stage" aria-label="3D glass preview">
      <FxLayer cmd={fxCmd} reduced={p.reduced} onShatter={() => setShk((k) => k + 1)} resetKey={p.resetKey} api={fxApi} aspect={bw / bh} />
      <div className="k-panel" style={{ filter: `brightness(${bright / 100}) contrast(${contrast / 100})` }}>
      <GlassViewer fxApi={fxApi} spec={spec} reduced={p.reduced} labels={{ drag: t.drag, front: t.front, angle: t.angle, edge: t.edge, noGl: t.noGl, note: t.note, dims, brk: t.brk, restore: t.restore, brokeNote: t.brokeNote, furnace: t.furnace, quench: t.quench, tempNote: t.tempNote }} />
      </div>
      <button type="button" className="k-ctl-toggle" aria-expanded={ctlOpen} aria-label={p.lang === 'es' ? 'Brillo y contraste' : 'Brightness and contrast'} onClick={() => setCtlOpen((o) => !o)}>{'\u2600'}</button>
      <div className={`k-panel-ctl${ctlOpen ? ' open' : ''}`} style={pl > 0 ? { opacity: 0, pointerEvents: 'none', transition: 'opacity .2s' } : { transition: 'opacity .2s' }}>
        <label>{p.lang === 'es' ? 'Brillo' : 'Brightness'}<input type="range" min={30} max={100} value={bright} onChange={(e) => setBright(+e.target.value)} /></label>
        <label>{p.lang === 'es' ? 'Contraste' : 'Contrast'}<input type="range" min={60} max={140} value={contrast} onChange={(e) => setContrast(+e.target.value)} /></label>
      </div>
      {pl > 0 && <div className="k-plancha" role="status"><b>{t.plancha}</b><small>{cutting ? t.cutting : t.plancha2}</small></div>}
      <CutterFx api={fxApi} on={cutting} />
      <PhoneFx api={fxApi} />
      {p.slide === 'thick' && p.thicknessOptions && p.onThickness && (
        <div className="k-ruler" role="radiogroup" aria-label={p.lang === 'es' ? 'Grosor' : 'Thickness'}>
          <b>{p.thickness || '\u2014'}</b>
          <div className="k-ruler-track">
            {[...p.thicknessOptions].reverse().map((o) => (
              <button type="button" role="radio" aria-checked={o === p.thickness} key={o} className={o === p.thickness ? 'on' : ''} onClick={() => p.onThickness!(o)}>
                <i />{o}
              </button>
            ))}
          </div>
        </div>
      )}
      {p.measPick && p.onMeasPick && (
        <MeasPick api={fxApi} sel={p.measSel ?? null} onPick={p.onMeasPick}
          label={(kind, id) => (kind === 'edge' ? (p.lang === 'es' ? 'Canto ' : 'Edge ') : (p.lang === 'es' ? 'Esquina ' : 'Corner ')) + id.slice(1)} />
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
        <EdgePick api={fxApi} sel={p.edgeSel ?? null} onPick={p.onEdgePick} label={(e) => (p.lang === 'es' ? 'Canto ' : 'Edge ') + e.slice(1)} />
      )}
      <div className="k-stage-bar">
        {kind === 'temp' && p.slide === 'type' && <button type="button" className="btn ghost" onClick={runTemper} disabled={temper > 0}>{t.runTemper}</button>}
        {p.slide === 'review' && <button type="button" className="btn ghost" aria-pressed={light} onClick={() => setLight(!light)}>{light ? t.lightOff : t.light}</button>}
      </div>
      <div className="k-vfd"><Vfd lang={p.lang} values={p.vfdValues} /></div>
    </div>
  );
                                                    }
