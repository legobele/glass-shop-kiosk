import { computeVfd, usePricing } from '../lib/pricing';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import type {
  Additions,
  ContactInfo,
  GlassTypeKey,
  Lang,
  Order,
  PaymentMethod,
} from '../lib/types';
import { emptyAdditions, generateOrderId } from '../lib/types';
import {
  TYPE_I18N_KEY,
  colorsForThickness,
  isFullLite,
  resolveGlassType,
  thicknessesForType,
} from '../lib/catalog';
import { toFracStr } from '../lib/frac';
import { makeT } from '../lib/i18n';
import { addOrder } from '../lib/store';
import { colorName } from '../lib/format';
import { Swatch } from '../components/Swatch';
import { NumpadModal } from '../components/NumpadModal';
import GlassStage, { type StageTrigger } from './stage/GlassStage';

type SlideId =
  | 'lang' | 'customer' | 'device' | 'type' | 'size' | 'qty' | 'thick'
  | 'color' | 'add' | 'pay' | 'review' | 'success';

const DOT_INDEX: Record<SlideId, number | null> = {
  lang: null, customer: 0, device: null, type: 1, thick: 2, color: 3,
  size: 4, qty: 5, add: 6, pay: 7, review: 8, success: 9,
};

function fracShort(v: number): string {
  return toFracStr(v).replace(/^0 /, '');
}

function parseInches(s: string): number | null {
  const str = s.trim().replace(/["″]/g, '').trim();
  if (!str) return null;
  let m = str.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]);
  m = str.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m && +m[3]) return +m[1] + +m[2] / +m[3];
  m = str.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m && +m[2]) return +m[1] / +m[2];
  return null;
}

// exact typed entry for an inch value; shows live updates from on-glass handles while not focused
function InchInput({ value, onCommit, ariaLabel }: { value: number; onCommit: (v: number) => void; ariaLabel?: string }) {
  const [txt, setTxt] = useState(() => fracShort(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setTxt(fracShort(value)); }, [value, editing]);
  const commit = () => {
    setEditing(false);
    const v = parseInches(txt);
    if (v != null) onCommit(v); else setTxt(fracShort(value));
  };
  return (
    <input className="field mono inch-input" value={txt} aria-label={ariaLabel} inputMode="decimal"
      onFocus={() => setEditing(true)}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setTxt(fracShort(value)); setEditing(false); (e.target as HTMLInputElement).blur(); }
      }} />
  );
}

function portalUrl(orderId: string): string {
  return `${window.location.origin}${window.location.pathname}#/portal?order=${orderId}`;
}

