// Central permission framework — role → permission matrix.
// UI uses `can(role, perm)` for what to show/enable; the REAL enforcement
// lives in firestore.rules and Cloud Functions (client checks are UX only).

export const ROLES = ['admin', 'staff', 'installer', 'customer'];

// '*' = everything
const MATRIX = {
  admin: ['*'],
  staff: [
    'orders:read',
    'orders:create',
    'orders:update', // status transitions + edits
    'jobs:read',
    'jobs:write', // add / edit / delete jobs
    'jobs:update', // change job status
    'catalog:read',
    'settings:read',
  ],
  installer: [
    'orders:read',
    'jobs:read',
    'jobs:update', // mark jobs in-progress / completed
  ],
  customer: ['orders:read'],
};

// Public (no login) capabilities — enforced server-side.
export const PUBLIC_PERMISSIONS = ['orders:create'];

export function can(role, perm) {
  if (!role) return false;
  const perms = MATRIX[role];
  return !!perms && (perms.includes('*') || perms.includes(perm));
}

export function canAny(role, perms) {
  return perms.some((p) => can(role, p));
}

export function permsFor(role) {
  if (!role) return [];
  const perms = MATRIX[role];
  return perms && perms.includes('*') ? ['*'] : perms || [];
}
