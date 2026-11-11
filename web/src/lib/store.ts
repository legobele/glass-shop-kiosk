// Local-first order store shared by all three surfaces.
// The originals talked to a laptop server and persisted NOTHING in the
// browser; this rebuild keeps one store in localStorage so an order placed
// at the kiosk shows up in admin and the portal immediately, and syncs
// across tabs via the storage event.

import { useSyncExternalStore } from 'react';
import type { ActivityEntry, Order } from './types';
import { emptyAdditions, generateOrderId } from './types';

const ORDERS_KEY = 'qgi.orders.v1';
const ACTIVITY_KEY = 'qgi.activity.v1';

interface State {
  orders: Order[];
  activity: ActivityEntry[];
}

function seedOrder(): Order {
  // The one historical order from the v0.5 screenshots, so the portal
  // demo works out of the box: QG1HZLVYSG, 36 x 72.5, Gray, 3/8",
  // tempered, Credit/Debit Card, Pending, 2/11/2026.
  return {
    orderId: 'QG1HZLVYSG',
    timestamp: '2026-02-11T10:56:11.000Z',
    customerName: '',
    projectName: '',
    contact: null,
    dimensions: { width: 36, height: 72.5 },
    specifications: {
      glassType: 'tempered',
      color: 'gray',
      thickness: '3/8"',
      additions: emptyAdditions(),
      isFullLite: false,
      lang: 'en',
    },
    payment: { method: 'credit-debit' },
    status: 'pending',
    changePIN: null,
  };
}

function seedState(): State {
  const order = seedOrder();
  return {
    orders: [order],
    activity: [
      {
        id: 'seed-1',
        timestamp: order.timestamp,
        actor: 'kiosk',
        action: 'order_placed',
        orderId: order.orderId,
        detail: 'Order placed at kiosk (seed record from v0.5).',
      },
    ],
  };
}

function load(): State {
  try {
    const rawOrders = localStorage.getItem(ORDERS_KEY);
    const rawActivity = localStorage.getItem(ACTIVITY_KEY);
    if (rawOrders == null) {
      const seeded = seedState();
      persist(seeded);
      return seeded;
    }
    return {
      orders: JSON.parse(rawOrders) as Order[],
      activity: rawActivity ? (JSON.parse(rawActivity) as ActivityEntry[]) : [],
    };
  } catch {
    return seedState();
  }
}

function persist(state: State) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(state.orders));
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(state.activity));
  } catch {
    // storage full or unavailable: the in-memory state still works
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function emit() {
  persist(state);
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === ORDERS_KEY || e.key === ACTIVITY_KEY) {
      state = load();
      listeners.forEach((fn) => fn());
    }
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getSnapshot(): State {
  return state;
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function logActivity(
  actor: ActivityEntry['actor'],
  action: string,
  orderId: string | null,
  detail: string,
) {
  const entry: ActivityEntry = {
    id: generateOrderId() + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actor,
    action,
    orderId,
    detail,
  };
  state = { ...state, activity: [entry, ...state.activity] };
  emit();
}

export function addOrder(order: Order) {
  state = { ...state, orders: [order, ...state.orders] };
  emit();
  logActivity('kiosk', 'order_placed', order.orderId, 'Order placed at kiosk.');
}

export function updateOrder(orderId: string, patch: Partial<Order>) {
  state = {
    ...state,
    orders: state.orders.map((o) =>
      o.orderId === orderId ? { ...o, ...patch } : o,
    ),
  };
  emit();
}

export function removeOrder(orderId: string) {
  state = { ...state, orders: state.orders.filter((o) => o.orderId !== orderId) };
  emit();
}

export function getOrder(orderId: string): Order | undefined {
  return state.orders.find(
    (o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase(),
  );
}

/** Plain-text activity log, same spirit as the old /api/activity/download. */
export function activityLogText(): string {
  const lines = state.activity
    .slice()
    .reverse()
    .map(
      (e) =>
        `[${e.timestamp}] (${e.actor}) ${e.action}` +
        (e.orderId ? ` order=${e.orderId}` : '') +
        (e.detail ? ` - ${e.detail}` : ''),
    );
  return ['QGI Activity Log', `Exported: ${new Date().toISOString()}`, '', ...lines].join('\n');
}
