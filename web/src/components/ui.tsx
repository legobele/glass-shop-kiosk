import type { ReactNode } from 'react';
import type { OrderStatus } from '../lib/types';
import { STATUS_LABEL, STATUS_SIGNAL } from '../lib/format';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const sig = STATUS_SIGNAL[status];
  return (
    <span className="status">
      <span className={`dot ${sig}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Modal({
  open,
  title,
  sub,
  wide,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  sub?: string;
  wide?: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="overlay open"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={`sheet${wide ? ' wide' : ''}`}>
        <h3>{title}</h3>
        {sub && <div className="sheet-sub">{sub}</div>}
        {children}
      </div>
    </div>
  );
}
