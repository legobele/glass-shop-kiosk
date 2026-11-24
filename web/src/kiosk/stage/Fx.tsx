import { useEffect, useRef } from 'react';
import type { FxApi } from './Glass';

export type FxName = 'sand' | 'dfusion' | 'pasta' | 'cash' | 'card' | 'phone' | 'bevel';
export type FxCmd = { name: FxName; n: number; shatter: boolean } | null;
type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; c: string; rot?: number; vr?: number };

export function FxLayer({ cmd, reduced, onShatter, resetKey, api, aspect }: { cmd: FxCmd; reduced: boolean; onShatter: () => void; resetKey: number; api: FxApi; aspect: number }) {
    const cv = useRef<HTMLCanvasElement>(null);
    const st = useRef({ frost: 0, pasta: [] as { x: number; y: number; a: number }[], sauce: [] as { x: number; y: number; r: number }[], drops: [] as { x: number; y: number; r: number }[], parts: [] as P[], anim: null as null | { name: FxName; t0: number; dur: number; shatter: boolean; hit?: boolean }, cracks: [] as number[][], wipe: -1, raf: 0, aspect: 0.5 });
    const shatterRef = useRef(onShatter); shatterRef.current = onShatter;
    st.current.aspect = aspect;

    useEffect(() => { const s = st.current; s.frost = 0; s.pasta = []; s.sauce = []; s.drops = []; s.parts = []; s.cracks = []; s.anim = null; s.wipe = -1; }, [resetKey]);

    useEffect(() => {
        if (!cmd) return;
        const s = st.current;
        const dur = reduced ? 300 : ({ sand: 5600, dfusion: 4200, pasta: 1700, cash: 2800, card: 1700, phone: 1800, bevel: 2600 } as const)[cmd.name];
        if (cmd.name === 'dfusion') { s.drops = []; s.wipe = -1; }
        s.anim = { name: cmd.name, t0: performance.now(), dur, shatter: cmd.shatter };
        if (reduced) {
            if (cmd.name === 'sand') s.frost = 1;
            if (cmd.name === 'pasta') { for (let i = 0; i < 14; i++) s.pasta.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6 }); s.sauce.push({ x: 0.5, y: 0.5, r: 0.08 }); }
            if (cmd.name === 'dfusion') { s.pasta = []; s.sauce = []; s.drops = []; }
        }
    }, [cmd, reduced]);

    useEffect(() => {
        const c = cv.current!, ctx = c.getContext('2d')!, s = st.current;
        const sf = document.createElement('canvas'); sf.width = 512; sf.height = 1024; api.surf.current = sf;
        const sx = sf.getContext('2d')!;
        const fit = () => { const r = c.parentElement!.getBoundingClientRect(); const d = Math.min(window.devicePixelRatio || 1, 2); c.width = r.width * d; c.height = r.height * d; c.style.width = r.width + 'px'; c.style.height = r.height + 'px'; ctx.setTransform(d, 0, 0, d, 0, 0); };
        fit(); const ro = new ResizeObserver(fit); ro.observe(c.parentElement!);
        const frame = (now: number) => {
            const W = c.clientWidth, H = c.clientHeight;
            ctx.clearRect(0, 0, W, H);
            // ---- surface texture in glass UV space
            const th = Math.max(128, Math.min(1024, Math.round(512 / Math.max(s.aspect, 0.25))));
            if (sf.height !== th) sf.height = th;
            const SW = sf.width, SH = sf.height;
            sx.clearRect(0, 0, SW, SH);
            const ar = SH / SW; // uv y scale so circles stay round
            if (s.frost > 0) {
                const fh = SH * Math.min(s.frost, 1);
                sx.fillStyle = 'rgba(212,221,229,.5)'; sx.fillRect(0, 0, SW, fh);
                const rnd = (k: number) => { const h = Math.sin(k) * 43758.5453; return h - Math.floor(h); };
                const ymax = Math.max(1, Math.floor(fh));
                for (let i = 0; i < 3200; i++) {
                    const x = rnd(i * 12.9898) * SW, y = rnd(i * 78.233 + 4.7) * ymax;
                    sx.fillStyle = i % 2 ? 'rgba(255,255,255,.14)' : 'rgba(148,162,176,.12)';
                    sx.fillRect(x, y, 1, 1);
                }
            }
            s.sauce.forEach((p) => { sx.fillStyle = 'rgba(176,34,18,.95)'; sx.beginPath(); sx.ellipse(p.x * SW, p.y * SH, p.r * SW, p.r * SW * 0.85, 0, 0, 7); sx.fill(); });
            sx.lineCap = 'round';
            s.pasta.forEach((p) => { sx.strokeStyle = 'rgb(243,206,98)'; sx.lineWidth = 9; sx.beginPath(); const x = p.x * SW, y = p.y * SH; sx.moveTo(x, y); sx.bezierCurveTo(x + 40 * Math.cos(p.a), y - 30, x - 34, y + 40 * Math.sin(p.a), x + 50, y + 22); sx.stroke(); });
            s.drops.forEach((d) => { sx.fillStyle = 'rgba(120,190,255,.55)'; sx.strokeStyle = 'rgba(255,255,255,.95)'; sx.lineWidth = 2; sx.beginPath(); sx.ellipse(d.x * SW, d.y * SH, d.r * SW, d.r * SW * 1.15, 0, 0, 7); sx.fill(); sx.stroke(); sx.fillStyle = 'rgba(255,255,255,.95)'; sx.beginPath(); sx.arc(d.x * SW - d.r * SW * 0.3, d.y * SH - d.r * SW * 0.35, d.r * SW * 0.25, 0, 7); sx.fill(); });
            void ar;
            // ---- screen overlay using true projection
            const pr = api.proj.current, g = api.geo.current;
            const UV = (u: number, v: number, z = 0): [number, number] => pr((u - 0.5) * 2 * g.hx, (0.5 - v) * 2 * g.hy, g.hz + z);
            ctx.lineCap = 'round';
            // plancha scoring wheel is drawn by CutterFx in GlassStage (DOM overlay on the front face)
            const a = s.anim;
            if (a) {
                const p = Math.min((now - a.t0) / a.dur, 1);
                const ctr = UV(0.5, 0.45);
                if (a.name === 'sand') {
                    const rows = 8, rp = p * rows, row = Math.min(Math.floor(rp), rows - 1), f = rp - row, dir = row % 2 ? -1 : 1;
                    const u = dir > 0 ? f : 1 - f, v = (row + 0.5) / rows;
                    s.frost = Math.max(s.frost, (row + 0.5 + f * 0.5) / rows);
                    const r0 = UV(-0.06, v, 0.1), r1 = UV(1.06, v, 0.1);
                    ctx.strokeStyle = '#3a4350'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.stroke();
                    const nz = UV(u, v, 0.1), tip = UV(u, v, 0.02);
                    ctx.fillStyle = '#ff9d2e'; ctx.fillRect(nz[0] - 14, nz[1] - 16, 28, 22); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(nz[0] - 4, nz[1] + 6, 8, 12);
                    for (let i = 0; i < 7; i++) { const t = UV(u + (Math.random() - 0.5) * 0.08, v + (Math.random() - 0.5) * 0.04, 0.01); s.parts.push({ x: nz[0], y: nz[1] + 18, vx: (t[0] - nz[0]) / 8, vy: (t[1] - nz[1]) / 8, r: 1.6, life: 8, c: '#ecd49f' }); }
                    void tip;
                }
                if (a.name === 'dfusion') {
                    if (p < 0.4) { const k = Math.floor(p / 0.4 * 28); while (s.drops.length < k) { const x = 0.05 + Math.random() * 0.9, y = 0.04 + Math.random() * 0.92; s.drops.push({ x, y, r: 0.012 + Math.random() * 0.02 }); const q = UV(x, y); for (let i = 0; i < 4; i++) s.parts.push({ x: q[0], y: q[1], vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 3, r: 2, life: 14, c: '#9fd2ff' }); } }
                    else if (p > 0.5) {
                        const q = (p - 0.5) / 0.5, cu = -0.1 + q * 1.2, wob = Math.sin(q * 16) * 0.05;
                        const keep = (o: { x: number }) => o.x > cu + 0.08;
                        s.drops = s.drops.filter(keep); s.pasta = s.pasta.filter(keep); s.sauce = s.sauce.filter(keep);
                        const cs = [[cu - 0.07, -0.04 + wob], [cu + 0.07, -0.04 + wob * 0.6], [cu + 0.07, 1.04 + wob * 0.6], [cu - 0.07, 1.04 + wob]].map(([u, v]) => UV(u, v, 0.05));
                        ctx.fillStyle = 'rgba(60,123,214,.93)'; ctx.beginPath(); cs.forEach((q2, i) => i ? ctx.lineTo(q2[0], q2[1]) : ctx.moveTo(q2[0], q2[1])); ctx.closePath(); ctx.fill();
                        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; for (let i = 1; i < 9; i++) { const t = i / 9; const A = [cs[0][0] + (cs[3][0] - cs[0][0]) * t, cs[0][1] + (cs[3][1] - cs[0][1]) * t], B = [cs[1][0] + (cs[2][0] - cs[1][0]) * t, cs[1][1] + (cs[2][1] - cs[1][1]) * t]; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
                    }
                }
                if (a.name === 'pasta') {
                    const hit = p > 0.45;
                    if (!a.hit && hit) { a.hit = true; for (let i = 0; i < 18; i++) s.pasta.push({ x: 0.08 + Math.random() * 0.84, y: 0.06 + Math.random() * 0.88, a: Math.random() * 6 }); for (let i = 0; i < 5; i++) s.sauce.push({ x: 0.2 + Math.random() * 0.6, y: 0.15 + Math.random() * 0.7, r: 0.04 + Math.random() * 0.05 }); }
                    if (!hit) { const q = p / 0.45, y = H + 40 + (ctr[1] - H - 40) * q; ctx.fillStyle = '#e9e6df'; ctx.beginPath(); ctx.ellipse(ctr[0], y, 70, 24, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#f1cf6b'; for (let i = 0; i < 9; i++) ctx.fillRect(ctr[0] - 60 + i * 14, y - 28, 4, 26); }
                }
                if (a.name === 'bevel') {
                    // beveling machine: the glass feeds through the head like a credit card swipe
                    const q = p, u = q * 1.2 - 0.1;
                    const hx = UV(u, 1.0, 0.14);
                    ctx.fillStyle = '#2c3340'; ctx.fillRect(hx[0] - 30, hx[1] - 74, 60, 64);
                    ctx.fillStyle = '#465062'; ctx.fillRect(hx[0] - 30, hx[1] - 74, 60, 12);
                    ctx.fillStyle = '#d9dde3'; ctx.beginPath(); ctx.moveTo(hx[0] - 8, hx[1] - 10); ctx.lineTo(hx[0] + 8, hx[1] - 10); ctx.lineTo(hx[0], hx[1] + 6); ctx.closePath(); ctx.fill();
                    for (let i = 0; i < 6; i++) s.parts.push({ x: hx[0], y: hx[1] + 2, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 4 - 1, r: 1.8, life: 12, c: '#ffd27a' });
                }
                if (a.name === 'cash') {
                    if (p < 0.85) for (let i = 0; i < 3; i++) s.parts.push({ x: W / 2 + (Math.random() - 0.5) * 40, y: H * 0.6, vx: (Math.random() - 0.5) * 10, vy: -3 - Math.random() * 6, r: 15, life: 100, c: Math.random() > 0.4 ? '#4ea05a' : '#7bc47f', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
                }
                if (a.name === 'card' || a.name === 'phone') {
                    const hp = 0.55, q = Math.min(p / hp, 1);
                    const x = -80 + q * (ctr[0] + 80), y = H * 0.85 + (ctr[1] - H * 0.85) * q - Math.sin(q * Math.PI) * 70;
                    if (p < hp) {
                        ctx.save(); ctx.translate(x, y); ctx.rotate(q * 14);
                        if (a.name === 'card') { ctx.fillStyle = '#d4a017'; ctx.fillRect(-28, -17, 56, 34); ctx.fillStyle = '#222'; ctx.fillRect(-28, -8, 56, 7); }
                        else { ctx.fillStyle = '#111'; ctx.fillRect(-15, -30, 30, 60); ctx.fillStyle = '#4a90e2'; ctx.fillRect(-12, -26, 24, 46); }
                        ctx.restore();
                    } else if (!a.hit) {
                        a.hit = true;
                        for (let i = 0; i < 14; i++) s.parts.push({ x: ctr[0], y: ctr[1], vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, r: 2.5, life: 26, c: a.name === 'phone' ? (i % 2 ? '#ffb02e' : '#ff4d2e') : '#ffd966' });
                        if (a.name === 'card' && a.shatter) {
                            for (let i = 0; i < 26; i++) { const an = Math.random() * 6.28, l = 40 + Math.random() * Math.min(W, H) * 0.3; s.cracks.push([ctr[0], ctr[1], ctr[0] + Math.cos(an) * l, ctr[1] + Math.sin(an) * l]); }
                            shatterRef.current();
                        }
                    }
                    if (a.hit && a.name === 'phone') { ctx.fillStyle = `rgba(255,150,40,${0.4 * (1 - p)})`; ctx.beginPath(); ctx.arc(ctr[0], ctr[1], 20 + p * 80, 0, 7); ctx.fill(); }
                }
                if (p >= 1) { s.anim = null; if (a.name === 'sand') s.frost = 1; setTimeout(() => { s.cracks = []; }, 1200); }
            }
            ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5;
            s.cracks.forEach((l) => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); });
            s.parts = s.parts.filter((q) => q.life > 0);
            s.parts.forEach((q) => { q.x += q.vx; q.y += q.vy; if (q.rot !== undefined) q.vy += 0.18; q.life--; ctx.globalAlpha = Math.min(1, q.life / 10); ctx.fillStyle = q.c; if (q.rot !== undefined) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((q.rot += q.vr || 0)); ctx.fillRect(-q.r, -q.r * 0.55, q.r * 2, q.r * 1.1); ctx.restore(); } else { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; });
            s.raf = requestAnimationFrame(frame);
        };
        s.raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(s.raf); ro.disconnect(); };
    }, []);
    return <canvas ref={cv} className="qa-fx" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }} />;
}
