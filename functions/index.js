// QGI Platform — Cloud Functions (Firebase)
// No pricing engine — price is counter-negotiated by design.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

const app = initializeApp({ credential: applicationDefault() });
const db = getFirestore(app);

const ROLES = ['admin', 'staff', 'installer', 'customer'];
const VALID_STATUSES = ['pending', 'in-progress', 'ready', 'completed', 'cancelled'];

// ── helpers ───────────────────────────────────────────────
function genOrderId() {
  // QG + 8 chars from unambiguous alphabet (no 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'QG';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genPin() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}
async function getRole(uid) {
  if (!uid) return null;
  const snap = await db.doc(`users/${uid}`).get();
  return snap.exists ? snap.data().role : null;
}
function assertAdmin(role) {
  if (role !== 'admin') throw new HttpsError('permission-denied', 'Admin role required.');
}
function assertStaff(role) {
  if (!['admin', 'staff'].includes(role)) throw new HttpsError('permission-denied', 'Staff role required.');
}

// ── orders ────────────────────────────────────────────────
// placeOrder — public, kiosk. No login needed.
exports.placeOrder = onCall(async (req) => {
  const d = req.data || {};
  const name = String(d.customerName || '').trim();
  const projectName = String(d.projectName || '').trim();
  const glassType = String(d.glassType || '');
  const width = Number(d.width);
  const height = Number(d.height);
  const thickness = String(d.thickness || '');
  const color = String(d.color || '');
  const payment = String(d.payment || '');
  const additions = Array.isArray(d.additions) ? d.additions : [];
  const contact = d.contact || {};

  if (!name) throw new HttpsError('invalid-argument', 'Customer name is required.');
  if (!glassType) throw new HttpsError('invalid-argument', 'Glass type is required.');
  if (!(width > 0) || !(height > 0)) throw new HttpsError('invalid-argument', 'Valid dimensions are required.');
  if (!thickness) throw new HttpsError('invalid-argument', 'Thickness is required.');
  if (!color) throw new HttpsError('invalid-argument', 'Color is required.');

  const orderId = genOrderId();
  const changePIN = genPin();

  // if logged-in customer, link their uid
  const customerId = req.auth ? req.auth.uid : null;

  const order = {
    orderId,
    status: 'pending',
    customerName: name,
    projectName,
    contact: {
      tab: contact.tab || 'none',
      phone: contact.phone || '',
      email: contact.email || '',
      extension: contact.extension || '',
      type: contact.type || 'personal',
    },
    glassType,
    color,
    thickness,
    width,
    height,
    additions,
    payment,
    isFullLite: !!d.isFullLite,
    lang: String(d.lang || 'en'),
    changePIN,
    customerId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.doc(`orders/${orderId}`).set(order);
  return { orderId, changePIN };
});

// getOrder — public by Order ID. Returns safe public fields (no changePIN).
exports.getOrder = onCall(async (req) => {
  const id = String((req.data && req.data.orderId) || '').trim().toUpperCase();
  if (!id) throw new HttpsError('invalid-argument', 'Order ID required.');
  const snap = await db.doc(`orders/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
  const o = snap.data();
  return {
    orderId: o.orderId,
    status: o.status,
    customerName: o.customerName,
    projectName: o.projectName,
    glassType: o.glassType,
    color: o.color,
    thickness: o.thickness,
    width: o.width,
    height: o.height,
    additions: o.additions || [],
    payment: o.payment,
    isFullLite: o.isFullLite,
    lang: o.lang,
    createdAt: o.createdAt ? o.createdAt.toDate().toISOString() : null,
    updatedAt: o.updatedAt ? o.updatedAt.toDate().toISOString() : null,
  };
});

// editOrder — PIN-gated (customer-facing). Also allows staff.
exports.editOrder = onCall(async (req) => {
  const d = req.data || {};
  const id = String(d.orderId || '').trim().toUpperCase();
  if (!id) throw new HttpsError('invalid-argument', 'Order ID required.');

  const snap = await db.doc(`orders/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found.');
  const existing = snap.data();

  const role = await getRole(req.auth && req.auth.uid);
  const isStaffMember = ['admin', 'staff'].includes(role);
  const isOwner = req.auth && existing.customerId === req.auth.uid;

  // staff bypasses PIN; otherwise require matching changePIN
  if (!isStaffMember && !isOwner) {
    const pin = String(d.changePIN || '').trim();
    if (!pin || pin !== existing.changePIN) {
      throw new HttpsError('permission-denied', 'Invalid change PIN.');
    }
  }

  const patch = {};
  if (d.status) {
    if (!VALID_STATUSES.includes(d.status)) throw new HttpsError('invalid-argument', 'Invalid status.');
    patch.status = d.status;
  }
  if (d.customerName !== undefined) {
    const n = String(d.customerName || '').trim();
    if (!n) throw new HttpsError('invalid-argument', 'Name required.');
    patch.customerName = n;
  }
  if (d.projectName !== undefined) patch.projectName = String(d.projectName || '').trim();
  if (d.contact !== undefined) patch.contact = d.contact;
  if (d.glassType !== undefined) patch.glassType = String(d.glassType);
  if (d.color !== undefined) patch.color = String(d.color);
  if (d.thickness !== undefined) patch.thickness = String(d.thickness);
  if (d.width !== undefined) patch.width = Number(d.width);
  if (d.height !== undefined) patch.height = Number(d.height);
  if (d.additions !== undefined) patch.additions = d.additions;
  if (d.payment !== undefined) patch.payment = String(d.payment);

  patch.updatedAt = FieldValue.serverTimestamp();

  await db.doc(`orders/${id}`).update(patch);
  return { success: true, orderId: id };
});

// updateOrderStatus — staff only.
exports.updateOrderStatus = onCall(async (req) => {
  const d = req.data || {};
  const role = await getRole(req.auth && req.auth.uid);
  assertStaff(role);
  const id = String(d.orderId || '').trim().toUpperCase();
  const status = String(d.status || '');
  if (!id) throw new HttpsError('invalid-argument', 'Order ID required.');
  if (!VALID_STATUSES.includes(status)) throw new HttpsError('invalid-argument', 'Invalid status.');
  await db.doc(`orders/${id}`).update({ status, updatedAt: FieldValue.serverTimestamp() });
  return { success: true, orderId: id, status };
});

// deleteOrder — staff only.
exports.deleteOrder = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertStaff(role);
  const id = String((req.data && req.data.orderId) || '').trim().toUpperCase();
  if (!id) throw new HttpsError('invalid-argument', 'Order ID required.');
  await db.doc(`orders/${id}`).delete();
  return { success: true };
});

// getStats — staff only.
exports.getStats = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertStaff(role);
  const snap = await db.collection('orders').get();
  let total = 0;
  const byStatus = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayCount = 0;
  snap.forEach((doc) => {
    const o = doc.data();
    total++;
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (o.createdAt && o.createdAt.toDate() >= today) todayCount++;
  });
  return { total, byStatus, todayCount };
});

