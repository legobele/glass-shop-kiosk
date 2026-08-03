import { useKiosk } from '../KioskContext';

export default function LangStep() {
  const { setLang, setStep } = useKiosk();
  const choose = (l) => {
    setLang(l);
    setStep(1);
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: '#fff' }}>Quality Glass Industries</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>Order Kiosk / Sistema de Pedidos</p>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
        Please select your language / Por favor seleccione su idioma
      </p>
      <div className="row" style={{ gap: 20, justifyContent: 'center' }}>
        <button
          className="glass-panel"
          onClick={() => choose('en')}
          style={{
            padding: '28px 44px',
            cursor: 'pointer',
            color: 'var(--text)',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
            boxShadow: 'var(--sh-lg)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <span style={{ fontSize: 44 }}>🇺🇸</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>English</span>
        </button>
        <button
          className="glass-panel"
          onClick={() => choose('es')}
          style={{
            padding: '28px 44px',
            cursor: 'pointer',
            color: 'var(--text)',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
            boxShadow: 'var(--sh-lg)',
            transition: 'transform .2s, box-shadow .2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-4px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <span style={{ fontSize: 44 }}>🇵🇷</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem' }}>Español</span>
        </button>
      </div>
    </div>
  );
}
