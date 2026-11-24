import React, { useEffect, useRef, useState } from 'react';

export const isMir = (c?: string) => !!c && (c.startsWith('mirror') || c === 'optic-white');
export type GlassKind = 'clear' | 'temp' | 'lam' | 'lowe';
export type EdgeKind = 'flat' | 'pencil' | 'bull' | 'bevel';

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes; uniform mat3 uR; uniform vec3 uHalf; uniform float uRad;
uniform float uIor; uniform float uDisp; uniform vec3 uAbsorb; uniform float uRefl; uniform vec3 uReflTint; uniform float uHaze; uniform float uBack; uniform float uBevel; uniform float uSand; uniform float uCor; uniform vec3 uColT; uniform float uMir; uniform float uGlare; uniform float uHide; uniform float uHeat; uniform sampler2D uSurf; uniform float uN; uniform float uBrk; uniform float uKeep; uniform float uLamp; uniform vec3 uOff; uniform float uRack; uniform vec3 uRackCol[7]; uniform float uRackSel;
float sdBox(vec3 p){
  if (uCor > .001) {
    vec2 q2 = abs(p.xy) - (uHalf.xy - vec2(uCor));
    float d2 = length(max(q2, 0.)) + min(max(q2.x, q2.y), 0.) - uCor + uRad;
    float dz = abs(p.z) - (uHalf.z - uRad);
    vec2 w = vec2(d2, dz);
    return min(max(w.x, w.y), 0.) + length(max(w, 0.)) - uRad;
  }
  vec3 q = abs(p) - (uHalf - vec3(uRad)); vec3 m = max(q, 0.); float o = mix(length(m), (m.x + m.y + m.z) * .7071, uBevel); return o + min(max(q.x, max(q.y, q.z)), 0.) - uRad; }
