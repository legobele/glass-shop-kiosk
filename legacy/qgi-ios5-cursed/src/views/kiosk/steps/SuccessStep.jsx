import { useEffect, useState } from 'react';
import { useKiosk } from '../KioskContext';
import { t } from '../../../i18n';
import Button from '../../../components/Button';
import QRCode from 'qrcode';

export default function SuccessStep() {
  const { lang, order } = useKiosk();
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const { result } = order;

  useEffect(() => {
    if (!result) return;
    QRCode.toDataURL(`https://legobele.github.io/qgi-platform/#/track?order=${result.orderId}`)
      .then(setQr)
      .catch(() => setQr(null));
  }, [result]);

  if (!result) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const restart = () => window.location.reload();

  return (
    <div className="page" style={{ placeItems: 'center', display: 'grid', padding: 24 }}>
      <div className="glass-panel" style={{ maxWidth: 560, width: '100%', padding: 36, textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: 'var(--success)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            color: '#fff',
            fontSize: '1.8rem',
            boxShadow: '0 0 30px var(--success-glow)',
            animation: 'popIn .4s var(--ease)',
          }}
        >
          ✓
        </div>
        <h2 className="page-title">{t(lang, 'successTitle')}</h2>
        <p className="page-sub">{t(lang, 'successSub')}</p>

        <div className="glass-card" style={{ padding: 18, borderColor: 'var(--glass)', marginBottom: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--glass-deep)', marginBottom: 4 }}>
            {t(lang, 'orderIdLabel')}
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>
            {result.orderId}
          </div>
          <Button variant="ghost" onClick={copy} style={{ marginTop: 10 }}>
            {copied ? `✓ ${t(lang, 'copied')}` : `📋 ${t(lang, 'copyID')}`}
          </Button>
        </div>

        {qr && (
          <div className="glass-card" style={{ padding: 18, marginBottom: 14 }}>
            <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 10 }}>{t(lang, 'qrScan')}</p>
            <img src={qr} alt="Order QR" style={{ width: 180, height: 180, borderRadius: 10 }} />
          </div>
        )}

        <div className="glass-card" style={{ padding: 16, borderColor: 'rgba(16,185,129,0.4)', textAlign: 'left' }}>
          <strong style={{ fontSize: '0.95rem' }}>🔑 {t(lang, 'changePinLabel')}</strong>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.15em', margin: '6px 0', color: 'var(--glass-deep)' }}>
            {result.changePIN}
          </div>
          <p className="muted" style={{ fontSize: '0.82rem' }}>{t(lang, 'changePinHelp')}</p>
          <div className="pill pill-info" style={{ marginTop: 10 }}>
            📞 {t(lang, 'phoneDisplay')}
          </div>
        </div>

        <div className="mt-3">
          <Button block variant="ghost" onClick={restart}>
            {t(lang, 'newOrderBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
