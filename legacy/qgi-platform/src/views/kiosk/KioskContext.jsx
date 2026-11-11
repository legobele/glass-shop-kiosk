import { createContext, useContext, useState } from 'react';

const KioskCtx = createContext(null);

// Kiosk order state — shared across all steps.
export function KioskProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [step, setStep] = useState(0);
  const [order, setOrder] = useState({
    customerName: '',
    projectName: '',
    contact: { tab: 'phone', phone: '', email: '', extension: '', type: 'personal' },
    baseType: null, // 'float' | 'laminated'
    isTempered: false,
    isUltraClear: false,
    glassType: null,
    width: null,
    height: null,
    thickness: null,
    color: null,
    additions: {
      beveling: { active: false, angle: 15, sides: { e1: true, e2: true, e3: true, e4: true } },
      diamonfusion: { active: false },
      edgerounding: { active: false, radius: 0, edges: { e1: true, e2: true, e3: true, e4: true }, corners: { c1: true, c2: true, c3: true, c4: true } },
      sandblasting: { active: false },
    },
    paymentMethod: null,
    isFullLite: false,
    result: null, // { orderId, changePIN } after submit
  });

  const set = (patch) => setOrder((o) => ({ ...o, ...patch }));

  return (
    <KioskCtx.Provider value={{ lang, setLang, step, setStep, order, set }}>
      {children}
    </KioskCtx.Provider>
  );
}

export function useKiosk() {
  return useContext(KioskCtx);
}
