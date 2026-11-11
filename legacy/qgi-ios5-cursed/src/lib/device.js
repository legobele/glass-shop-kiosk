// Device detection — kiosk is in-shop only; block mobile-like bullshittery on prod.
export function isMobileLike() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints > 0;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk/i.test(ua);
  // iPadOS reports as Mac but has touch + tablet UA
  return mobileUa && touch;
}

export function isProd() {
  return import.meta.env.PROD;
}
