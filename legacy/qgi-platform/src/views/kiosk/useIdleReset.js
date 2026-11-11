import { useEffect } from 'react';
import { useKiosk } from './KioskContext';

// Reset the kiosk to step 0 after 2 minutes of inactivity (kiosk frees itself).
export function useIdleReset(ms = 120000) {
  const { setStep } = useKiosk();
  useEffect(() => {
    let timer = null;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setStep(0);
        window.location.reload();
      }, ms);
    };
    const events = ['mousemove', 'touchstart', 'keydown', 'click'];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [ms, setStep]);
}
