// Fake iOS 5 status bar — 9:41, carrier, signal, battery.
export default function StatusBar() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 100,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        color: '#000',
        background: 'linear-gradient(180deg, #f7f7f7 0%, #e8e8e8 100%)',
        borderBottom: '1px solid #b3b3b3',
        letterSpacing: 0.2,
      }}
    >
      <span style={{ flex: 1, textAlign: 'left' }}>9:41</span>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>AT&T</span>
      <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
        {/* signal bars */}
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 11 }}>
          {[3, 5, 7, 9].map((h) => (
            <span key={h} style={{ width: 3, height: h, background: '#000', borderRadius: 1 }} />
          ))}
        </span>
        {/* battery */}
        <span
          style={{
            width: 24,
            height: 12,
            border: '1.5px solid #000',
            borderRadius: 3,
            position: 'relative',
          }}
        >
          <span style={{ position: 'absolute', inset: 1.5, background: '#000', width: '80%' }} />
          <span style={{ position: 'absolute', right: -3.5, top: 3, width: 2, height: 5, background: '#000', borderRadius: 1 }} />
        </span>
      </span>
    </div>
  );
}
