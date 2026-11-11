import { useKiosk } from '../KioskContext';

// iOS 5 home-screen style language picker — app-icon tiles on a springboard.
export default function LangStep() {
  const { setLang, setStep } = useKiosk();
  const choose = (l) => {
    setLang(l);
    setStep(1);
  };

  const iconStyle = {
    width: 76,
    height: 76,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 34,
    background: 'linear-gradient(180deg, #6db5f6 0%, #0e6fd8 100%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.35)',
    border: '1px solid rgba(0,0,0,0.2)',
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.6rem', color: '#000', fontWeight: 700 }}>Quality Glass</h1>
        <p style={{ color: '#4a4a4a', marginTop: 4, fontSize: '0.9rem' }}>
          Order Kiosk / Sistema de Pedidos
        </p>
      </div>
      <p style={{ color: '#4a4a4a', fontWeight: 500, fontSize: '0.9rem' }}>
        Please select your language
        <br />
        Por favor seleccione su idioma
      </p>
      <div className="row" style={{ gap: 28, justifyContent: 'center' }}>
        <button
          onClick={() => choose('en')}
          style={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span style={iconStyle}>🇺🇸</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#000' }}>English</span>
        </button>
        <button
          onClick={() => choose('es')}
          style={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span style={iconStyle}>🇵🇷</span>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#000' }}>Español</span>
        </button>
      </div>
      {/* springboard page dots */}
      <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: '#000' }} />
        <span style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );
}
