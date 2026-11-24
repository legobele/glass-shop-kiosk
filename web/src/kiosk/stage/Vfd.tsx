import { useEffect, useState } from 'react';

// 7 segments: a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle
const SEG: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
const R: Record<string, [number, number, number, number]> = { a: [4, 2, 12, 3], b: [15, 5, 3, 10], c: [15, 19, 3, 10], d: [4, 29, 12, 3], e: [2, 19, 3, 10], f: [2, 5, 3, 10], g: [4, 15.5, 12, 3] };

export function Digit({ ch, on, w = 20 }: { ch: string; on: boolean; w?: number }) {
    const lit = SEG[ch] || '';
    return <svg viewBox="0 0 20 34" width={w} height={w * 1.7} aria-hidden="true">{Object.keys(R).map((k) => { const [x, y, ww, hh] = R[k]; const isOn = on && lit.includes(k); return <rect key={k} x={x} y={y} width={ww} height={hh} rx="1.4" className={isOn ? 'vfd-on' : 'vfd-off'} />; })}</svg>;
}

export type VfdMsg = { es: string; en: string };

// No prices exist yet, so every readout shows dashes. "active" lights the segments, otherwise they sit dark red.
export function Vfd({ big, lang, auto, values }: { big?: boolean; lang: 'en' | 'es'; auto?: boolean; values?: [string, string, string] | null }) {
    const tabs = ['Subtotal', 'Total', 'Tax'];
    const [tab, setTab] = useState(0);
    const [cur, setCur] = useState(0);
    useEffect(() => { if (!auto || !values) return; const i = window.setInterval(() => setTab((t) => (t + 1) % 3), 2200); return () => window.clearInterval(i); }, [auto]);
    const w = big ? 30 : 13;
    const n = big ? 8 : 6;
    return <div className={'vfd' + (big ? ' vfd-big' : '')} role="group" aria-label={values ? (lang === 'es' ? 'Precio' : 'Price') : (lang === 'es' ? 'Precio: sin precio todavia' : 'Price: no price yet')} onClick={() => setTab((t) => (t + 1) % 3)}>
        <div className="vfd-tabs">{tabs.map((x, i) => <span key={x} className={i === tab ? 'on' : ''}>{x}</span>)}</div>
        <div className="vfd-row">
            <div className="vfd-cur">{['$', '\u20ac', '\u00a5'].map((c, i) => <button type="button" key={c} className={i === cur ? 'on' : ''} onClick={(e) => { e.stopPropagation(); setCur(i); }} aria-label={'Currency ' + c}>{c}</button>)}</div>
            <div className="vfd-digits">{(() => { const s = values ? values[tab].padStart(n, ' ').slice(-n) : '-'.repeat(n); return Array.from({ length: n }, (_, i) => <Digit key={i} ch={s[i] === '.' ? ' ' : s[i]} on={true} w={w} />); })()}</div>
            {big && <div className="vfd-tax"><small>IVU / Tax</small><div>{[0, 1].map((i) => <Digit key={i} ch={values ? (values[2].replace('.', '').slice(0, -2) || '0').padStart(2, '0').slice(-2)[i] : '-'} on={true} w={14} />)}</div></div>}
        </div>
        {big && <div className="vfd-msg">{lang === 'es' ? 'Favor de ir al counter para completar orden' : 'Please go to counter to finish order'}</div>}
    </div>;
}
