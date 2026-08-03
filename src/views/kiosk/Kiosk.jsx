import { KioskProvider, useKiosk } from './KioskContext';
import LangStep from './steps/LangStep';
import CustomerStep from './steps/CustomerStep';
import TypeStep from './steps/TypeStep';
import SizeStep from './steps/SizeStep';
import ThickStep from './steps/ThickStep';
import ColorStep from './steps/ColorStep';
import AdditionsStep from './steps/AdditionsStep';
import PaymentStep from './steps/PaymentStep';
import ReviewStep from './steps/ReviewStep';
import SuccessStep from './steps/SuccessStep';
import { useIdleReset } from './useIdleReset';
import { isMobileLike, isProd } from '../../lib/device';

const STEPS = [
  { id: 'lang', el: LangStep },
  { id: 'customer', el: CustomerStep },
  { id: 'type', el: TypeStep },
  { id: 'size', el: SizeStep },
  { id: 'thick', el: ThickStep },
  { id: 'color', el: ColorStep },
  { id: 'add', el: AdditionsStep },
  { id: 'pay', el: PaymentStep },
  { id: 'review', el: ReviewStep },
  { id: 'success', el: SuccessStep },
];

function KioskInner() {
  const { step } = useKiosk();
  useIdleReset();
  const blocked = isProd() && isMobileLike();

  if (blocked) {
    return (
      <div className="page" style={{ placeItems: 'center', display: 'grid', padding: 24, textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: 420, padding: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📵</div>
          <h2 className="page-title">Mobile device detected</h2>
          <p className="page-sub">The kiosk is intended for in-shop use. Please use a tablet or desktop to place your order, or ask a sales representative for help.</p>
        </div>
      </div>
    );
  }

  const Current = STEPS[step].el;
  return (
    <div className="page" style={{ padding: 0 }}>
      <Current />
    </div>
  );
}

export default function Kiosk() {
  return (
    <KioskProvider>
      <KioskInner />
    </KioskProvider>
  );
}
