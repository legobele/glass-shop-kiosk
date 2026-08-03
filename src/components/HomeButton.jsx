// The iconic iOS home button. Does nothing. Like the real one. Except this one is honest.
export default function HomeButton() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '10px 0 18px',
        background: 'linear-gradient(180deg, #e8e8e8 0%, #d4d4d4 100%)',
        borderTop: '1px solid #b3b3b3',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fafafa 0%, #d8d8d8 45%, #b8b8b8 100%)',
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -2px 3px rgba(0,0,0,0.2)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            border: '2px solid #9a9a9a',
            borderRadius: 4,
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
