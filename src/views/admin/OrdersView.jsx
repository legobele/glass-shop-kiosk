import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { t } from '../../i18n';
import { GLASS_TYPES, COLOR_KEYS } from '../../data/catalog';
import { fracToLabel } from '../../lib/fractions';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import Modal from '../../components/Modal';
import { useToast } from '../../components/Toast';

const STATUSES = ['pending', 'in-progress', 'ready', 'completed', 'cancelled'];
const STATUS_TONE = {
  pending: 'warn',
  'in-progress': 'info',
  ready: 'success',
  completed: 'neutral',
  cancelled: 'danger',
};

export default function OrdersView() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const stats = useMemo(() => {
    const byStatus = {};
    orders.forEach((o) => (byStatus[o.status] = (byStatus[o.status] || 0) + 1));
    return { total: orders.length, byStatus };
  }, [orders]);

  const updateStatus = async (orderId, status) => {
    try {
      const fn = httpsCallable(functions, 'updateOrderStatus');
      await fn({ orderId, status });
      toast.success(`Order ${orderId} → ${status}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const deleteOrder = async (orderId) => {
    if (!confirm(t('en', 'confirmDelete'))) return;
    try {
      const fn = httpsCallable(functions, 'deleteOrder');
      await fn({ orderId });
      toast.success('Order deleted');
      setSelected(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete order');
    }
  };

  return (
    <div>
      <h2 className="page-title">{t('en', 'adminTitle')}</h2>
      <p className="page-sub">{t('en', 'adminStats')}</p>

      {/* stats cards */}
      <div className="grid-2 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))' }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{stats.total}</div>
        </div>
        {STATUSES.map((s) => (
          <div key={s} className="glass-card" style={{ padding: 16 }}>
            <div className="muted" style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('en', 'st' + s[0].toUpperCase() + s.slice(1))}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{stats.byStatus[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* status filter */}
      <div className="row mb-2" style={{ gap: 8 }}>
        {['all', ...STATUSES].map((s) => (
          <button
            key={s}
            className="btn"
            style={{
              padding: '7px 16px',
              borderRadius: 40,
              fontSize: '0.82rem',
              background: filter === s ? 'var(--glass-deep)' : 'var(--surface-glass)',
              color: filter === s ? '#fff' : 'var(--text)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? t('en', 'filterAll') : t('en', 'st' + s[0].toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      {/* orders table */}
      {loading ? (
        <p className="muted">{t('en', 'loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="muted">{t('en', 'noOrders')}</p>
      ) : (
        <div className="table-wrap">
          <table className="qgi-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>{t('en', 'nameLabel')}</th>
                <th>{t('en', 'revGlass')}</th>
                <th>{t('en', 'revDims')}</th>
                <th>{t('en', 'statusLabel')}</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(o)}>
                  <td><strong style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>{o.orderId || o.id}</strong></td>
                  <td>{o.customerName}</td>
                  <td>
                    {o.glassType ? t('en', GLASS_TYPES[o.glassType]?.labelKey || 'tFloat') : ''} ·{' '}
                    {o.color ? t('en', COLOR_KEYS[o.color] || 'cClear') : ''}
                  </td>
                  <td>{fracToLabel(o.width)} x {fracToLabel(o.height)}</td>
                  <td><Pill tone={STATUS_TONE[o.status] || 'neutral'}>{t('en', 'st' + (o.status || 'pending')[0].toUpperCase() + (o.status || 'pending').slice(1))}</Pill></td>
                  <td className="muted" style={{ fontSize: '0.8rem' }}>
                    {o.createdAt ? new Date(o.createdAt.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelected(o); }}>
                      {t('en', 'edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* order detail / edit modal */}
      {selected && (
        <Modal open onClose={() => setSelected(null)} title={t('en', 'orderDetail')} width={560}>
          <OrderDetail order={selected} onStatus={updateStatus} onDelete={deleteOrder} onClose={() => setSelected(null)} />
        </Modal>
      )}
    </div>
  );
}

function OrderDetail({ order, onStatus, onDelete, onClose }) {
  const [name, setName] = useState(order.customerName || '');
  const [project, setProject] = useState(order.projectName || '');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const fn = httpsCallable(functions, 'editOrder');
      // staff bypasses PIN; include name/project patch
      await fn({ orderId: order.orderId || order.id, customerName: name, projectName: project });
      toast.success('Order updated');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <strong style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '1.1rem' }}>{order.orderId || order.id}</strong>
        <Pill tone={STATUS_TONE[order.status] || 'neutral'}>
          {t('en', 'st' + (order.status || 'pending')[0].toUpperCase() + (order.status || 'pending').slice(1))}
        </Pill>
      </div>

      {/* status transition buttons */}
      <div className="row mb-2" style={{ gap: 8 }}>
        {STATUSES.filter((s) => s !== order.status).map((s) => (
          <button
            key={s}
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 40 }}
            onClick={() => onStatus(order.orderId || order.id, s)}
          >
            → {t('en', 'st' + s[0].toUpperCase() + s.slice(1))}
          </button>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />

      <div className="field">
        <label>{t('en', 'nameLabel')}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('en', 'projLabel')}</label>
        <input className="input" value={project} onChange={(e) => setProject(e.target.value)} />
      </div>

      <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.88rem', padding: '3px 0' }}>
        <span className="muted">{t('en', 'revGlass')}</span>
        <strong>
          {order.glassType ? t('en', GLASS_TYPES[order.glassType]?.labelKey || 'tFloat') : ''} ·{' '}
          {order.color ? t('en', COLOR_KEYS[order.color] || 'cClear') : ''} · {order.thickness}
        </strong>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.88rem', padding: '3px 0' }}>
        <span className="muted">{t('en', 'revDims')}</span>
        <strong>{fracToLabel(order.width)} x {fracToLabel(order.height)}</strong>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.88rem', padding: '3px 0' }}>
        <span className="muted">{t('en', 'revMethod')}</span>
        <strong>{t('en', 'pay' + { cash: 'Cash', 'credit-debit': 'Card', 'apple-google-ath': 'Digital' }[order.payment] || '')}</strong>
      </div>

      {order.isFullLite && <Pill tone="warn">⚠️ {t('en', 'flTitle')}</Pill>}

      <div className="row mt-3" style={{ justifyContent: 'flex-end' }}>
        <Button variant="danger" onClick={() => onDelete(order.orderId || order.id)}>
          {t('en', 'deleteOrder')}
        </Button>
        <Button loading={saving} onClick={save}>
          {t('en', 'saveChanges')}
        </Button>
      </div>
    </div>
  );
}