float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 nrm(vec3 p){ vec2 e = vec2(.002, 0.); return normalize(vec3(sdBox(p+e.xyy)-sdBox(p-e.xyy), sdBox(p+e.yxy)-sdBox(p-e.yxy), sdBox(p+e.yyx)-sdBox(p-e.yyx))); }
float sb(float az, float el, float a0, float e0, float w, float h){
  float da = abs(mod(az - a0 + 3.14159, 6.28318) - 3.14159);
  return smoothstep(w, w - .04, da) * smoothstep(h, h - .04, abs(el - e0));
}
vec3 env(vec3 d, float soft){
  d = normalize(d);
  float az = atan(d.x, d.z), el = d.y;
  vec3 col = mix(vec3(.02,.025,.05), vec3(.14,.19,.34), smoothstep(-.1, .9, el));
  float u = (az + 3.14159) * (uBack > .5 ? 5.0 : 3.0);
  float band = floor(u), f = fract(u);
  vec3 bc = .5 + .5 * cos(6.2831 * (band * .137 + vec3(0., .33, .67)));
  float wall = smoothstep(.04, .09, f) * smoothstep(.96, .91, f) * smoothstep(-.12, .02, el) * smoothstep(.7, .4, el);
  col = mix(col, bc * .6, wall * .85 * (1. - soft));
  col += vec3(.30, .29, .28) * soft * smoothstep(-.12, .02, el) * smoothstep(.7, .4, el);
  float lk = 1. - soft;
  col += vec3(2.6, 2.5, 2.3) * sb(az, el, 0.0, .42, .28, .12) * lk;
  col += vec3(1.7, 2.0, 2.6) * sb(az, el, 1.9, .3, .2, .3) * lk;
  col += vec3(2.4, 1.6, 1.1) * sb(az, el, -2.0, .35, .14, .35) * lk;
  col += vec3(1.2) * sb(az, el, 3.0, .6, .5, .08) * lk;
  col += vec3(.34, .33, .31) * soft * smoothstep(-.12, .02, el) * smoothstep(.85, .25, el);
  col += vec3(7., 6.4, 5.4) * uLamp * exp(-pow(acos(clamp(dot(d, vec3(0., .03, 1.)), -1., 1.)) * 11., 2.)) * (1. - soft * .9);
  float fl = smoothstep(0., -.1, el);
  if (fl > 0.) {
    vec2 g = d.xz / (-el + .02) * 1.2;
    vec2 gl = abs(fract(g) - .5);
    float line = smoothstep(.46, .5, max(gl.x, gl.y)) * smoothstep(-.03, -.22, el);
    vec3 fc = mix(vec3(.025,.03,.045), vec3(.28,.4,.75), line) * exp(-length(g) * .09);
    col = mix(col, fc, fl);
  }
  return col;
}
vec3 refr(vec3 p, vec3 n, vec3 rd, float ior){
  vec3 rin = refract(rd, n, 1. / ior);
  vec3 q = p - n * .004;
  float s = .012; vec3 qq = q; float dd = 1.;
  for (int i = 0; i < 96; i++) { qq = q + rin * s; dd = -sdBox(qq); if (dd < .0015) break; s += max(dd * .8, .003); }
  vec3 no = nrm(qq);
  // analytic exit normal, always computed: converged normals near the rim still jitter per pixel
  // (tiny SDF gradients at grazing) and that jitter reads as white speckle once the exit ray
  // sweeps across the bright env lights, so stabilize toward the flat slab face
  vec3 inv = 1. / (rin + vec3(1e-5)); vec3 tb = (sign(rin) * uHalf - q) * inv;
  vec3 na = tb.z <= tb.x && tb.z <= tb.y ? vec3(0., 0., sign(rin.z)) : (tb.x < tb.y ? vec3(sign(rin.x), 0., 0.) : vec3(0., sign(rin.y), 0.));
  no = normalize(mix(no, na, .68));
  if (dd > .01) {
    // march did not converge (grazing rays near the rim): exit through the slab analytically so no random normals leak
    float te = min(tb.x, min(tb.y, tb.z)); s = max(te, .012); qq = q + rin * s;
    no = na;
  }
  vec3 ro = refract(rin, -no, ior);
  if (dot(ro, ro) < .001) ro = reflect(rin, -no);
  return env(uR * ro, 0.) * exp(-uAbsorb * s);
}
vec3 paneC(float k){
  if (uRack > .5) {
    float mid = (uN + 1.) * .5;
    float dx = (k - mid) * (uHalf.x * 1.28);
    return uOff + vec3(dx, -uHalf.y * .12, .8 + .3 * abs(k - mid) + .06 * k);
  }
  return uOff + vec3(.16 * k * uHalf.x * .35 + .1 * k, .035 * k + (k > uKeep ? uBrk * uBrk * -4. : 0.), .22 * k);
}
vec3 paneTint(float pid){
  if (pid < .5) return uColT;
  if (pid < 1.5) return uRackCol[1];
  if (pid < 2.5) return uRackCol[2];
  if (pid < 3.5) return uRackCol[3];
  if (pid < 4.5) return uRackCol[4];
  if (pid < 5.5) return uRackCol[5];
  return uRackCol[6];
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = vec3(0., 0., -6.), rd = normalize(vec3(uv, 1.9));
  vec3 bg = env(rd, 0.);
  vec3 rdo = rd * uR;
  vec3 roo = (ro - uOff) * uR;
  float t = 3.2; bool hit = false; float pid = 0.;
  if (uHide < .5) for (int i = 0; i < 160; i++) {
    vec3 pw = ro + rd * t;
    float d = sdBox((pw - uOff) * uR); float best = 0.;
    for (int k = 1; k < 7; k++) { if (float(k) <= uN && (float(k) <= uKeep || uBrk < .999)) { vec3 c = paneC(float(k)); float dk = sdBox((pw - c) * uR); if (dk < d) { d = dk; best = float(k); } } }
    if (d < .0012) { hit = true; pid = best; break; } t += d; if (t > 14.) break; }
  if (pid > .5) { vec3 c = paneC(pid); roo = (ro - c) * uR; }
  vec3 col = bg;
  if (hit) {
    vec3 p = roo + rdo * t, n = nrm(p);
    float ez0 = 1. - smoothstep(.5, .95, abs(n.z));
    float ang0 = atan(p.y / uHalf.y, p.x / uHalf.x) / 6.2832 + .5;
    float sanded_g = uSand > .001 ? (1. - smoothstep(uSand - .02, uSand, ang0)) * ez0 : 0.;
    vec3 pt = paneTint(pid);
    float cosi = clamp(dot(-rdo, n), 0., 1.);
    float f0 = pow((uIor - 1.) / (uIor + 1.), 2.);
    float F = clamp((f0 + (1. - f0) * pow(1. - cosi, 5.)) * uRefl, 0., 1.);
    float grz = smoothstep(.45, .08, cosi);
    vec3 rd_refl = uR * reflect(rdo, n);
    vec3 refl = mix(env(rd_refl, 0.), env(rd_refl, 1.), max(sanded_g * .9, grz * .55)) * uReflTint;
    if (uRack > .5) refl *= mix(vec3(1.), pt, .4);
    float dsp = uDisp * (1. - ez0);
    vec3 tr = vec3(refr(p, n, rdo, uIor - dsp).r, refr(p, n, rdo, uIor).g, refr(p, n, rdo, uIor + dsp).b);
    tr *= uRack > .5 ? pt * mix(vec3(1.), pt, .55) : uColT;
    if (uRack > .5 && uRackSel > -.5 && pid > .5 && abs(pid - uRackSel) > .25) tr *= .78;
    tr = mix(tr, vec3(.55, .6, .65) * (.35 + .5 * dot(tr, vec3(.33))), uHaze);
    float ez = 1. - smoothstep(.5, .95, abs(n.z));
    float ang = atan(p.y / uHalf.y, p.x / uHalf.x) / 6.2832 + .5;
    float sanded = uSand > .001 ? (1. - smoothstep(uSand - .02, uSand, ang)) * ez : 0.;
    float head = (uSand > .001 && uSand < .999) ? exp(-pow((ang - uSand) * 38., 2.)) * ez : 0.;
    float gr = smoothstep(.78, .98, hash(floor(p * 340.)));
    float gr2 = smoothstep(.85, .99, hash(floor(p * 760. + 7.)));
    float tl = dot(env(uR * n, 1.), vec3(.33));
    vec3 frost = vec3(.6, .66, .69) * (.22 + .5 * tl * .55);
    tr = mix(tr, frost, .62 * sanded);
    F *= (1. - .45 * sanded);
    F = mix(F, .92, uMir); tr *= (1. - .85 * uMir); refl *= (1. + .6 * uMir);
    vec4 sv = texture2D(uSurf, vec2(p.x / uHalf.x * .5 + .5, .5 - p.y / uHalf.y * .5));
    float sa = sv.a * (1. - ez0) * (1. - step(.5, pid));
    tr = mix(tr, sv.rgb * (.45 + .5 * dot(tr, vec3(.33))), sa * .92);
    F *= (1. - .75 * sa);
    col = tr * (1. - F) + refl * F;
    col += sv.rgb * sa * .12;
    col += vec3(1., .95, .85) * uColT * min(uGlare, 1.) * exp(-pow(length(uv - vec2(0., .02)) * 2.6, 2.)) * .55 * max(uMir, step(1.5, uGlare));
    col += vec3(.5, .56, .6) * (gr * .07 + gr2 * .05) * sanded * (.25 + .75 * clamp(dot(tr, vec3(.33)) * 2., 0., 1.));
    float hv = uHeat * (.55 + .45 * smoothstep(-.5, .5, p.y / uHalf.y + sin(p.x * 3. + uHeat * 4.) * .15));
    col = mix(col, col * vec3(1.0, .55, .3) + vec3(1.7, .45, .06) * hv, clamp(uHeat * .9, 0., 1.));
    col += vec3(2.2, 1.1, .35) * head * (.6 + .4 * hash(floor(p * 90. + uSand * 40.)));
  }
  col = col / (1. + col);
  col = pow(col, vec3(.4545));
  gl_FragColor = vec4(col, 1.);
}`;

export const COLOR_TINT: Record<string, [number, number, number]> = { clear: [1, 1, 1], 'ultra-clear': [1.02, 1.03, 1.03], bronze: [1, .68, .42], gray: [.55, .58, .62], 'blue-green': [.55, .85, .8], 'arctic-blue': [.62, .8, 1], 'cianite-clear': [1, 1, 1], 'cianite-bronze': [1, .68, .42], rain: [.95, 1, 1], 'barb-wire': [.95, .98, 1], 'acid-etch': [1, 1, 1], 'low-e': [.85, 1, .95], 'white-lac': [1.1, 1.1, 1.1], 'black-lac': [.12, .12, .14], 'optic-white': [1.15, 1.15, 1.15], 'mirror-clear': [.93, .95, .97], 'mirror-clear-back': [.9, .92, .95], 'mirror-bronze': [1, .78, .55], 'mirror-antique': [.95, .85, .7] };

const TYPES: Record<GlassKind, { ior: number; absorb: [number, number, number]; refl: number; tint: [number, number, number]; haze: number }> = {
    clear: { ior: 1.52, absorb: [0.9, 0.18, 0.55], refl: 1, tint: [1, 1, 1], haze: 0 },
    temp: { ior: 1.52, absorb: [1.0, 0.2, 0.6], refl: 1, tint: [1, 1, 1], haze: 0 },
    lam: { ior: 1.52, absorb: [0.7, 0.5, 0.6], refl: 1, tint: [1, 1, 1], haze: 0.16 },
    lowe: { ior: 1.52, absorb: [0.6, 0.3, 0.5], refl: 3.2, tint: [0.7, 1.0, 0.95], haze: 0 },
};

export type FxApi = { surf: React.MutableRefObject<HTMLCanvasElement | null>; proj: React.MutableRefObject<(x: number, y: number, z: number) => [number, number]>; projU: React.MutableRefObject<(x: number, y: number, z: number) => [number, number]>; geo: React.MutableRefObject<{ hx: number; hy: number; hz: number }>; cut?: React.MutableRefObject<number | null>; pm?: React.MutableRefObject<number> };
export type GlassSpec = { w: number; h: number; t: number; edge: EdgeKind; filo: boolean; sand: number; kind: GlassKind; temper: number; ultra?: boolean; focus?: boolean; front?: boolean; phone?: boolean; color?: string; labelW?: string; labelH?: string; labelT?: string; breakKey?: number; light?: boolean; stack?: number; stackKeep?: number; stackBrk?: boolean; rack?: [number, number, number][]; rackSel?: number; cam?: { yaw: number; pitch: number } | null };

export function GlassViewer({ spec, reduced, fxApi, labels }: { spec: GlassSpec; reduced: boolean; fxApi?: FxApi; labels: { drag: string; front: string; angle: string; edge: string; noGl: string; note: string; dims: string; brk: string; restore: string; brokeNote: string; furnace: string; quench: string; tempNote: string} }) {
    const ref = useRef<HTMLCanvasElement>(null);
    const specRef = useRef(spec);
    const view = useRef({ yaw: 0.5, pitch: 0.18, ty: 0.5, tp: 0.18, drag: false, lx: 0, ly: 0, last: 0 });
    const [ok, setOk] = useState(true);
    const lastFocus = useRef(0);
    const pmv = useRef(0);
    const pmT = useRef(0);
    const glr = useRef(0);
    const svgRef = useRef<SVGSVGElement>(null);
        const [broken, setBroken] = useState(false);
    const brokenRef = useRef(false);
    const shards = useRef<any>(null);
    const fx = useRef<HTMLCanvasElement>(null);
    const furn = useRef<HTMLDivElement>(null);
    const qj = useRef<HTMLDivElement>(null);
    const breakFn = useRef<(x: number, y: number) => void>(() => {});
    const downAt = useRef({ x: 0, y: 0 });
    specRef.current = spec;

    useEffect(() => {
        const canvas = ref.current!;
        const gl = (canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }) || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (!gl) { setOk(false); return; }
        const mk = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
        let prog: WebGLProgram;
        try {
            prog = gl.createProgram()!;
            gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
            gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG));
            gl.linkProgram(prog);
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
        } catch { setOk(false); return; }
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = (n: string) => gl.getUniformLocation(prog, n);
        const u = { res: U('uRes'), R: U('uR'), half: U('uHalf'), rad: U('uRad'), ior: U('uIor'), disp: U('uDisp'), abs: U('uAbsorb'), refl: U('uRefl'), tint: U('uReflTint'), haze: U('uHaze'), back: U('uBack'), bevel: U('uBevel'), sand: U('uSand'), hide: U('uHide'), cor: U('uCor'), colT: U('uColT'), mir: U('uMir'), glare: U('uGlare'), heat: U('uHeat'), off: U('uOff'), surf: U('uSurf'), n: U('uN'), brk: U('uBrk'), keep: U('uKeep'), lamp: U('uLamp'), rack: U('uRack'), rackCol: U('uRackCol[0]'), rackSel: U('uRackSel') };
        const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0])); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.uniform1i(u.surf, 0);
        let lampV = 0, stk = 0;
        let raf = 0, alive = true;
        const frame = (now: number, hide: boolean) => {
            const v = view.current;
            const s0 = specRef.current; const tpv = s0.temper;
            if (tpv > 0 && tpv < 1) { v.ty = 0; v.tp = 0.02; }
            else if (s0.cam) { v.ty = s0.cam.yaw; v.tp = s0.cam.pitch; lastFocus.current = 9; }
            else { const m = s0.focus ? 1 : s0.front ? 2 : 0; if (m !== lastFocus.current) { lastFocus.current = m; if (m === 1) { v.ty = 1.45; v.tp = 0.04; } else if (m === 2) { v.ty = 0; v.tp = 0; } else { v.ty = 0.5; v.tp = 0.18; } } }
            if (!v.drag) {
                if (!reduced) { const k = Math.sin(now / 2200) * 0.12; v.yaw += (v.ty + k - v.yaw) * 0.06; v.pitch += (v.tp - v.pitch) * 0.06; }
                else { v.yaw += (v.ty - v.yaw) * 0.2; v.pitch += (v.tp - v.pitch) * 0.2; }
            }
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const cw = Math.max(2, Math.floor(canvas.clientWidth * dpr)), ch = Math.max(2, Math.floor(canvas.clientHeight * dpr));
            if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
            gl.viewport(0, 0, cw, ch);
            const s0b = specRef.current, ty = TYPES[s0b.kind];
            const pt = s0b.phone ? 1 : 0; const dtp = Math.min(Math.max((now - pmT.current) / 1000, 0), 1); pmT.current = now; pmv.current += (pt - pmv.current) * (reduced ? 1 : 1 - Math.exp(-dtp / 0.47)); // time-based: ~2s to settle on any frame rate
            if (Math.abs(pt - pmv.current) < 0.002) pmv.current = pt;
            const pm = pmv.current;
            if (fxApi && fxApi.pm) fxApi.pm.current = pm;
            const s = pm > 0 ? { ...s0b, w: s0b.w + (3 - s0b.w) * pm, h: s0b.h + (6.4 - s0b.h) * pm } : s0b;
            let sc = 2.5 / Math.max(s.h * 1.0, s.w * 1.15, 1);
            if (s.rack && s.rack.length) sc *= 0.5;
            const halfW = 1.58 * cw / ch, ex = Math.max(halfW + 1.0, 2.4);
            let ox = 0, heat = 0, shrink = 1;
            const tp = s.temper;
            if (tp > 0 && tp < 1) {
                const sm = (a: number, b: number, x: number) => { const k = Math.min(Math.max((x - a) / (b - a), 0), 1); return k * k * (3 - 2 * k); };
                if (tp < 0.78) { const q = tp / 0.78; ox = -ex + 2 * ex * q; heat = ox < 0.65 ? sm(-1.9, -0.2, ox) : 1 - sm(0.65, 2.25, ox); shrink = 0.55; }
                else { const q = sm(0, 1, (tp - 0.78) / 0.22); ox = -ex * (1 - q); shrink = 0.55 + 0.45 * q; }
            }
            sc *= shrink;
            if (furn.current) { furn.current.style.width = (1.3 / (2 * halfW) * 100) + '%'; furn.current.style.opacity = tp > 0 && tp < 0.8 ? '1' : '0'; }
            if (qj.current) { qj.current.style.width = (1.6 / (2 * halfW) * 100) + '%'; qj.current.style.left = (50 + 0.65 / (2 * halfW) * 100) + '%'; qj.current.style.opacity = tp > 0.3 && tp < 0.78 ? '1' : '0'; }
            const hz = (0.1 + s.t * 0.4) / 2;
            const hx = (s.w * sc) / 2, hy = (s.h * sc) / 2;
            const base = { flat: 0.004, pencil: hz * 0.55, bull: hz * 0.98, bevel: 0.075 }[s.edge];
            const rad = Math.min(Math.max(base, s.filo ? 0.014 : 0), hz * 0.98);
            const cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
            // R = Ry * Rx, column-major
            const m = [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp];
            gl.uniform2f(u.res, cw, ch);
            gl.uniformMatrix3fv(u.R, false, new Float32Array(m));
            gl.uniform3f(u.half, hx, hy, hz);
            const cc = COLOR_TINT[s.color || 'clear'] || [1, 1, 1]; gl.uniform3f(u.colT, cc[0], cc[1], cc[2]);
            gl.uniform1f(u.mir, isMir(s.color) ? 1 : 0);
            const ay = Math.abs(v.yaw); const gt = reduced ? 0 : (isMir(s.color) ? Math.min(Math.max((ay - 0.35) / 0.5, 0), 1) * (v.drag || ay > 0.4 ? 1 : 0) : 0);
            glr.current += (gt - glr.current) * 0.08; gl.uniform1f(u.glare, glr.current);
            gl.uniform1f(u.rad, rad); gl.uniform1f(u.cor, pm * 0.2);
            gl.uniform1f(u.ior, ty.ior);
            gl.uniform1f(u.disp, 0.0007);
            const ak = s.ultra ? 0.25 : 1; gl.uniform3f(u.abs, ty.absorb[0] * ak, ty.absorb[1] * ak, ty.absorb[2] * ak);
            gl.uniform1f(u.refl, ty.refl);
            gl.uniform3f(u.tint, ty.tint[0], ty.tint[1], ty.tint[2]);
            gl.uniform1f(u.haze, ty.haze);
            gl.uniform1f(u.back, 0);
            gl.uniform1f(u.bevel, s.edge === 'bevel' ? 1 : 0);
            gl.uniform1f(u.sand, s.filo ? s.sand : 0);
            if (svgRef.current) {
                const sv = svgRef.current, cssK = canvas.clientHeight / ch;
                const near = !!s.front && !(tp > 0 && tp < 1) && !brokenRef.current && pm < 0.01;
                sv.style.opacity = near ? '1' : '0';
                const P = (x: number, y: number, z: number): [number, number] => {
                    const wx = cy * x + sy * sp * y + sy * cp * z + ox, wy = cp * y - sp * z, wz = -sy * x + cy * sp * y + cy * cp * z;
                    const k = 1.9 / (wz + 6);
                    return [(cw / 2 + wx * k * ch) * cssK, (ch / 2 - wy * k * ch) * cssK];
                };
                const setD = (n: string, a: [number, number], b: [number, number], txt: string) => {
                    const gEl = sv.querySelector(`[data-d="${n}"]`); if (!gEl) return;
                    const ls = gEl.querySelectorAll('line'), tx = gEl.querySelector('text') as SVGTextElement;
                    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * 6, ny = dx / L * 6;
                    ls[0].setAttribute('x1', String(a[0])); ls[0].setAttribute('y1', String(a[1])); ls[0].setAttribute('x2', String(b[0])); ls[0].setAttribute('y2', String(b[1]));
                    ls[1].setAttribute('x1', String(a[0] - nx)); ls[1].setAttribute('y1', String(a[1] - ny)); ls[1].setAttribute('x2', String(a[0] + nx)); ls[1].setAttribute('y2', String(a[1] + ny));
                    ls[2].setAttribute('x1', String(b[0] - nx)); ls[2].setAttribute('y1', String(b[1] - ny)); ls[2].setAttribute('x2', String(b[0] + nx)); ls[2].setAttribute('y2', String(b[1] + ny));
                    let ang = Math.atan2(dy, dx) * 180 / Math.PI; if (ang > 90 || ang < -90) ang += 180;
                    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
                    tx.textContent = txt; tx.setAttribute('transform', `translate(${mx} ${my}) rotate(${ang}) translate(0 -7)`);
                };
                const dd = 0.13, zf = -hz;
                setD('w', P(-hx, -hy - dd, zf), P(hx, -hy - dd, zf), s.labelW || '');
                setD('h', P(hx + dd, -hy, zf), P(hx + dd, hy, zf), s.labelH || '');
                setD('t', P(hx + dd * 0.6, -hy - dd * 0.2, -hz), P(hx + dd * 0.6, -hy - dd * 0.2, hz), s.labelT || '');
            }
            const rk = specRef.current.rack && specRef.current.rack.length ? specRef.current.rack : null;
            gl.uniform1f(u.rack, rk ? 1 : 0);
            if (rk) {
                const flat = new Float32Array(21); flat.set([1, 1, 1]);
                rk.slice(0, 6).forEach((c, i) => flat.set(c, 3 * (i + 1)));
                gl.uniform3fv(u.rackCol, flat);
                gl.uniform1f(u.rackSel, (specRef.current.rackSel ?? -1) < 0 ? -1 : (specRef.current.rackSel as number) + 1);
            }
            gl.uniform1f(u.n, rk ? Math.min(rk.length, 6) : Math.min(specRef.current.stack || 0, 5));
            gl.uniform1f(u.keep, rk ? Math.min(rk.length, 6) : Math.min(specRef.current.stackKeep ?? specRef.current.stack ?? 0, 5));
            stk += ((specRef.current.stackBrk && !rk ? 1 : 0) - stk) * 0.035; if ((!specRef.current.stackBrk || rk) && stk < 0.02) stk = 0;
            gl.uniform1f(u.brk, rk ? 0 : (reduced ? (specRef.current.stackBrk ? 1 : 0) : stk));
            lampV += ((specRef.current.light ? 1 : 0) - lampV) * 0.08; gl.uniform1f(u.lamp, lampV);
            const sf = fxApi?.surf.current; if (sf && sf.width > 1) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sf); }
            if (fxApi) { fxApi.geo.current = { hx, hy, hz }; fxApi.proj.current = (x: number, y: number, z: number): [number, number] => { const wx = cy * x + sy * sp * y + sy * cp * z + ox, wy = cp * y - sp * z, wz = -sy * x + cy * sp * y + cy * cp * z; const k = 1.9 / (wz + 6); return [(cw / 2 + wx * k * ch) * (canvas.clientHeight / ch), (ch / 2 - wy * k * ch) * (canvas.clientHeight / ch)]; }; fxApi.projU.current = (x: number, y: number, z: number): [number, number] => { const k = 1.9 / (z + 6); return [(cw / 2 + x * k * ch) * (canvas.clientHeight / ch), (ch / 2 - y * k * ch) * (canvas.clientHeight / ch)]; }; }
            gl.uniform1f(u.hide, hide ? 1 : 0);
            gl.uniform1f(u.heat, heat);
            gl.uniform3f(u.off, ox, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        };
        const draw = (now: number) => {
            if (!alive) return;
            frame(now, brokenRef.current);
            fxStep(now);
            raf = requestAnimationFrame(draw);
        };
        const fxStep = (now: number) => {
            const fc = fx.current; if (!fc) return;
            if (fc.width !== canvas.width || fc.height !== canvas.height) { fc.width = canvas.width; fc.height = canvas.height; }
            const c = fc.getContext('2d')!; c.clearRect(0, 0, fc.width, fc.height);
            const st = shards.current; if (!st) return;
            const dt = Math.min((now - st.last) / 1000, 0.04); st.last = now; st.t += dt;
            const floor = fc.height * 0.92;
            for (const p of st.list) {
                if (st.t > p.delay) {
                    p.vy += 2600 * dt * (fc.height / 480) * (st.reduced ? 0 : 1); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
                    const bot = p.y + p.cy + p.h;
                    if (bot > floor) { p.y -= bot - floor; p.vy *= -0.25; p.vx *= 0.7; p.vr *= 0.6; }
                }
                c.save(); c.translate(p.cx + p.x, p.cy + p.y); c.rotate(p.r); c.translate(-p.cx, -p.cy);
                c.beginPath(); c.moveTo(p.a[0], p.a[1]); c.lineTo(p.b[0], p.b[1]); c.lineTo(p.c[0], p.c[1]); c.closePath();
                c.save(); c.clip(); c.drawImage(st.img, 0, 0); c.restore();
                c.strokeStyle = 'rgba(255,255,255,.38)'; c.lineWidth = Math.max(1, fc.height / 480); c.stroke();
                c.restore();
            }
        };
        const doBreak = (px: number, py: number) => {
            if (brokenRef.current) return;
            const now = performance.now();
            frame(now, false);
            const A = document.createElement('canvas'); A.width = canvas.width; A.height = canvas.height;
            const ca = A.getContext('2d', { willReadFrequently: true })!; ca.drawImage(canvas, 0, 0);
            frame(now, true);
            const B = document.createElement('canvas'); B.width = canvas.width; B.height = canvas.height;
            const cb = B.getContext('2d', { willReadFrequently: true })!; cb.drawImage(canvas, 0, 0);
            const W = A.width, H = A.height;
            const da = ca.getImageData(0, 0, W, H).data, db = cb.getImageData(0, 0, W, H).data;
            const isGlass = (x: number, y: number) => { x = Math.min(W - 1, Math.max(0, Math.round(x))); y = Math.min(H - 1, Math.max(0, Math.round(y))); const i = (y * W + x) * 4; return Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24; };
            const temp = specRef.current.kind === 'temp';
            const cell = (temp ? 20 : 64) * (H / 480);
            const cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
            const pts: [number, number][][] = [];
            for (let j = 0; j < rows; j++) { pts.push([]); for (let i = 0; i < cols; i++) pts[j].push([i * cell + (i > 0 && i < cols - 1 ? (Math.random() - 0.5) * cell * 0.8 : 0), j * cell + (j > 0 && j < rows - 1 ? (Math.random() - 0.5) * cell * 0.8 : 0)]); }
            const list: any[] = [];
            const mk = (a: [number, number], b: [number, number], c: [number, number]) => {
                const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
                if (!isGlass(cx, cy)) return;
                const dx = cx - px, dy = cy - py, d = Math.hypot(dx, dy) + 1;
                const k = (H / 480) * (temp ? 260 : 160);
                list.push({ a, b, c, cx, cy, x: 0, y: 0, r: 0, h: Math.max(a[1], b[1], c[1]) - cy,
                    vx: (dx / d) * k * (0.6 + Math.random()) + (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 300 + (dy / d) * 60, vr: (Math.random() - 0.5) * 6,
                    delay: d / (W * 1.1) * (temp ? 0.35 : 0.5) + 0.05 });
            };
            for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { const p00 = pts[j][i], p10 = pts[j][i + 1], p01 = pts[j + 1][i], p11 = pts[j + 1][i + 1]; mk(p00, p10, p01); mk(p10, p11, p01); }
            shards.current = { list, img: A, t: 0, last: now, reduced };
            brokenRef.current = true; setBroken(true);
        };
        breakFn.current = doBreak;
        raf = requestAnimationFrame(draw);
        return () => { alive = false; cancelAnimationFrame(raf); };
    }, [reduced]);

    const down = (e: React.PointerEvent) => { downAt.current = { x: e.clientX, y: e.clientY }; const v = view.current; v.drag = true; v.lx = e.clientX; v.ly = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
    const move = (e: React.PointerEvent) => { const v = view.current; if (!v.drag) return; v.yaw += (e.clientX - v.lx) * 0.01; v.pitch = Math.max(-1.2, Math.min(1.2, v.pitch + (e.clientY - v.ly) * 0.01)); v.ty = v.yaw; v.tp = v.pitch; v.lx = e.clientX; v.ly = e.clientY; };
    const up = (e: React.PointerEvent) => {
        view.current.drag = false;
        if (e.type === 'pointerup' && Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y) < 4) hitAt(e.clientX, e.clientY);
    };
    const hits = useRef(0);
    const hitAt = (cx: number, cy: number) => {
        const c = ref.current; if (!c) return;
        hits.current += 1;
        if (hits.current >= 3) { hits.current = 0; const r = c.getBoundingClientRect(); breakFn.current((cx - r.left) / r.width * c.width, (cy - r.top) / r.height * c.height); }
    };
    const breakBtn = () => { const c = ref.current; if (!c) return; breakFn.current(c.width / 2, c.height / 2); };
    const bk = useRef(spec.breakKey || 0);
    useEffect(() => { if ((spec.breakKey || 0) !== bk.current) { bk.current = spec.breakKey || 0; if (!brokenRef.current) breakBtn(); } }, [spec.breakKey]);
    const restore = () => { shards.current = null; brokenRef.current = false; setBroken(false); hits.current = 0; };
    const preset = (y: number, p: number) => { const v = view.current; v.ty = y; v.tp = p; };

    return <div className="gv">
        {ok ? <><canvas ref={ref} className="gv-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={labels.dims} /><canvas ref={fx} className="gv-fx" aria-hidden="true" />
            <svg ref={svgRef} className="gv-dimsvg" aria-hidden="true">{['w', 'h', 't'].map((n) => <g key={n} data-d={n} className={'dg dg-' + n}><line /><line /><line /><text textAnchor="middle" /></g>)}</svg>
            <div ref={furn} className="gv-furnace" aria-hidden="true"><b>{labels.furnace}</b></div>
            <div ref={qj} className="gv-quench" aria-hidden="true"><b>{labels.quench}</b></div></>
            : <div className="gv-fallback"><div className="gv-fb-pane" style={{ aspectRatio: `${spec.w} / ${spec.h}` }} /><p>{labels.noGl}</p></div>}
        <div className="gv-hud"><span>{labels.dims}</span></div>
        <div className={`gv-presets${spec.phone ? " gv-ph" : ""}`}>
            <button type="button" onClick={() => preset(0, 0)}>{labels.front}</button>
            <button type="button" onClick={() => preset(0.55, 0.2)}>{labels.angle}</button>
            <button type="button" onClick={() => preset(1.35, 0.05)}>{labels.edge}</button>
            {broken ? <button type="button" className="gv-restore" onClick={restore}>{labels.restore}</button> : <button type="button" className="gv-break" onClick={breakBtn}>{labels.brk}</button>}
        </div>
        {broken && <div className="gv-broke" role="status">{labels.brokeNote}</div>}
        {spec.temper > 0 && spec.temper < 1 && <div className="gv-broke gv-temp" role="status">{labels.tempNote}</div>}
        <p className="gv-hint">{labels.drag} · {labels.note}</p>
    </div>;
              }
