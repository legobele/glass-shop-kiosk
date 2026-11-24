import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Order } from '../lib/types';
import { generateChangePIN } from '../lib/types';
import { toFracStr } from '../lib/frac';
import {
  PAYMENT_LABEL,
  additionLabels,
  colorName,
  formatDateTime,
  typeName,
} from '../lib/format';
import { logActivity, updateOrder, useStore } from '../lib/store';
import { Modal, StatusBadge } from '../components/ui';
import { STATUS_LABEL } from '../lib/format';
import { thickValue } from '../lib/catalog';
import { GlassViewer, type GlassSpec } from '../kiosk/stage/Glass';

const FLOW = ['pending', 'in-progress', 'ready', 'completed'] as const;

function orderSpec(o: Order): GlassSpec {
  const gt = o.specifications.glassType;
  const er = o.specifications.additions.edgerounding;
  return {
    w: o.dimensions.width,
    h: o.dimensions.height,
    t: thickValue(o.specifications.thickness),
    edge: o.specifications.additions.beveling.active ? 'bevel' : 'pencil',
    filo: !!o.specifications.additions.filomatado?.active,
    sand: o.specifications.additions.sandblasting.active ? 1 : 0,
    kind: gt === 'laminated' ? 'lam' : gt === 'tempered' || gt === 'ultra-clear-tempered' ? 'temp' : 'clear',
    temper: 0,
    ultra: gt.startsWith('ultra') || o.specifications.color === 'ultra-clear',
    color: o.specifications.color || 'clear',
    labelW: toFracStr(o.dimensions.width),
    labelH: toFracStr(o.dimensions.height),
    labelT: o.specifications.thickness,
    erCorners: er.active && er.radius > 0 ? [
      er.corners.c1 || er.edges.e1 || er.edges.e2 ? er.radius : 0,
      er.corners.c2 || er.edges.e2 || er.edges.e3 ? er.radius : 0,
      er.corners.c3 || er.edges.e3 || er.edges.e4 ? er.radius : 0,
      er.corners.c4 || er.edges.e4 || er.edges.e1 ? er.radius : 0,
    ] : undefined,
  };
}

const GL_LABELS = { drag: 'Drag to rotate', hold: 'Hold to break', unbreak: 'Hold to restore', noGl: '3D unavailable', note: '', dims: '', brokeNote: '', furnace: '', quench: '', tempNote: '' };

export default function Portal() {
  const { orders } = useStore();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [searched, setSearched] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pinOrder, setPinOrder] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const order: Order | null =
    searched != null
      ? orders.find((o) => o.orderId.toUpperCase() === searched.toUpperCase()) ?? null
      : null;

  function track(id: string) {
    const q = id.trim().toUpperCase();
    if (!q) return;
    setSearched(q);
    setNotFound(!orders.some((o) => o.orderId.toUpperCase() === q));
  }

  useEffect(() => {
    const param = searchParams.get('order');
    if (param) {
      setInput(param.toUpperCase());
      track(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function requestChange(o: Order) {
    if (!o.changePIN) {
      const pin = generateChangePIN();
      updateOrder(o.orderId, { changePIN: pin });
      logActivity('portal', 'pin_generated', o.orderId, 'Customer generated a change PIN.');
      setPinOrder({ ...o, changePIN: pin });
    } else {
      setPinOrder(o);
    }
  }

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  }

  const adds = order ? additionLabels(order.specifications.additions) : [];

  return (
    <div className={`wrap narrow${!order ? ' portal-empty' : ''}`}>
      <div className="hud" style={{ marginBottom: 8 }}>Quality Glass · Customer Portal</div>
      <h1 className="page-title">Track Your Order</h1>
      <p className="sub" style={{ marginTop: 8 }}>
        Enter the Order ID from the kiosk to see where your glass is.
      </p>

      <form
        style={{ display: 'flex', gap: 10, margin: '24px 0' }}
        onSubmit={(e) => {
          e.preventDefault();
          track(input);
        }}
      >
        <input className="field mono" placeholder="Order ID (e.g. QG1HZLVYSG)"
          value={input} onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, textTransform: 'uppercase' }} aria-label="Order ID" />
        <button className="btn" type="submit">Track Order</button>
      </form>

      {notFound && searched && !order && (
        <div className="err-box">
          Order <b className="mono">{searched}</b> was not found. Check the ID and try again.
        </div>
      )}

      {order && (
        <article className="order-card">
          <div className="order-head">
            <div>
              <div className="oid">{order.orderId}</div>
              <div className="ots">{formatDateTime(order.timestamp)}</div>
            </div>
            <StatusBadge status={order.status} />
            <span className="spacer" />
            <button className="btn ghost sm" onClick={refresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh Status'}
            </button>
          </div>

          <div className="portal-glass">
            <GlassViewer spec={orderSpec(order)} reduced={false} labels={GL_LABELS} />
          </div>

          {order.status === 'cancelled' ? (
            <div className="note warn" style={{ margin: '14px 0' }}>This order was cancelled. Contact the sales team with any questions.</div>
          ) : (
            <div className="portal-flow">
              {FLOW.map((s) => {
                const cur = FLOW.indexOf(order.status as (typeof FLOW)[number]);
                const i = FLOW.indexOf(s);
                return (
                  <div key={s} className={`pf-step${i < cur ? ' done' : ''}${i === cur ? ' now' : ''}`}>
                    <span className="pf-dot" />
                    <span className="pf-label">{STATUS_LABEL[s]}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="kv2">
            <div><div className="k">Customer</div><div className="v">{order.customerName || 'Walk-in'}</div></div>
            <div><div className="k">Project</div><div className="v">{order.projectName || 'Not specified'}</div></div>
            <div><div className="k">Payment Method</div><div className="v">{PAYMENT_LABEL[order.payment.method]}</div></div>
            <div><div className="k">Dimensions</div><div className="v mono">{toFracStr(order.dimensions.width)} × {toFracStr(order.dimensions.height)}</div></div>
            <div><div className="k">Glass Type</div><div className="v">{typeName(order)}</div></div>
            <div><div className="k">Color</div><div className="v">{colorName(order.specifications.color)}</div></div>
            <div><div className="k">Thickness</div><div className="v mono">{order.specifications.thickness}</div></div>
            <div><div className="k">Full Lite</div><div className="v">{order.specifications.isFullLite ? 'Yes' : 'No'}</div></div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontFamily: 'var(--mono-font)', fontSize: '.62rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: 5 }}>
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

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => requestChange(order)}>Request Order Change</button>
            <Link className="btn ghost" to="/">Place New Order</Link>
          </div>
        </article>
      )}

      <Modal open={pinOrder != null} title="Your Change PIN"
        sub="Keep this PIN safe. You need it to approve any change to your order."
        onClose={() => setPinOrder(null)}>
        <div className="pin-big">{pinOrder?.changePIN}</div>
        <ol className="steps">
          <li><b>Next steps:</b></li>
          <li>Contact the sales team or visit the shop.</li>
          <li>Tell them what you want to change.</li>
          <li>Give them this PIN when they ask for it.</li>
          <li><b>The sales team CANNOT change your order without this PIN.</b></li>
        </ol>
        <button className="btn block" style={{ marginTop: 20 }} onClick={() => setPinOrder(null)}>
          Done
        </button>
      </Modal>
    </div>
  );
}