// ── user management ───────────────────────────────────────
// createUser — admin only. Creates Firebase Auth user + Firestore user doc.
exports.createUser = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertAdmin(role);
  const d = req.data || {};
  const email = String(d.email || '').trim().toLowerCase();
  const password = String(d.password || '');
  const displayName = String(d.displayName || '').trim();
  const userRole = String(d.role || 'staff');
  if (!email || !password) throw new HttpsError('invalid-argument', 'Email and password required.');
  if (!ROLES.includes(userRole)) throw new HttpsError('invalid-argument', 'Invalid role.');
  if (password.length < 6) throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  const user = await getAuth().createUser({ email, password, displayName });
  await db.doc(`users/${user.uid}`).set({
    email,
    displayName,
    role: userRole,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { uid: user.uid, email, displayName, role: userRole };
});

// setRole — admin only.
exports.setRole = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertAdmin(role);
  const d = req.data || {};
  const uid = String(d.uid || '');
  const newRole = String(d.role || '');
  if (!uid) throw new HttpsError('invalid-argument', 'User ID required.');
  if (!ROLES.includes(newRole)) throw new HttpsError('invalid-argument', 'Invalid role.');
  await db.doc(`users/${uid}`).update({ role: newRole });
  return { success: true };
});

// ── bootstrapAdmin ────────────────────────────────────────
// Creates the FIRST admin from the caller's auth account (idempotent).
exports.bootstrapAdmin = onCall(async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const snap = await db.doc(`users/${uid}`).get();
  if (snap.exists) throw new HttpsError('already-exists', 'User already exists.');
  // Only allow this if NO admin exists yet (first-run safety).
  const admins = await db.collection('users').where('role', '==', 'admin').limit(1).get();
  if (!admins.empty) throw new HttpsError('permission-denied', 'An admin already exists.');
  await db.doc(`users/${uid}`).set({
    email: req.auth.token.email || '',
    displayName: req.auth.token.name || 'Admin',
    role: 'admin',
    createdAt: FieldValue.serverTimestamp(),
  });
  return { success: true, role: 'admin' };
});

