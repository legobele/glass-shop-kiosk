export default function Stepper({ steps, current }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      {steps.map((s, i) => (
        <div
          key={s.id}
          style={{
            height: 6,
            flex: 1,
            borderRadius: 4,
            background:
              i < current ? 'var(--glass)' : i === current ? 'var(--glass-deep)' : 'rgba(255,255,255,0.22)',
            boxShadow: i <= current ? '0 0 10px var(--glass-glow)' : undefined,
            transition: 'all 0.25s var(--ease)',
          }}
        />
      ))}
    </div>
  );
}
