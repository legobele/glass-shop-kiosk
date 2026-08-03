import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal-panel" style={width ? { maxWidth: width } : undefined}>
        {title && (
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1.15rem' }}>{title}</h3>
            <button
              className="btn btn-ghost"
              onClick={onClose}
              style={{ padding: '6px 12px', borderRadius: 10 }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
