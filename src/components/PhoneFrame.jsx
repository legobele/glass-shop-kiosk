// Wraps the whole app in an iPhone frame (skinny bezel + home button).
// The phone app aesthetic: everything inside runs at phone width.
import StatusBar from './StatusBar';
import HomeButton from './HomeButton';

export default function PhoneFrame({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        background: '#2c2c2e',
        padding: '24px 0',
      }}
    >
      <div
        style={{
          width: 'min(420px, 100vw)',
          height: 'min(840px, 92vh)',
          background: '#c7c7cc',
          borderRadius: 40,
          border: '4px solid #1c1c1e',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 8px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <StatusBar />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
        <HomeButton />
      </div>
    </div>
  );
}
