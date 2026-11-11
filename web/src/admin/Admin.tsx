import { useMemo, useState } from 'react';
import type { Order, OrderStatus, PaymentMethod } from '../lib/types';
import { THICK_ORDER, colorsForThickness, thicknessesForType } from '../lib/catalog';
import { toFracStr } from '../lib/frac';
import {
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_ORDER,
  additionLabels,
  colorName,
  formatDateTime,
  typeName,
} from '../lib/format';
import {
  activityLogText,
  logActivity,
  removeOrder,
  updateOrder,
  useStore,
} from '../lib/store';
import { Modal, StatusBadge } from '../components/ui';

const PIN_ERROR = 'Invalid PIN. Customer must generate a change PIN from the customer portal.';

type Filter = 'all' | OrderStatus;

export default function Admin() {
  const { orders, activity } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [statusFor, setStatusFor] = useState<Order | null>(null);
  const [pinFor, setPinFor] = useState<Order | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [editFor, setEditFor] = useState<Order | null>(null);
  const [deleteFor, setDeleteFor] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const byStatus: Record<OrderStatus, number> = {
      pending: 0, 'in-progress': 0, ready: 0, completed: 0, cancelled: 0,
    };
    let todayCount = 0;
    for (const o of orders) {
      byStatus[o.status] += 1;
      if (new Date(o.timestamp).toDateString() === today) todayCount += 1;
    }
    return { total: orders.length, todayCount, byStatus };
  }, [orders]);

  const visible = useMemo(
    () =>
      orders
        .filter((o) => filter === 'all' || o.status === filter)
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [orders, filter],
  );

  function downloadLog() {
    const blob = new Blob([activityLogText()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qgi-activity-log.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  }

  function tryPin() {
    if (!pinFor) return;
    if (pinFor.changePIN && pinInput.trim() === pinFor.changePIN) {
      setEditFor(pinFor);
      setPinFor(null);
      setPinInput('');
      setPinError('');
    } else {
      setPinError(PIN_ERROR);
    }
  }

  return (
    <div className="wrap">
      <div className="hud" style={{ marginBottom: 8 }}>Quality Glass · Sales</div>
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="sub" style={{ marginTop: 8 }}>
        Every order from the kiosk, the portal, and this dashboard, in one local-first store.
      </p>

      <div className="grid c5" style={{ margin: '26px 0 8px' }}>
        <div className="stat"><div className="s-label">Total Orders</div><div className="s-val">{stats.total}</div></div>
        <div className="stat"><div className="s-label">Today's Orders</div><div className="s-val">{stats.todayCount}</div></div>
        <div className="stat"><div className="s-label">Pending</div><div className="s-val">{stats.byStatus.pending}</div></div>
        <div className="stat"><div className="s-label">In Progress</div><div className="s-val">{stats.byStatus['in-progress']}</div></div>
        <div className="stat"><div className="s-label">Ready</div><div className="s-val">{stats.byStatus.ready}</div></div>
      </div>

      <div className="sec-head">
        <span className="idx">01</span>
        <h2>Orders</h2>
        <span className="rule" />
        <span className="hud">{visible.length} shown · {activity.length} log entries</span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
        <div className="seg">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
          {STATUS_ORDER.map((s) => (
            <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={downloadLog}>Download Activity Log</button>
        <button className="btn ghost sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {visible.length === 0 && (
        <div className="card empty">
          <div className="big">No orders here</div>
          Nothing matches this filter yet.
        </div>
      )}

      {visible.map((o) => (
        <OrderCard
          key={o.orderId}
          order={o}
          onStatus={() => setStatusFor(o)}
          onEdit={() => { setPinFor(o); setPinInput(''); setPinError(''); }}
          onDelete={() => setDeleteFor(o)}
        />
      ))}

      {/* change status */}
      <Modal open={statusFor != null} title="Change Status"
        sub={statusFor ? `Order ${statusFor.orderId}` : ''}
        onClose={() => setStatusFor(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STATUS_ORDER.map((s) => (
            <button key={s} className="btn ghost" style={{ justifyContent: 'flex-start' }}
              disabled={statusFor?.status === s}
              onClick={() => {
                if (!statusFor) return;
                updateOrder(statusFor.orderId, { status: s });
                logActivity('admin', 'status_changed', statusFor.orderId, `Status changed to ${STATUS_LABEL[s]}.`);
                setStatusFor(null);
              }}>
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      </Modal>

      {/* PIN gate */}
      <Modal open={pinFor != null} title="Enter Change PIN"
        sub="Order edits are locked. The customer generates a 6-digit change PIN in the customer portal and gives it to sales."
        onClose={() => setPinFor(null)}>
        {pinError && <div className="err-box">{pinError}</div>}
        <label className="f-label" htmlFor="pin-in">6-digit PIN</label>
        <input id="pin-in" className="field mono" inputMode="numeric" maxLength={6}
          value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
          style={{ fontSize: '1.3rem', letterSpacing: '.3em', textAlign: 'center', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPinFor(null)}>Cancel</button>
          <button className="btn" style={{ flex: 1 }} disabled={pinInput.length !== 6} onClick={tryPin}>
            Unlock Edit
          </button>
        </div>
      </Modal>

      {/* edit form */}
      {editFor && (
        <EditOrderModal
          order={editFor}
          onClose={() => setEditFor(null)}
          onSaved={() => setEditFor(null)}
        />
      )}

      {/* delete confirm */}
      <Modal open={deleteFor != null} title="Delete Order"
        sub={deleteFor ? `Order ${deleteFor.orderId} will be removed permanently.` : ''}
        onClose={() => setDeleteFor(null)}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => setDeleteFor(null)}>Cancel</button>
          <button className="btn danger" style={{ flex: 1 }}
            onClick={() => {
              if (!deleteFor) return;
              removeOrder(deleteFor.orderId);
              logActivity('admin', 'order_deleted', deleteFor.orderId, 'Order deleted from admin.');
              setDeleteFor(null);
            }}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function OrderCard({
  order: o,
  onStatus,
  onEdit,
  onDelete,
}: {
  order: Order;
  onStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [custName, setCustName] = useState(o.customerName);
  const [projName, setProjName] = useState(o.projectName);
  const dirty = custName !== o.customerName || projName !== o.projectName;
  const adds = additionLabels(o.specifications.additions);

  return (
    <article className="order-card">
      <div className="order-head">
        <div>
          <div className="oid">{o.orderId}</div>
          <div className="ots">{formatDateTime(o.timestamp)}</div>
        </div>
        <StatusBadge status={o.status} />
        <span className="spacer" />
        <button className="btn ghost sm" onClick={onStatus}>Change Status</button>
        <button className="btn ghost sm" onClick={onEdit}>Edit Order</button>
        <button className="btn danger sm" onClick={onDelete}>Delete</button>
      </div>

      <div className="grid c2" style={{ marginTop: 16, gap: 12 }}>
        <div>
          <label className="f-label" htmlFor={`cn-${o.orderId}`}>Customer Name</label>
          <input id={`cn-${o.orderId}`} className="field" value={custName}
            onChange={(e) => setCustName(e.target.value)} />
        </div>
        <div>
          <label className="f-label" htmlFor={`pn-${o.orderId}`}>Project Name</label>
          <input id={`pn-${o.orderId}`} className="field" value={projName}
            onChange={(e) => setProjName(e.target.value)} />
        </div>
      </div>
      {dirty && (
        <button className="btn sm" style={{ marginTop: 12 }}
          onClick={() => {
            updateOrder(o.orderId, { customerName: custName, projectName: projName });
            logActivity('admin', 'customer_updated', o.orderId, 'Customer name / project updated.');
          }}>
          Save
        </button>
      )}

      <div className="kv2">
        <div><div className="k">Dimensions</div><div className="v mono">{toFracStr(o.dimensions.width)} × {toFracStr(o.dimensions.height)}</div></div>
        <div><div className="k">Glass Type</div><div className="v">{typeName(o)}</div></div>
        <div><div className="k">Color</div><div className="v">{colorName(o.specifications.color)}</div></div>
        <div><div className="k">Thickness</div><div className="v mono">{o.specifications.thickness}</div></div>
        <div><div className="k">Payment</div><div className="v">{PAYMENT_LABEL[o.payment.method]}</div></div>
        <div><div className="k">Full Lite</div><div className="v">{o.specifications.isFullLite ? 'Yes' : 'No'}</div></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div className="k" style={{ fontFamily: 'var(--mono-font)', fontSize: '.62rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5 }}>
          Additional Services
        </div>
        {adds.length > 0 ? (
          <div className="addchips">
            {adds.map((a) => <span key={a} className="chip">{a}</span>)}
          </div>
        ) : (
          <span style={{ color: 'var(--dim)', fontSize: '.9rem' }}>None</span>
        )}
      </div>
    </article>
  );
}

function EditOrderModal({
  order: o,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [width, setWidth] = useState(String(o.dimensions.width));
  const [height, setHeight] = useState(String(o.dimensions.height));
  const [thickness, setThickness] = useState(o.specifications.thickness);
  const [color, setColor] = useState(o.specifications.color);
  const [payment, setPayment] = useState<PaymentMethod>(o.payment.method);
  const [adds, setAdds] = useState({
    beveling: o.specifications.additions.beveling.active,
    diamonfusion: o.specifications.additions.diamonfusion.active,
    edgerounding: o.specifications.additions.edgerounding.active,
    sandblasting: o.specifications.additions.sandblasting.active,
  });

  const type = o.specifications.glassType;
  const thickOptions = Array.from(new Set([...thicknessesForType(type), o.specifications.thickness]));
  const colorKeys = colorsForThickness(type, thickness).map(([k]) => k);
  if (!colorKeys.includes(color)) colorKeys.push(color);

  function save() {
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!(w > 0) || !(h > 0)) return;
    const additions = {
      ...o.specifications.additions,
      beveling: { ...o.specifications.additions.beveling, active: adds.beveling },
      diamonfusion: { active: adds.diamonfusion },
      edgerounding: { ...o.specifications.additions.edgerounding, active: adds.edgerounding },
      sandblasting: { active: adds.sandblasting },
    };
    updateOrder(o.orderId, {
      dimensions: { width: w, height: h },
      specifications: { ...o.specifications, thickness, color, additions },
      payment: { method: payment },
      changePIN: null, // PIN is single-use
    });
    logActivity('admin', 'order_edited', o.orderId, 'Order edited with customer change PIN. PIN consumed.');
    onSaved();
  }

  return (
    <Modal open title="Edit Order" sub={`Order ${o.orderId} · ${typeName(o)}`} wide onClose={onClose}>
      <div className="grid c2" style={{ gap: 12, marginBottom: 14 }}>
        <div>
          <label className="f-label" htmlFor="e-w">Width (decimal inches)</label>
          <input id="e-w" className="field mono" value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <div>
          <label className="f-label" htmlFor="e-h">Height (decimal inches)</label>
          <input id="e-h" className="field mono" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="f-label" htmlFor="e-th">Thickness</label>
          <select id="e-th" className="field" value={thickness}
            onChange={(e) => {
              setThickness(e.target.value);
              const cols = colorsForThickness(type, e.target.value);
              if (!cols.some(([k]) => k === color) && cols.length > 0) setColor(cols[0][0]);
            }}>
            {thickOptions.map((th) => <option key={th} value={th}>{th}</option>)}
          </select>
        </div>
        <div>
          <label className="f-label" htmlFor="e-c">Color</label>
          <select id="e-c" className="field" value={color} onChange={(e) => setColor(e.target.value)}>
            {colorKeys.map((k) => <option key={k} value={k}>{colorName(k)}</option>)}
          </select>
        </div>
        <div>
          <label className="f-label" htmlFor="e-p">Payment Method</label>
          <select id="e-p" className="field" value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
            {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
            ))}
          </select>
        </div>
      </div>
      <label className="f-label">Additional Services</label>
      <div className="grid c2" style={{ gap: 8, marginBottom: 18 }}>
        {(
          [
            ['beveling', 'Beveling'],
            ['diamonfusion', 'Diamon-Fusion®'],
            ['edgerounding', 'Edge Rounding'],
            ['sandblasting', 'Sandblasting'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className={`checkrow${adds[key] ? ' on' : ''}`}>
            <input type="checkbox" checked={adds[key]}
              onChange={(e) => setAdds({ ...adds, [key]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        <button className="btn" style={{ flex: 1 }} onClick={save}>Save Changes</button>
      </div>
    </Modal>
  );
}

// Unused catalog thicknesses list retained for parity with the v0.5 edit form.
void THICK_ORDER;
