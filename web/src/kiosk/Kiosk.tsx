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
  THICK_MM,
  TYPE_I18N_KEY,
  colorsForThickness,
  isFullLite,
  liteSizesFor,
  resolveGlassType,
  thickValue,
  thicknessesForType,
} from '../lib/catalog';
import { ER_FRACS, toFracStr } from '../lib/frac';
import { makeT } from '../lib/i18n';
import { addOrder } from '../lib/store';
import { colorName } from '../lib/format';
import { Swatch } from '../components/Swatch';
import { BevelDiagram, EdgeRoundingDiagram, SizeDiagram } from '../components/Diagrams';
import { NumpadModal } from '../components/NumpadModal';

type SlideId =
  | 'lang' | 'customer' | 'device' | 'type' | 'size' | 'thick'
  | 'color' | 'add' | 'pay' | 'review' | 'success';

const DOT_INDEX: Record<SlideId, number | null> = {
  lang: null, customer: 0, device: null, type: 1, size: 2, thick: 3,
  color: 4, add: 5, pay: 6, review: 7, success: 8,
};

function fracShort(v: number): string {
  return toFracStr(v).replace(/^0 /, '');
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
  const [thickness, setThickness] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [additions, setAdditions] = useState<Additions>(emptyAdditions());
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

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
      case 'type': return 'size';
      case 'size': return 'thick';
      case 'thick': return 'color';
      case 'color': return 'add';
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
    setThickness(null); setColor(null);
    setAdditions(emptyAdditions());
    setPayment(null); setPlacedId(null); setPlacing(false);
    setHistory([]); setSlide('lang');
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
      dimensions: { width, height },
      specifications: {
        glassType, color, thickness, additions, isFullLite: fullLite, lang,
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
          {Array.from({ length: 9 }, (_, i) => (
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
  return (
    <div className="kiosk-shell">
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
            <div className="diagram-box" style={{ marginBottom: 16 }}>
              <SizeDiagram w={width} h={height} />
            </div>
            {glassType && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3>{t('maxCutHdr')}</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {liteSizesFor(glassType, color, thickness).map((s) => (
                    <span key={`${s.w}x${s.h}`} className="chip mono">
                      {toFracStr(s.w)} × {toFracStr(s.h)} {t('liteWord')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fullLite && (
              <div className="note warn">
                <b>{t('flTitle')}</b>
                <br />
                {t('flDesc')}
              </div>
            )}
            {foot()}
          </div>
        </section>
      )}

      {/* THICKNESS */}
      {slide === 'thick' && glassType && (
        <section className="slide active">
          {chrome}
          <div className="slide-inner">
            <h1 className="slide-title">{t('thickTitle')}</h1>
            <p className="slide-sub">{t('thickSub')}</p>
            <div className="opt-grid c3">
              {thicknessesForType(glassType).map((th) => {
                const v = thickValue(th);
                return (
                  <button key={th} className={`opt-card${thickness === th ? ' sel' : ''}`}
                    aria-pressed={thickness === th}
                    onClick={() => {
                      setThickness(th);
                      if (color) {
                        const cols = colorsForThickness(glassType, th).map(([k]) => k);
                        if (!cols.includes(color)) setColor(null);
                      }
                    }}>
                    <span className="oc-check">{thickness === th ? '✓' : ''}</span>
                    <div className="th-visual">
                      <div className="th-bar" style={{ height: `${10 + v * 58}px` }}>
                        <span>{THICK_MM[th] ?? ''}</span>
                      </div>
                    </div>
                    <div className="oc-name mono">{th}</div>
                    {glassType === 'laminated' && (
                      <div className="oc-desc mono" style={{ fontSize: '.78rem' }}>
                        {fracShort(v / 2)} + PVB + {fracShort(v / 2)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {foot()}
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
                onClick={() => setAdditions({ ...additions, beveling: { ...additions.beveling, active: !additions.beveling.active } })}>
                <span style={{ flex: 1 }}>
                  <span className="ah-name">{t('addBevName')}</span>
                  <span className="ah-desc" style={{ display: 'block' }}>{t('addBevDesc')}</span>
                </span>
                <span className="oc-check" style={{ position: 'static' }}>{additions.beveling.active ? '✓' : ''}</span>
              </button>
              {additions.beveling.active && (
                <div className="add-body" style={{ display: 'block' }}>
                  <div className="diagram-box" style={{ marginBottom: 14 }}>
                    <BevelDiagram angle={additions.beveling.angle} sides={additions.beveling.sides} />
                  </div>
                  <label className="f-label">{t('bevelAngle')}: {additions.beveling.angle}°</label>
                  <input type="range" min={5} max={45} step={1} value={additions.beveling.angle}
                    onChange={(e) => setAdditions({ ...additions, beveling: { ...additions.beveling, angle: parseInt(e.target.value, 10) } })} />
                  <label className="f-label" style={{ marginTop: 14 }}>{t('bevelSides')}</label>
                  <div className="grid c2">
                    {(['e1', 'e2', 'e3', 'e4'] as const).map((k, i) => (
                      <label key={k} className={`checkrow${additions.beveling.sides[k] ? ' on' : ''}`}>
                        <input type="checkbox" checked={additions.beveling.sides[k]}
                          onChange={(e) => setAdditions({ ...additions, beveling: { ...additions.beveling, sides: { ...additions.beveling.sides, [k]: e.target.checked } } })} />
                        {t(`side${i + 1}`)}
                      </label>
                    ))}
                  </div>
                  <p className="sub" style={{ marginTop: 12, fontSize: '.84rem' }}>{t('bevelNote')}</p>
                </div>
              )}
            </div>

            {/* Diamon-Fusion */}
            <div className={`add-card${additions.diamonfusion.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.diamonfusion.active}
                onClick={() => setAdditions({ ...additions, diamonfusion: { active: !additions.diamonfusion.active } })}>
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
                  <div className="diagram-box" style={{ marginBottom: 14 }}>
                    <EdgeRoundingDiagram
                      radius={additions.edgerounding.radius}
                      edges={additions.edgerounding.edges}
                      corners={additions.edgerounding.corners}
                    />
                  </div>
                  <label className="f-label">{t('erRadius')}</label>
                  <div className="frac-grid" style={{ marginBottom: 6 }}>
                    {ER_FRACS.filter((f) => f.val > 0).map((f) => (
                      <button key={f.label}
                        className={additions.edgerounding.radius === f.val ? 'sel' : ''}
                        aria-pressed={additions.edgerounding.radius === f.val}
                        onClick={() => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, radius: f.val } })}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="sub" style={{ fontSize: '.84rem', marginBottom: 14 }}>{t('erRadiusNote')}</p>
                  <label className="f-label">{t('erEdges')}</label>
                  <div className="grid c2" style={{ marginBottom: 14 }}>
                    {(['e1', 'e2', 'e3', 'e4'] as const).map((k, i) => (
                      <label key={k} className={`checkrow${additions.edgerounding.edges[k] ? ' on' : ''}`}>
                        <input type="checkbox" checked={additions.edgerounding.edges[k]}
                          onChange={(e) => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, edges: { ...additions.edgerounding.edges, [k]: e.target.checked } } })} />
                        {t(`erEdge${i + 1}`)}
                      </label>
                    ))}
                  </div>
                  <label className="f-label">{t('erCorners')}</label>
                  <div className="grid c2">
                    {(['c1', 'c2', 'c3', 'c4'] as const).map((k, i) => (
                      <label key={k} className={`checkrow${additions.edgerounding.corners[k] ? ' on' : ''}`}>
                        <input type="checkbox" checked={additions.edgerounding.corners[k]}
                          onChange={(e) => setAdditions({ ...additions, edgerounding: { ...additions.edgerounding, corners: { ...additions.edgerounding.corners, [k]: e.target.checked } } })} />
                        {t(`erCorner${i + 1}`)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sandblasting */}
            <div className={`add-card${additions.sandblasting.active ? ' sel' : ''}`}>
              <button className="add-head" aria-pressed={additions.sandblasting.active}
                onClick={() => setAdditions({ ...additions, sandblasting: { active: !additions.sandblasting.active } })}>
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
                  aria-pressed={payment === m} onClick={() => setPayment(m)}>
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
                <span className="rv mono">{toFracStr(width)} × {toFracStr(height)}</span>
              </div>
            </button>

            <button className="review-sec" onClick={() => goTo('add')}>
              <div className="review-row">
                <span className="rl">{t('revAdditions')}</span>
                <span className="rv">
                  {[
                    additions.beveling.active && `${t('addBevName')} ${additions.beveling.angle}°`,
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

            <div className="note" style={{ textAlign: 'left', marginTop: 20 }}>
              <b>{t('successNextTitle')}</b>
              <br />
              {t('successNextDesc')}
            </div>
            <div className="note" style={{ textAlign: 'left', marginTop: 12 }}>
              <b>{t('mobileTipTitle')}</b>
              <ol className="steps" style={{ marginTop: 8 }}>
                <li>{t('mobileTip1')}</li>
                <li>{t('mobileTip2')}</li>
                <li>{t('mobileTip3')}</li>
              </ol>
            </div>
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
        <div className="overlay open" role="dialog" aria-modal="true" aria-label={t('kioskQRTitle')}>
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
