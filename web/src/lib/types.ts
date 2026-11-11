// Shared data model for the QGI system (kiosk + admin + portal).
// Field names deliberately follow the original v0.5/v1.x payload shape
// (orderId, timestamp, dimensions, specifications, payment, changePIN)
// so this store stays a drop-in for the old server contract.

export type Lang = 'en' | 'es';

export type GlassTypeKey =
  | 'float'
  | 'tempered'
  | 'ultra-clear-float'
  | 'ultra-clear-tempered'
  | 'laminated';

export type PaymentMethod = 'cash' | 'credit-debit' | 'apple-google-ath';

export type OrderStatus =
  | 'pending'
  | 'in-progress'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface BevelingSpec {
  active: boolean;
  angle: number; // degrees, 5..45
  sides: { e1: boolean; e2: boolean; e3: boolean; e4: boolean };
}

export interface EdgeRoundingSpec {
  active: boolean;
  radius: number; // decimal inches, fraction of 1/16 up to 1/2
  edges: { e1: boolean; e2: boolean; e3: boolean; e4: boolean };
  corners: { c1: boolean; c2: boolean; c3: boolean; c4: boolean };
}

export interface Additions {
  beveling: BevelingSpec;
  diamonfusion: { active: boolean };
  edgerounding: EdgeRoundingSpec;
  sandblasting: { active: boolean };
}

export interface ContactInfo {
  tab: 'phone' | 'email' | 'both' | 'none';
  phone: string;
  email: string;
  type: 'personal' | 'office' | 'company' | 'other';
  extension: string;
}

export interface Order {
  orderId: string;
  timestamp: string; // ISO
  customerName: string;
  projectName: string;
  contact: ContactInfo | null;
  dimensions: { width: number; height: number }; // decimal inches
  specifications: {
    glassType: GlassTypeKey;
    color: string; // catalog color key
    thickness: string; // e.g. '3/8"'
    additions: Additions;
    isFullLite: boolean;
    lang: Lang;
  };
  payment: { method: PaymentMethod };
  status: OrderStatus;
  changePIN: string | null;
}

export type ActivityActor = 'kiosk' | 'admin' | 'portal';

export interface ActivityEntry {
  id: string;
  timestamp: string; // ISO
  actor: ActivityActor;
  action: string;
  orderId: string | null;
  detail: string;
}

export function emptyAdditions(): Additions {
  return {
    beveling: {
      active: false,
      angle: 15,
      sides: { e1: true, e2: true, e3: true, e4: true },
    },
    diamonfusion: { active: false },
    edgerounding: {
      active: false,
      radius: 0,
      edges: { e1: true, e2: true, e3: true, e4: true },
      corners: { c1: true, c2: true, c3: true, c4: true },
    },
    sandblasting: { active: false },
  };
}

/** 'QG' + 8 uppercase base36 chars, e.g. QG1HZLVYSG (original format). */
export function generateOrderId(): string {
  return (
    'QG' +
    Math.random().toString(36).substring(2, 10).toUpperCase().padEnd(8, '0')
  );
}

export function generateChangePIN(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