// ── seedCatalog ───────────────────────────────────────────
// Admin only. Seeds the default glass catalog into Firestore.
const DEFAULT_CATALOG = {
  float: {
    clear: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
    gray: ['1/4"', '3/8"', '1/2"'],
    bronze: ['1/8"', '1/4"', '3/8"', '1/2"'],
    'blue-green': ['1/4"', '3/8"'],
    'arctic-blue': ['3/8"'],
    'mirror-clear': ['1/8"', '1/4"'],
    'mirror-clear-back': ['1/8"'],
    'mirror-bronze': ['1/4"'],
    'mirror-antique': ['1/4"'],
    'cianite-clear': ['3/16"'],
    'cianite-bronze': ['1/4"'],
    rain: ['3/8"'],
    'barb-wire': ['1/4"'],
    'acid-etch': ['3/8"', '1/2"'],
    'white-lac': ['1/4"'],
    'black-lac': ['1/4"'],
    'optic-white': ['1/8"'],
    'low-e': ['1/4"', '3/8"', '1/2"'],
  },
  tempered: {
    clear: ['1/8"', '5/32"', '3/16"', '1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    'ultra-clear': ['1/4"', '3/8"', '1/2"'],
    gray: ['1/4"', '3/8"', '1/2"'],
    bronze: ['1/8"', '1/4"', '3/8"', '1/2"'],
    'blue-green': ['1/4"', '3/8"'],
    'arctic-blue': ['3/8"'],
    'cianite-clear': ['3/16"'],
    'cianite-bronze': ['1/4"'],
    rain: ['3/8"'],
    'acid-etch': ['3/8"', '1/2"'],
    'low-e': ['1/4"', '3/8"', '1/2"'],
  },
  'ultra-clear-float': { 'ultra-clear': ['1/4"', '3/8"', '1/2"'] },
  'ultra-clear-tempered': { 'ultra-clear': ['1/4"', '3/8"', '1/2"'] },
  laminated: {
    clear: ['1/4"', '5/16"', '3/8"', '1/2"', '5/8"', '3/4"'],
    gray: ['1/4"'],
    bronze: ['1/4"'],
    'blue-green': ['1/4"'],
    'white-lac': ['1/4"'],
  },
};

exports.seedCatalog = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertAdmin(role);
  const batch = db.batch();
  Object.entries(DEFAULT_CATALOG).forEach(([type, colors]) => {
    batch.set(db.doc(`catalog/${type}`), { colors });
  });
  await batch.commit();
  return { success: true };
});

// seedTestOrders — admin only, dev convenience.
exports.seedTestOrders = onCall(async (req) => {
  const role = await getRole(req.auth && req.auth.uid);
  assertAdmin(role);
  const samples = [
    {
      status: 'pending',
      customerName: 'Ana Torres',
      projectName: 'Bathroom window',
      glassType: 'float',
      color: 'clear',
      thickness: '1/4"',
      width: 36,
      height: 72,
      additions: ['tempering'],
      payment: 'cash',
      isFullLite: false,
      lang: 'es',
      contact: { tab: 'phone', phone: '(787) 555-0101', email: '', extension: '', type: 'personal' },
    },
    {
      status: 'in-progress',
      customerName: 'John Smith',
      projectName: 'Kitchen table',
      glassType: 'tempered',
      color: 'bronze',
      thickness: '3/8"',
      width: 48,
      height: 96,
      additions: ['diamond-fusion', 'edgerounding:radius=1/4"'],
      payment: 'credit-debit',
      isFullLite: false,
      lang: 'en',
      contact: { tab: 'email', phone: '', email: 'john@example.com', extension: '', type: 'personal' },
    },
    {
      status: 'ready',
      customerName: 'María López',
      projectName: 'Storefront',
      glassType: 'laminated',
      color: 'clear',
      thickness: '1/2"',
      width: 130,
      height: 96,
      additions: [],
      payment: 'apple-google-ath',
      isFullLite: true,
      lang: 'es',
      contact: { tab: 'both', phone: '(787) 555-0142', email: 'maria@example.com', extension: '102', type: 'office' },
    },
  ];
  const batch = db.batch();
  samples.forEach((s) => {
    const id = genOrderId();
    batch.set(db.doc(`orders/${id}`), {
      ...s,
      orderId: id,
      changePIN: genPin(),
      customerId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return { success: true, count: samples.length };
});
