# Pricing architecture (decision needed before real prices go live)

## What the app does today
- The customer kiosk shows dashes (`—`) for subtotal, total and tax. No rates ship in the bundle and none are hard-coded.
- Admin can save an optional pricing config (per-type rate per sq ft, tax %). It is stored in this browser's `localStorage` (`qgi.pricing.v1`). If it is empty or incomplete, the kiosk stays on dashes.

## What this does NOT protect
The kiosk and the Admin page run in the same browser, from the same origin and storage. So a rate saved in Admin is readable by the kiosk code and by anyone with devtools on that device. It is a local display convenience, not a secret. Do not describe it as secure. Do not enter real rates on a customer-facing kiosk device.

## What a secure version needs
1. A server endpoint (for example `POST /api/quote`) that takes type, thickness, color, dimensions, quantity and additions, and returns only the computed subtotal, tax and total.
2. Rates and tax stored server-side only, edited through an authenticated staff route (Admin), never sent to the customer bundle or any customer-reachable response.
3. The kiosk calls the quote endpoint (no staff credentials) and renders the returned strings. `computeVfd` is then replaced by that call.
4. Rate-limit the quote endpoint. It still reveals prices for inputs, which is the intent.

## Decision needed from Benj (nothing assumed)
- Where this runs: which host/service for a small authenticated API and a rates store (this repo is a static Vite app with no backend), and who holds the credentials for it.
- Who may edit rates (staff login method).
- Until then: keep the kiosk on dashes. Rates, tax rules and limits are the business's to supply. None are invented here.