export default function Kiosk() {
  const [searchParams] = useSearchParams();
  const inShop =
    searchParams.get('IsKioskInShop') === 'true' ||
    new URLSearchParams(window.location.search).get('IsKioskInShop') === 'true';
  const prefillName = searchParams.get('customerName') || '';
  const prefillProject = searchParams.get('projectName') || '';

  const [lang, setLang] = useState<Lang>('en');
  const t = makeT(lang);

  const [slide, setSlide] = useState<SlideId>('lang');
  const [history, setHistory] = useState<SlideId[]>([]);

  // order draft
  const [name, setName] = useState('');
  const [project, setProject] = useState('');
  const [contact, setContact] = useState<ContactInfo>({
    tab: 'none', phone: '', email: '', type: 'personal', extension: '',
  });
  const [base, setBase] = useState<'float' | 'laminated' | null>(null);
  const [temp, setTemp] = useState(false);
  const [uc, setUc] = useState(false);
  const glassType: GlassTypeKey | null = resolveGlassType(base, temp, uc);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [thickness, setThickness] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const newOrderAdditions = (): Additions => ({ ...emptyAdditions(), filomatado: { active: true } });
  const [additions, setAdditions] = useState<Additions>(newOrderAdditions());
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [pastaUnlocked, setPastaUnlocked] = useState(false);
  const [pasta, setPasta] = useState(false);
  const [bevelEdge, setBevelEdge] = useState<'e1' | 'e2' | 'e3' | 'e4' | null>(null);
  const [clearance, setClearance] = useState<Partial<Record<'e1' | 'e2' | 'e3' | 'e4', number>>>({});
  const [desnivel, setDesnivel] = useState<Partial<Record<'c1' | 'c2' | 'c3' | 'c4', { offset: number; dir: 'h' | 'v' }>>>({});
  const [measSel, setMeasSel] = useState<{ kind: 'edge' | 'corner'; id: string } | null>(null);
  const [roundSel, setRoundSel] = useState<string | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [trig, setTrig] = useState<StageTrigger>(null);
  const [stageKey, setStageKey] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fire = (name: NonNullable<StageTrigger>['name']) => setTrig({ name, n: Date.now() });

  // pasta easter egg: typing "pasta" anywhere (including inside a text field) unlocks it
  const pastaBuf = useRef('');
  useEffect(() => {
    const feed = (ch: string) => {
      pastaBuf.current = (pastaBuf.current + ch).slice(-5);
      if (pastaBuf.current === 'pasta') { pastaBuf.current = ''; setPastaUnlocked(true); setPasta(true); fire('pasta'); }
    };
    // physical keyboards: keydown carries the letter
    let lastKey: { ch: string; t: number } | null = null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) { if (e.key.length === 1) pastaBuf.current = ''; return; }
      lastKey = { ch: e.key.toLowerCase(), t: performance.now() };
      feed(e.key.toLowerCase());
    };
    // software keyboards (iPad) often send key:'Unidentified' or no keydown at all;
    // the letter arrives on the input event instead, so feed from there too.
    const onInput = (e: Event) => {
      const data = (e as InputEvent).data;
      if (!data) return;
      for (const raw of data) {
        if (!/[a-z]/i.test(raw)) { pastaBuf.current = ''; continue; }
        const ch = raw.toLowerCase();
        // skip when the matching keydown already counted this keystroke
        if (lastKey && lastKey.ch === ch && performance.now() - lastKey.t < 200) { lastKey = null; continue; }
        feed(ch);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('input', onInput, true);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('input', onInput, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // numpad + qr handoff + save tabs
  const [npField, setNpField] = useState<'width' | 'height' | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSecs, setQrSecs] = useState(30);
  const [copied, setCopied] = useState('');
  const [saveTab, setSaveTab] = useState<'link' | 'qr' | 'bk'>('link');
  const successQrRef = useRef<HTMLDivElement>(null);

  const fullLite = useMemo(
    () =>
      glassType && width && height
        ? isFullLite(glassType, width, height, color, thickness)
        : false,
    [glassType, width, height, color, thickness],
  );

  /* ---------------- navigation ---------------- */
  function goTo(id: SlideId) {
    setHistory((h) => [...h, slide]);
    setSlide(id);
  }
  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      setSlide(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }
  function nextAfter(id: SlideId): SlideId {
    switch (id) {
      case 'lang': return 'customer';
      case 'customer': return inShop ? 'device' : 'type';
      case 'device': return 'type';
      case 'type': return 'thick';
      case 'thick': return 'color';
      case 'color': return 'size';
      case 'size': return 'qty';
      case 'qty': return 'add';
      case 'add': return 'pay';
      case 'pay': return 'review';
      default: return id;
    }
  }
  function goNext() {
    goTo(nextAfter(slide));
  }
  function resetAll() {
    setName(''); setProject('');
    setContact({ tab: 'none', phone: '', email: '', type: 'personal', extension: '' });
    setBase(null); setTemp(false); setUc(false);
    setWidth(null); setHeight(null);
    setClearance({}); setDesnivel({}); setMeasSel(null);
    setQty(null);
    setThickness(null); setColor(null);
    setAdditions(newOrderAdditions());
    setPayment(null); setPlacedId(null); setPlacing(false);
    setHistory([]); setSlide('lang'); setStageKey((x) => x + 1);
  }

  /* ---------------- device QR countdown ---------------- */
  useEffect(() => {
    if (!qrOpen) return;
    setQrSecs(30);
    const iv = setInterval(() => {
      setQrSecs((s) => {
        if (s <= 1) {
          clearInterval(iv);
          setQrOpen(false);
          resetAll();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrOpen]);

  /* ---------------- type changes invalidate downstream picks ---------------- */
  function applyType(nb: 'float' | 'laminated' | null, nt: boolean, nu: boolean) {
    setBase(nb); setTemp(nt); setUc(nu);
    if (nt && !temp) fire('temper');
    const gt = resolveGlassType(nb, nt, nu);
    if (!gt) return;
    const ths = thicknessesForType(gt);
    if (thickness && !ths.includes(thickness)) {
      setThickness(null);
      setColor(null);
    } else if (thickness && color) {
      const cols = colorsForThickness(gt, thickness).map(([k]) => k);
      if (!cols.includes(color)) setColor(null);
    }
  }

  const pricing = usePricing();

  function pickThickness(th: string) {
    setThickness(th);
    if (glassType && color) {
      const cols = colorsForThickness(glassType, th).map(([key]) => key);
      if (!cols.includes(color)) setColor(null);
    }
  }

  /* ---------------- submit ---------------- */
  function submit() {
    if (!glassType || !width || !height || !thickness || !color || !payment) return;
    setPlacing(true);
    const order: Order = {
      orderId: generateOrderId(),
      timestamp: new Date().toISOString(),
      customerName: name.trim(),
      projectName: project.trim(),
      contact,
      dimensions: {
        width, height,
        ...(Object.keys(clearance).length > 0 ? { clearance } : {}),
        ...(Object.keys(desnivel).length > 0 ? { desnivel } : {}),
      },
      specifications: {
        glassType, color, thickness, additions, isFullLite: fullLite, lang,
        quantity: qty ?? 1,
      },
      payment: { method: payment },
      status: 'pending',
      changePIN: null,
    };
    window.setTimeout(() => {
      addOrder(order);
      setPlacedId(order.orderId);
      setPlacing(false);
      goTo('success');
    }, 900);
  }

  /* ---------------- helpers ---------------- */
  async function copyText(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      /* clipboard unavailable: the text stays visible to copy by hand */
    }
  }

  function downloadQR() {
    const svg = successQrRef.current?.querySelector('svg');
    if (!svg || !placedId) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', '512');
    clone.setAttribute('height', '512');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0, 512, 512);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `qgi-${placedId}-qr.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  const handoffUrl = `${window.location.origin}${window.location.pathname}#/?customerName=${encodeURIComponent(name)}&projectName=${encodeURIComponent(project)}`;
  const payLabel = (m: PaymentMethod) =>
    m === 'cash' ? t('payCash') : m === 'credit-debit' ? t('payCard') : t('payDigital');

  const canContinue: Record<string, boolean> = {
    customer: name.trim().length > 0,
    type: glassType != null,
    size: width != null && height != null,
    qty: qty != null,
    thick: thickness != null,
    color: color != null,
    add: true,
    pay: payment != null,
  };

  /* ---------------- chrome ---------------- */
  const dotIdx = DOT_INDEX[slide];
  const chrome = slide !== 'lang' && (
    <div className="kchrome">
      <button
        className={`k-back${history.length === 0 || slide === 'success' ? ' off' : ''}`}
        onClick={goBack}
        aria-label={t('back')}
      >
        ←
      </button>
      <span className="k-brand">{t('brand')}</span>
      {dotIdx != null && (
        <span className="dots" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < dotIdx ? 'done' : i === dotIdx ? 'now' : ''} />
          ))}
        </span>
      )}
      <span style={{ flex: dotIdx == null ? 1 : undefined }} />
      <button
        className="lang-badge"
        onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
        aria-label="Language / Idioma"
      >
        {lang.toUpperCase()}
      </button>
    </div>
  );

  const foot = (label?: string) =>
    slide !== 'review' && canContinue[slide] != null ? (
      <div className="slide-foot">
        <button className="btn lg" disabled={!canContinue[slide]} onClick={goNext}>
          {label ?? t('continueBtn')}
        </button>
      </div>
    ) : null;

  /* ---------------- slides ---------------- */
  const setMeasVal = (v: number) => {
    if (!measSel) return;
    if (measSel.kind === 'edge') setClearance({ ...clearance, [measSel.id]: Math.min(1, Math.max(0, v)) });
    else setDesnivel({ ...desnivel, [measSel.id]: { offset: Math.min(2, Math.max(0, v)), dir: desnivel[measSel.id as 'c1']?.dir ?? 'h' } });
  };

  // tap an edge marker: off -> on + select, on + unselected -> select, on + selected -> off
  const onBevEdgeTap = (e: 'e1' | 'e2' | 'e3' | 'e4') => {
    const on = additions.beveling.sides[e];
    if (!on) {
      setAdditions({ ...additions, beveling: { ...additions.beveling, sides: { ...additions.beveling.sides, [e]: true } } });
      setBevelEdge(e); setRoundSel(null);
    } else if (bevelEdge !== e) { setBevelEdge(e); setRoundSel(null); }
    else {
      setAdditions({ ...additions, beveling: { ...additions.beveling, sides: { ...additions.beveling.sides, [e]: false } } });
      setBevelEdge(null);
    }
  };

  const onRoundTap = (id: string) => {
    const on = additions.edgerounding.corners[id as 'c1'];
    if (!on) {
      setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, corners: { ...additions.edgerounding.corners, [id]: true } } });
      setRoundSel(id); setBevelEdge(null);
    } else if (roundSel !== id) { setRoundSel(id); setBevelEdge(null); }
    else {
      setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, corners: { ...additions.edgerounding.corners, [id]: false } } });
      setRoundSel(null);
    }
  };

  // per-corner radius (inches) for the 3D pane: corner rounded when the corner or either adjacent edge is on
  const erCorners3d: [number, number, number, number] | undefined = (() => {
    const er = additions.edgerounding;
    if (!er.active || er.radius <= 0) return undefined;
    return [
      er.corners.c1 || er.edges.e1 || er.edges.e2 ? er.radius : 0,
      er.corners.c2 || er.edges.e2 || er.edges.e3 ? er.radius : 0,
      er.corners.c3 || er.edges.e3 || er.edges.e4 ? er.radius : 0,
      er.corners.c4 || er.edges.e4 || er.edges.e1 ? er.radius : 0,
    ];
  })();

  const showStage = ['device', 'type', 'size', 'qty', 'thick', 'color', 'add', 'pay', 'review', 'success'].includes(slide);
  return (
    <div className={`kiosk-shell${showStage ? ' staged' : ''}${slide === 'thick' ? ' thick-full' : ''}`}>
      {showStage && (
        <GlassStage
          lang={lang} slide={slide} glassType={glassType} color={color} thickness={thickness}
          width={width} height={height}
          bevel={additions.beveling.active} rounding={additions.edgerounding.active}
          phone={slide === 'device' && qrOpen} trigger={trig} resetKey={stageKey} reduced={!!reduced}
          filoOn={!!additions.filomatado?.active}
          thicknessOptions={glassType ? thicknessesForType(glassType) : undefined}
          onThickness={pickThickness}
          vfdValues={computeVfd(pricing, glassType, width, height, qty ?? 1)}
          qty={qty}
          edgePick={slide === 'add' && additions.beveling.active}
          edgeSel={bevelEdge}
          onEdgePick={onBevEdgeTap}
          bevSides={additions.beveling.sides}
          bevWidth={bevelEdge ? (additions.beveling.perEdge?.[bevelEdge]?.width ?? 0.5) : 0}
          bevWidthTxt={fracShort(bevelEdge ? (additions.beveling.perEdge?.[bevelEdge]?.width ?? 0.5) : 0)}
          onBevWidth={(w) => {
            if (!bevelEdge) return;
            const cur = additions.beveling.perEdge?.[bevelEdge];
            setAdditions({ ...additions, beveling: { ...additions.beveling, perEdge: { ...additions.beveling.perEdge, [bevelEdge]: { angle: cur?.angle ?? additions.beveling.angle, width: w } } } });
          }}
          roundCorners={slide === 'add' && additions.edgerounding.active ? additions.edgerounding.corners : undefined}
          roundSel={roundSel}
          onRoundPick={onRoundTap}
          roundRadius={additions.edgerounding.radius}
          roundRadiusTxt={fracShort(additions.edgerounding.radius)}
          onRoundRadius={(r) => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, radius: r } })}
          erCorners3d={erCorners3d}
          temperOn={temp}
          frostOn={additions.sandblasting.active}
          measPick={slide === 'size' && width != null && height != null}
          measSel={measSel}
          onMeasPick={(s) => setMeasSel(s)}
          measVal={measSel ? (measSel.kind === 'edge' ? (clearance[measSel.id as 'e1'] ?? 0) : (desnivel[measSel.id as 'c1']?.offset ?? 0)) : 0}
          measDir={measSel?.kind === 'corner' ? (desnivel[measSel.id as 'c1']?.dir ?? 'h') : 'h'}
          measValTxt={fracShort(measSel ? (measSel.kind === 'edge' ? (clearance[measSel.id as 'e1'] ?? 0) : (desnivel[measSel.id as 'c1']?.offset ?? 0)) : 0)}
          measSetIds={[...Object.entries(clearance).filter(([, v]) => (v ?? 0) > 0).map(([k]) => k), ...Object.entries(desnivel).filter(([, v]) => (v?.offset ?? 0) > 0).map(([k]) => k)]}
          onMeasVal={setMeasVal}
          rackColors={slide === 'color' && glassType && thickness
            ? (() => {
                const all = colorsForThickness(glassType, thickness).map(([key, info]) => ({ key, name: t(info.key) }));
                if (all.length > 6 && color && !all.slice(0, 6).some((c) => c.key === color)) {
                  const sel = all.find((c) => c.key === color);
                  if (sel) return [...all.slice(0, 5), sel];
                }
                return all;
              })()
            : undefined}
          onRackPick={(key) => setColor(key)}
        />
      )}
      {/* LANGUAGE */}
      {slide === 'lang' && (
        <section className="slide active">
          <div className="lang-hero">
            <div className="hud">{t('brand')} · {t('tagline')}</div>
            <div className="display big">{t('brand')}</div>
            <div className="sub" style={{ textAlign: 'center' }}>
              Select your language / Seleccione su idioma
            </div>
            <div className="lang-cards">
              <button
                className="lang-card"
                onClick={() => {
                  setLang('en');
                  if (prefillName) setName(prefillName);
                  if (prefillProject) setProject(prefillProject);
                  goTo('customer');
                }}
              >
                <div className="lc-name">English</div>
                <div className="lc-sub">Continue in English</div>
              </button>
              <button
                className="lang-card"
                onClick={() => {
                  setLang('es');
                  if (prefillName) setName(prefillName);
                  if (prefillProject) setProject(prefillProject);
                  goTo('customer');
                }}
              >
                <div className="lc-name">Español</div>
                <div className="lc-sub">Continuar en español</div>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* CUSTOMER */}
      {slide === 'customer' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('custTitle')}</h1>
            <p className="slide-sub">{t('custSub')}</p>
            <div className="grid c2" style={{ marginBottom: 18 }}>
              <div>
                <label className="f-label" htmlFor="k-name">{t('nameLabel')} *</label>
                <input id="k-name" className="field" value={name} placeholder={t('namePh')}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="f-label" htmlFor="k-proj">{t('projLabel')} {t('optional')}</label>
                <input id="k-proj" className="field" value={project} placeholder={t('projPh')}
                  onChange={(e) => setProject(e.target.value)} />
              </div>
            </div>
            <label className="f-label">{t('ctabPhone')} / {t('ctabEmail')}</label>
            <div className="seg" style={{ marginBottom: 16 }}>
              {(['phone', 'email', 'both', 'none'] as const).map((tab) => (
                <button key={tab} aria-pressed={contact.tab === tab}
                  onClick={() => setContact({ ...contact, tab })}>
                  {t(tab === 'phone' ? 'ctabPhone' : tab === 'email' ? 'ctabEmail' : tab === 'both' ? 'ctabBoth' : 'ctabNone')}
                </button>
              ))}
            </div>
            {contact.tab === 'none' && <div className="note">{t('ctabNoneDesc')}</div>}
            {(contact.tab === 'phone' || contact.tab === 'both') && (
              <div style={{ marginBottom: 16 }}>
                <label className="f-label" htmlFor="k-phone">{t('phoneLabel')}</label>
                <input id="k-phone" className="field" value={contact.phone} placeholder={t('phonePh')}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                <label className="f-label" style={{ marginTop: 16 }}>{t('ctypeLabel')}</label>
                <div className="seg" style={{ marginBottom: 14 }}>
                  {(['personal', 'office', 'company', 'other'] as const).map((ty) => (
                    <button key={ty} aria-pressed={contact.type === ty}
                      onClick={() => setContact({ ...contact, type: ty })}>
                      {t(ty === 'personal' ? 'ctypePersonal' : ty === 'office' ? 'ctypeOffice' : ty === 'company' ? 'ctypeCompany' : 'ctypeOther')}
                    </button>
                  ))}
                </div>
                {(contact.type === 'office' || contact.type === 'company') && (
                  <div>
                    <label className="f-label" htmlFor="k-ext">{t('extLabel')}</label>
                    <input id="k-ext" className="field" value={contact.extension} placeholder={t('extPh')}
                      onChange={(e) => setContact({ ...contact, extension: e.target.value })} />
                  </div>
                )}
              </div>
            )}
            {(contact.tab === 'email' || contact.tab === 'both') && (
              <div>
                <label className="f-label" htmlFor="k-email">{t('emailLabel')}</label>
                <input id="k-email" className="field" value={contact.email} placeholder={t('emailPh')}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </div>
            )}
            {foot()}
          </div>
        </section>
      )}

      {/* DEVICE (only when IsKioskInShop=true) */}
      {slide === 'device' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('deviceTitle')}</h1>
            <p className="slide-sub">{t('deviceSub')}</p>
            <div className="opt-grid c2">
              <button className="opt-card" onClick={goNext}>
                <div className="oc-name">{t('deviceKioskTitle')}</div>
                <div><span className="badge">{t('recommended')}</span></div>
                <div className="oc-desc">{t('deviceKioskDesc')}</div>
              </button>
              <button className="opt-card" onClick={() => setQrOpen(true)}>
                <div className="oc-name">{t('devicePhoneTitle')}</div>
                <div className="oc-desc">{t('devicePhoneDesc')}</div>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TYPE */}
      {slide === 'type' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('typeTitle')}</h1>
            <p className="slide-sub">{t('typeSub')}</p>
            <div className="opt-grid c2" style={{ marginBottom: 18 }}>
              <button className={`opt-card${base === 'float' ? ' sel' : ''}`} aria-pressed={base === 'float'}
                onClick={() => applyType('float', temp, uc)}>
                <span className="oc-check">{base === 'float' ? '✓' : ''}</span>
                <div className="oc-name">{t('typeFloat')}</div>
                <div className="oc-desc">{t('typeFloatDesc')}</div>
              </button>
              <button className={`opt-card${base === 'laminated' ? ' sel' : ''}`} aria-pressed={base === 'laminated'}
                onClick={() => applyType('laminated', false, false)}>
                <span className="oc-check">{base === 'laminated' ? '✓' : ''}</span>
                <div className="oc-name">{t('typeLam')}</div>
                <div className="oc-desc">{t('typeLamDesc')}</div>
              </button>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label className="switch">
                  <input type="checkbox" checked={temp} disabled={base !== 'float'}
                    onChange={(e) => applyType(base, e.target.checked, uc)} />
                  <span className="track" />
                </label>
                <span style={{ fontWeight: 600 }}>{t('swTemp')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label className="switch">
                  <input type="checkbox" checked={uc} disabled={base !== 'float'}
                    onChange={(e) => applyType(base, temp, e.target.checked)} />
                  <span className="track" />
                </label>
                <span style={{ fontWeight: 600 }}>{t('swUC')}</span>
              </div>
              {glassType && (
                <div className="hud" style={{ letterSpacing: '.14em' }}>
                  {t('selType')} <b>{t(TYPE_I18N_KEY[glassType])}</b>
                </div>
              )}
            </div>
            {foot()}
          </div>
        </section>
      )}

      {/* SIZE */}
      {slide === 'size' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('sizeTitle')}</h1>
            <p className="slide-sub">{t('sizeSub')}</p>
            <div className="size-fields">
              <button className="size-field" onClick={() => setNpField('width')}>
                <div className="sf-label">{t('wLabel')}</div>
                <div className={`sf-val${width ? ' has' : ''}`}>{width ? toFracStr(width) : '—'}</div>
              </button>
              <button className="size-field" onClick={() => setNpField('height')}>
                <div className="sf-label">{t('hLabel')}</div>
                <div className={`sf-val${height ? ' has' : ''}`}>{height ? toFracStr(height) : '—'}</div>
              </button>
            </div>
            {fullLite && (
              <div className="note warn">
                <b>{t('flTitle')}</b>
                <br />
                {t('flDesc')}
              </div>
            )}
            {width != null && height != null && (
              <>
                <p className="sub" style={{ fontSize: '.84rem', marginBottom: 8 }}>{t('measHint')}</p>
                {measSel?.kind === 'edge' && (
                  <div className="card" style={{ display: 'block' }}>
                    <label className="f-label">
                      {t('clearLabel')} · {t(`side${measSel.id.slice(1)}`)}
                    </label>
                    <InchInput value={clearance[measSel.id as 'e1'] ?? 0} onCommit={(v) => setMeasVal(Math.min(1, Math.max(0, v)))} ariaLabel={t('clearLabel')} />
                  </div>
                )}
                {measSel?.kind === 'corner' && (
                  <div className="card" style={{ display: 'block' }}>
                    <label className="f-label">
                      {t('desnLabel')} · {t(`erCorner${measSel.id.slice(1)}`)}
                    </label>
                    <InchInput value={desnivel[measSel.id as 'c1']?.offset ?? 0} onCommit={(v) => setMeasVal(Math.min(2, Math.max(0, v)))} ariaLabel={t('desnLabel')} />
                    <div className="seg" style={{ marginTop: 10 }}>
                      {(['h', 'v'] as const).map((d) => (
                        <button key={d} aria-pressed={(desnivel[measSel.id as 'c1']?.dir ?? 'h') === d}
                          onClick={() => setDesnivel({ ...desnivel, [measSel.id]: { offset: desnivel[measSel.id as 'c1']?.offset ?? 0, dir: d } })}>
                          {d === 'h' ? t('desnDirH') : t('desnDirV')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {foot()}
          </div>
        </section>
      )}

      {/* QTY (pieces of the measured size) */}
      {slide === 'qty' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('qtyTitle')}</h1>
            <p className="slide-sub">{t('qtySub')}</p>
            <div className="opt-grid c5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={`opt-card${qty === n ? ' sel' : ''}`} aria-pressed={qty === n}
                  onClick={() => setQty(n)}>
                  <span className="oc-check">{qty === n ? '✓' : ''}</span>
                  <div className="oc-name mono" style={{ fontSize: '1.5rem' }}>{n}×</div>
                  <div className="oc-desc">{t('qtyPieces')}</div>
                </button>
              ))}
            </div>
            <div style={{ maxWidth: 260, marginTop: 4 }}>
              <label className="f-label" htmlFor="k-qty">{t('qtyCustom')}</label>
              <input id="k-qty" className="field" inputMode="numeric" pattern="[0-9]*"
                value={qty ?? ''} placeholder="1"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '');
                  if (v === '') { setQty(null); return; }
                  const n = Math.max(1, Math.min(999, parseInt(v, 10)));
                  setQty(n);
                }} />
            </div>
            <p className="sub" style={{ fontSize: '.84rem', marginTop: 12 }}>{t('qtyNote')}</p>
            {foot()}
          </div>
        </section>
      )}

      {/* THICKNESS: slider ruler on the stage, no card grid */}
      {slide === 'thick' && glassType && (
        <section className="slide active k-thick-sec">
          {chrome}
          <div className="k-thicknav">
            <button className="btn ghost lg" onClick={goBack}>{t('back')}</button>
            <button className="btn lg" disabled={!canContinue[slide]} onClick={goNext}>{t('continueBtn')}</button>
          </div>
        </section>
      )}

      {/* COLOR */}
      {slide === 'color' && glassType && thickness && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('colorTitle')}</h1>
            <p className="slide-sub">{t('colorSub')}</p>
            <div className="opt-grid c3">
              {colorsForThickness(glassType, thickness).map(([key, info]) => (
                <button key={key} className={`opt-card${color === key ? ' sel' : ''}`}
                  aria-pressed={color === key} onClick={() => setColor(key)}>
                  <span className="oc-check">{color === key ? '✓' : ''}</span>
                  <Swatch color={info} />
                  <div className="oc-name" style={{ fontSize: '.95rem' }}>{t(info.key)}</div>
                </button>
              ))}
            </div>
            {foot()}
          </div>
        </section>
      )}

      {/* ADDITIONS */}
      {slide === 'add' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('addTitle')}</h1>
            <p className="slide-sub">{t('addSub')}</p>

            {/* Beveling */}
            <div className={`add-card${additions.beveling.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.beveling.active}
                onClick={() => { const on = !additions.beveling.active; if (on) fire('bevel'); setAdditions({ ...additions, beveling: { ...additions.beveling, active: on } }); }}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addBevName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addBevDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.beveling.active ? '✓' : ''}</span>
              </button>
              {additions.beveling.active && (
                <div className="add-body" style={{ display: 'block' }}>
                  <p className="sub" style={{ fontSize: '.84rem', marginBottom: 8 }}>{t('bevGlassHint')}</p>
                  {bevelEdge && additions.beveling.sides[bevelEdge] && (() => {
                    const cur = additions.beveling.perEdge?.[bevelEdge];
                    const ang = cur?.angle ?? additions.beveling.angle;
                    const wid = cur?.width ?? 0.5;
                    const setEdge = (patch: Partial<{ angle: number; width: number }>) =>
                      setAdditions({ ...additions, beveling: { ...additions.beveling, perEdge: { ...additions.beveling.perEdge, [bevelEdge]: { angle: ang, width: wid, ...patch } } } });
                    return (
                      <div className="card" style={{ display: 'block' }}>
                        <label className="f-label">{t('bevelAngle')} (°)</label>
                        <input className="field mono inch-input" type="number" min={5} max={45} key={bevelEdge} defaultValue={ang}
                          onBlur={(e) => { const a = Math.min(45, Math.max(5, parseInt(e.target.value, 10) || 5)); setEdge({ angle: a }); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
                        <label className="f-label" style={{ marginTop: 12 }}>{t('bevelWidth')}</label>
                        <InchInput value={wid} onCommit={(v) => setEdge({ width: Math.min(1.5, Math.max(0.125, v)) })} ariaLabel={t('bevelWidth')} />
                        <div style={{ marginTop: 10 }}>
                          <button className="btn sm ghost" onClick={() => {
                            const pe = { ...additions.beveling.perEdge };
                            delete pe[bevelEdge];
                            setAdditions({ ...additions, beveling: { ...additions.beveling, perEdge: pe } });
                          }}>{t('bevelResetEdge')}</button>
                        </div>
                      </div>
                    );
                  })()}
                  <p className="sub" style={{ marginTop: 12, fontSize: '.84rem' }}>{t('bevelNote')}</p>
                </div>
              )}
            </div>

            {/* Diamon-Fusion */}
            <div className={`add-card${additions.diamonfusion.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.diamonfusion.active}
                onClick={() => { if (!additions.diamonfusion.active) { fire('dfusion'); setPasta(false); } setAdditions({ ...additions, diamonfusion: { active: !additions.diamonfusion.active } }); }}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addDFName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addDFDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.diamonfusion.active ? '✓' : ''}</span>
              </button>
              {additions.diamonfusion.active && (
                <div className="add-body" style={{ display: 'block' }}>
                  <div className="note warn" style={{ marginBottom: 10 }}>{t('dfWarn')}</div>
                  <div className="note ok">
                    <b>{t('dfWarranty')}</b>
                    <br />
                    {t('dfWarrantyDesc')}
                  </div>
                </div>
              )}
            </div>

            {/* Edge Rounding */}
            <div className={`add-card${additions.edgerounding.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.edgerounding.active}
                onClick={() => {
                  const on = !additions.edgerounding.active;
                  setAdditions({
                    ...additions,
                    edgerounding: {
                      ...additions.edgerounding,
                      active: on,
                      radius: on && additions.edgerounding.radius === 0 ? 0.25 : additions.edgerounding.radius,
                    },
                  });
                }}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addERName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addERDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.edgerounding.active ? '✓' : ''}</span>
              </button>
              {additions.edgerounding.active && (
                <div className="add-body" style={{ display: 'block' }}>
                  <p className="sub" style={{ fontSize: '.84rem', marginBottom: 8 }}>{t('erGlassHint')}</p>
                  <label className="f-label">{t('erRadius')}</label>
                  <InchInput value={additions.edgerounding.radius} onCommit={(v) => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, radius: Math.min(0.5, Math.max(0, v)) } })} ariaLabel={t('erRadius')} />
                  <label className="f-label" style={{ marginTop: 14 }}>{t('erEdges')}</label>
                  <div className="seg" style={{ marginBottom: 4 }}>
                    {(['e1', 'e2', 'e3', 'e4'] as const).map((k, i) => (
                      <button key={k} aria-pressed={additions.edgerounding.edges[k]}
                        onClick={() => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, edges: { ...additions.edgerounding.edges, [k]: !additions.edgerounding.edges[k] } } })}>
                        {t(`erEdge${i + 1}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filo Matado */}
            <div className={`add-card${additions.filomatado?.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={!!additions.filomatado?.active}
                onClick={() => setAdditions({ ...additions, filomatado: { active: !additions.filomatado?.active } })}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addFMName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addFMDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.filomatado?.active ? '✓' : ''}</span>
              </button>
            </div>

            {/* Pasta easter egg (appears after typing "pasta"; Diamon-Fusion cleans it) */}
            {pastaUnlocked && (
              <div className={`add-card${pasta ? ' sel' : ''}`}>
                <button className="add-head" aria-pressed={pasta}
                  onClick={() => { const on = !pasta; setPasta(on); if (on) fire('pasta'); }}>
                  <span style={{ flex: 1 }}>
                    <span className="ah-name">{t('addPastaName')}</span>
                    <span className="ah-desc" style={{ display: 'block' }}>{t('addPastaDesc')}</span>
                  </span>
                  <span className="oc-check" style={{ position: 'static' }}>{pasta ? '✓' : ''}</span>
                </button>
              </div>
            )}

            {/* Sandblasting */}
            <div className={`add-card${additions.sandblasting.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.sandblasting.active}
                onClick={() => { if (!additions.sandblasting.active) fire('sand'); setAdditions({ ...additions, sandblasting: { active: !additions.sandblasting.active } }); }}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addSBName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addSBDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.sandblasting.active ? '✓' : ''}</span>
              </button>
              {additions.sandblasting.active && (
                <div className="add-body" style={{ display: 'block' }}>
                  <div className="note">{t('sbNote')}</div>
                </div>
              )}
            </div>

            {foot()}
          </div>
        </section>
      )}

      {/* PAYMENT */}
      {slide === 'pay' && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('payTitle')}</h1>
            <p className="slide-sub">{t('paySub')}</p>
            <div className="opt-grid c3" style={{ marginBottom: 16 }}>
              {(['cash', 'credit-debit', 'apple-google-ath'] as PaymentMethod[]).map((m) => (
                <button key={m} className={`opt-card${payment === m ? ' sel' : ''}`}
                  aria-pressed={payment === m} onClick={() => { setPayment(m); fire(m === 'cash' ? 'cash' : m === 'credit-debit' ? 'card' : 'phone'); }}>
                  <span className="oc-check">{payment === m ? '✓' : ''}</span>
                  <div className="oc-name" style={{ fontSize: '.98rem' }}>{payLabel(m)}</div>
                </button>
              ))}
            </div>
            <div className="note">
              <b>{t('payNoticeTitle')}</b>
              <br />
              {t('payNoticeDesc')}
            </div>
            {foot()}
          </div>
        </section>
      )}

      {/* REVIEW */}
      {slide === 'review' && glassType && thickness && color && payment && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('reviewTitle')}</h1>
            <p className="slide-sub">{t('reviewSub')}</p>

            <button className="review-sec" onClick={() => goTo('customer')}>
              <div className="review-row"><span className="rl">{t('revCustomer')}</span><span className="rv">{name}</span></div>
              {project && <div className="review-row"><span className="rl">{t('projLabel')}</span><span className="rv">{project}</span></div>}
              <div className="review-row">
                <span className="rl">{t('ctabPhone')} / {t('ctabEmail')}</span>
                <span className="rv">
                  {contact.tab === 'none'
                    ? t('ctabNone')
                    : [contact.phone, contact.email].filter(Boolean).join(' · ') || t('ctabNone')}
                </span>
              </div>
            </button>

            <button className="review-sec" onClick={() => goTo('type')}>
              <div className="review-row"><span className="rl">{t('revType')}</span><span className="rv">{t(TYPE_I18N_KEY[glassType])}</span></div>
              <div className="review-row"><span className="rl">{t('revThick')}</span><span className="rv mono">{thickness}</span></div>
              <div className="review-row"><span className="rl">{t('revColor')}</span><span className="rv">{colorName(color, lang)}</span></div>
            </button>

            <button className="review-sec" onClick={() => goTo('size')}>
              <div className="review-row">
                <span className="rl">{t('revDims')}</span>
                <span className="rv mono">{qty && qty > 1 ? `${qty} × ` : ''}{toFracStr(width)} × {toFracStr(height)}</span>
              </div>
              {Object.keys(clearance).length > 0 && (
                <div className="review-row">
                  <span className="rl">{t('clearLabel')}</span>
                  <span className="rv mono">{Object.entries(clearance).map(([k, v]) => `${t(`side${k.slice(1)}`)} +${fracShort(v ?? 0)}"`).join(', ')}</span>
                </div>
              )}
              {Object.keys(desnivel).length > 0 && (
                <div className="review-row">
                  <span className="rl">{t('desnLabel')}</span>
                  <span className="rv mono">{Object.entries(desnivel).map(([k, v]) => `${t(`erCorner${k.slice(1)}`)} ${fracShort(v?.offset ?? 0)}" ${v?.dir === 'v' ? t('desnDirV') : t('desnDirH')}`).join(', ')}</span>
                </div>
              )}
            </button>

            <button className="review-sec" onClick={() => goTo('add')}>
              <div className="review-row">
                <span className="rl">{t('revAdditions')}</span>
                <span className="rv">
                  {[
                    additions.beveling.active && `${t('addBevName')} ${additions.beveling.angle}°${additions.beveling.perEdge && Object.keys(additions.beveling.perEdge).length > 0 ? ` · ${Object.keys(additions.beveling.perEdge).length} ${t('bevelCustomEdges')}` : ''}`,
                    additions.diamonfusion.active && t('addDFName'),
                    additions.edgerounding.active && `${t('addERName')} ${t('diagRadius')}=${fracShort(additions.edgerounding.radius)}`,
                    additions.sandblasting.active && t('addSBName'),
                  ].filter(Boolean).join(' · ') || t('noneSelected')}
                </span>
              </div>
            </button>

            <button className="review-sec" onClick={() => goTo('pay')}>
              <div className="review-row"><span className="rl">{t('revMethod')}</span><span className="rv">{payLabel(payment)}</span></div>
            </button>

            {fullLite && <div className="note warn" style={{ marginBottom: 14 }}>{t('flReviewNote')}</div>}

            <div className="slide-foot" style={{ margin: '8px 0 0' }}>
              <button className="btn lg" disabled={placing} onClick={submit}>
                {placing ? <><span className="spinner" />{t('placingOrder')}</> : t('confirmBtn')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SUCCESS */}
      {slide === 'success' && placedId && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner" style={{ textAlign: 'center' }}>
            <div className="success-check">✓</div>
            <h1 className="slide-title">{t('successTitle')}</h1>
            <p className="slide-sub" style={{ margin: '0 auto 8px' }}>{t('successSub')}</p>
            <div className="hud" style={{ marginTop: 14 }}>{t('orderIdLabel')}</div>
            <div className="oid-box">{placedId}</div>
            <button className="btn ghost" onClick={() => copyText(placedId, 'id')}>
              {copied === 'id' ? t('copied') : t('copyID')}
            </button>
            <div ref={successQrRef} className="qr-box" style={{ marginTop: 22 }}>
              <QRCode value={portalUrl(placedId)} size={180} />
            </div>
            <p className="sub" style={{ margin: '12px auto 0' }}>{t('qrScan')}</p>

            {!inShop && (
            <div className="save-tabs" style={{ textAlign: 'left' }}>
              <div className="seg" role="tablist" style={{ justifyContent: 'center', marginBottom: 14 }}>
                <button aria-pressed={saveTab === 'link'} onClick={() => setSaveTab('link')}>{t('saveTabLink')}</button>
                <button aria-pressed={saveTab === 'qr'} onClick={() => setSaveTab('qr')}>{t('saveTabQR')}</button>
                <button aria-pressed={saveTab === 'bk'} onClick={() => setSaveTab('bk')}>{t('saveTabBk')}</button>
              </div>
              {saveTab === 'link' && (
                <div className="card">
                  <p style={{ marginBottom: 12 }}>{t('saveLinkStep1')}</p>
                  <input className="field mono" readOnly value={portalUrl(placedId)} style={{ marginBottom: 12 }} />
                  <button className="btn block" onClick={() => copyText(portalUrl(placedId), 'link')}>
                    {copied === 'link' ? t('copied') : t('saveLinkBtn')}
                  </button>
                </div>
              )}
              {saveTab === 'qr' && (
                <div className="card">
                  <p style={{ marginBottom: 6 }}>{t('saveQRStep1')}</p>
                  <p style={{ marginBottom: 12 }}>{t('saveQRStep2')}</p>
                  <button className="btn block" onClick={downloadQR}>{t('saveQRBtn')}</button>
                </div>
              )}
              {saveTab === 'bk' && (
                <div className="card">
                  <p style={{ marginBottom: 6 }}>{t('saveBkStep1')}</p>
                  <p style={{ marginBottom: 12 }}>{t('saveBkStep2')}</p>
                  <button className="btn block" onClick={() => window.open(portalUrl(placedId), '_blank')}>
                    {t('saveBkBtn')}
                  </button>
                </div>
              )}
            </div>
            )}

            <div className="note" style={{ textAlign: 'left', marginTop: 20 }}>
              <b>{t('successNextTitle')}</b>
              <br />
              {t('successNextDesc')}
            </div>
            {!inShop && (
            <div className="note" style={{ textAlign: 'left', marginTop: 12 }}>
              <b>{t('mobileTipTitle')}</b>
              <ol className="steps" style={{ marginTop: 8 }}>
                <li>{t('mobileTip1')}</li>
                <li>{t('mobileTip2')}</li>
                <li>{t('mobileTip3')}</li>
              </ol>
            </div>
            )}
            <div className="slide-foot" style={{ margin: '24px 0 0' }}>
              <button className="btn lg ghost" onClick={resetAll}>{t('newOrderBtn')}</button>
            </div>
          </div>
        </section>
      )}

      {/* numpad */}
      <NumpadModal
        open={npField != null}
        title={npField === 'width' ? t('wLabel') : t('hLabel')}
        initial={npField === 'width' ? width : height}
        lang={lang}
        onClose={() => setNpField(null)}
        onDone={(v) => {
          if (npField === 'width') setWidth(v);
          else setHeight(v);
          setNpField(null);
        }}
      />

      {/* device handoff QR */}
      {qrOpen && (
        <div className="overlay open overlay-qr" role="dialog" aria-modal="true" aria-label={t('kioskQRTitle')}>
          <div className="sheet" style={{ textAlign: 'center' }}>
            <h3>{t('kioskQRTitle')}</h3>
            <div className="sheet-sub">{t('kioskQRDesc')}</div>
            <div className="qr-box">
              <QRCode value={handoffUrl} size={200} />
            </div>
            <div className="hud" style={{ margin: '16px 0', textTransform: 'none' }}>
              {qrSecs}s
            </div>
            <button className="btn block" onClick={() => setQrOpen(false)}>{t('kioskQRClose')}</button>
          </div>
        </div>
      )}
    </div>
  );
                }
