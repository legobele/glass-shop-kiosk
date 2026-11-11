/* QGI kiosk smoke suite — recreated for the 1.3.1 restyle verification.
 * 29 checks across the three surfaces: kiosk EN flow, admin, portal + PIN
 * lifecycle, Spanish flow, device-handoff mode, continue-here prefill.
 * Usage: npm run build && node tests/smoke.mjs
 * Env: CHROME_BIN overrides the Chromium executable. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.error('dist/ missing — run `npm run build` first.');
  process.exit(2);
}

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore',
});
async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

const CHROME = process.env.CHROME_BIN
  || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux/chrome`;
const PIN_ERROR = 'Invalid PIN. Customer must generate a change PIN from the customer portal.';

async function main() {
  await waitServer();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const active = (sel, opts) => page.locator(`section.slide.active ${sel}`, opts);
  const footBtn = () => active('.slide-foot .btn').first();

  /* ---------- kiosk: EN order flow ---------- */
  await page.goto(BASE + '/');
  await page.waitForSelector('.lang-card');
  check('01 lang slide renders both language cards',
    (await page.locator('.lang-card').count()) === 2);

  await page.locator('.lang-card', { hasText: 'English' }).click();
  await page.fill('#k-name', 'Smoke Tester');
  check('02 continue enables once a customer name is entered',
    await footBtn().isEnabled());
  await footBtn().click();

  const tempSwitch = active('.switch input').first();
  check('03 tempered switch is disabled before Float is picked',
    await tempSwitch.isDisabled());
  await active('.opt-card', { hasText: 'Float Glass' }).click();
  check('04 picking Float enables the tempered switch',
    await tempSwitch.isEnabled());
  await active('.switch .track').first().click();
  check('05 resolved type readout shows Tempered',
    (await active('.card .hud').innerText()).toUpperCase().includes('TEMPERED'));
  await footBtn().click();

  await active('.size-field').first().click();
  await page.locator('.np-key', { hasText: /^3$/ }).click();
  await page.locator('.np-key', { hasText: /^6$/ }).click();
  await page.locator('.frac-grid button', { hasText: '1/2"' }).click();
  const npShows = (await page.locator('.np-display').innerText()).includes('36 1/2');
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  check('06 numpad entry: display composes 36 1/2 and the width field keeps it',
    npShows && (await active('.size-field .sf-val').first().innerText()).includes('36 1/2'));
  await active('.size-field').nth(1).click();
  await page.locator('.np-key', { hasText: /^7$/ }).click();
  await page.locator('.np-key', { hasText: /^2$/ }).click();
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  check('07 height field shows 72 after Done',
    (await active('.size-field .sf-val').nth(1).innerText()).includes('72'));
  await footBtn().click();

  const thickCard = active('.opt-card', { hasText: '3/8"' }).first();
  await thickCard.click();
  check('08 thickness 3/8 card selects',
    (await thickCard.getAttribute('aria-pressed')) === 'true');
  await footBtn().click();

  const colorCard = active('.opt-card', { hasText: 'Gray' }).first();
  await colorCard.click();
  check('09 color Gray selects',
    (await colorCard.getAttribute('aria-pressed')) === 'true');
  await footBtn().click();

  await active('.add-head').first().click();
  check('10 beveling opens with its SVG cross-section diagram',
    await active('.add-card.sel .diagram-box svg').isVisible());
  await footBtn().click();

  const payCard = active('.opt-card', { hasText: 'Credit / Debit Card' }).first();
  await payCard.click();
  check('11 payment Credit / Debit Card selects',
    (await payCard.getAttribute('aria-pressed')) === 'true');
  await footBtn().click();

  const reviewText = await active('.slide-inner').innerText();
  check('12 review shows dimensions 36 1/2 x 72',
    reviewText.includes('36 1/2') && reviewText.includes('72'));
  check('13 review shows Tempered, Gray, Credit / Debit Card',
    reviewText.includes('Tempered') && reviewText.includes('Gray') && reviewText.includes('Credit / Debit Card'));

  await active('.btn', { hasText: 'Place Order' }).click();
  await page.waitForSelector('.oid-box', { timeout: 8000 });
  const placedId = (await page.locator('.oid-box').innerText()).trim();
  check('14 success slide shows a QG + 8 base36 order ID',
    /^QG[A-Z0-9]{8}$/.test(placedId));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('qgi.orders.v1') || '[]'));
  check('15 shared store holds the placed order plus the seed order',
    stored.length === 2 && stored.some((o) => o.orderId === placedId) && stored.some((o) => o.orderId === 'QG1HZLVYSG'));

  /* ---------- admin ---------- */
  await page.goto(BASE + '/#/admin');
  await page.waitForSelector('.order-card');
  check('16 admin lists the seed order and the new order',
    (await page.locator('.order-card', { hasText: 'QG1HZLVYSG' }).count()) >= 1
    && (await page.locator('.order-card', { hasText: placedId }).count()) >= 1);
  check('17 admin Total Orders stat reads 2',
    (await page.locator('.stat .s-val').first().innerText()).trim() === '2');

  const newCard = page.locator('.order-card', { hasText: placedId });
  await newCard.locator('.btn', { hasText: 'Change Status' }).click();
  await page.locator('.sheet .btn', { hasText: 'Ready' }).click();
  await page.waitForFunction(
    (id) => document.querySelector(`article`) && [...document.querySelectorAll('.order-card')]
      .some((c) => c.textContent.includes(id) && c.querySelector('.status')?.textContent.includes('Ready')),
    placedId,
  );
  check('18 admin status change to Ready sticks on the card', true);

  /* ---------- portal + PIN lifecycle ---------- */
  await page.goto(BASE + '/#/portal?order=QG1HZLVYSG');
  await page.waitForSelector('.order-card');
  const portalText = await page.locator('.order-card').innerText();
  check('19 portal renders the seed order via ?order= link (36 x 72 1/2)',
    portalText.includes('QG1HZLVYSG') && portalText.includes('72 1/2'));
  await page.locator('.btn', { hasText: 'Request Order Change' }).click();
  await page.waitForSelector('.pin-big');
  const pin = (await page.locator('.pin-big').innerText()).trim();
  check('20 portal generates a 6-digit change PIN', /^\d{6}$/.test(pin));
  await page.locator('.btn', { hasText: /^Done$/ }).click();

  const seedCard = page.locator('.order-card', { hasText: 'QG1HZLVYSG' });
  await page.goto(BASE + '/#/admin');
  await page.waitForSelector('.order-card');
  await seedCard.locator('.btn', { hasText: 'Edit Order' }).click();
  await page.waitForSelector('#pin-in');
  const wrongPin = pin === '000000' ? '111111' : '000000';
  await page.fill('#pin-in', wrongPin);
  await page.locator('.sheet .btn', { hasText: 'Unlock Edit' }).click();
  await page.waitForSelector('.err-box');
  check('21 admin rejects a wrong PIN with the exact original error copy',
    (await page.locator('.err-box').innerText()).trim() === PIN_ERROR);
  await page.fill('#pin-in', pin);
  await page.locator('.sheet .btn', { hasText: 'Unlock Edit' }).click();
  await page.waitForSelector('#e-p');
  check('22 admin accepts the correct PIN and opens the edit form', true);
  await page.selectOption('#e-p', 'cash');
  await page.locator('.sheet .btn', { hasText: 'Save Changes' }).click();
  await page.waitForSelector('#e-p', { state: 'detached' });
  await page.goto(BASE + '/#/portal?order=QG1HZLVYSG');
  await page.waitForSelector('.order-card');
  check('23 payment change to Cash persists into the portal',
    (await page.locator('.order-card').innerText()).includes('Cash'));

  await page.goto(BASE + '/#/admin');
  await page.waitForSelector('.order-card');
  await seedCard.locator('.btn', { hasText: 'Edit Order' }).click();
  await page.waitForSelector('#pin-in');
  await page.fill('#pin-in', pin);
  await page.locator('.sheet .btn', { hasText: 'Unlock Edit' }).click();
  await page.waitForSelector('.err-box');
  check('24 consumed PIN is rejected on reuse', true);

  /* ---------- Spanish flow ---------- */
  const esPage = await ctx.newPage();
  await esPage.goto(BASE + '/');
  await esPage.waitForSelector('.lang-card');
  await esPage.locator('.lang-card', { hasText: 'Español' }).click();
  check('25 Spanish flow renders the customer title in Spanish',
    (await esPage.locator('.slide-title').innerText()).includes('¿Para quién es esta orden?'));

  /* ---------- device mode + prefill ---------- */
  const devPage = await ctx.newPage();
  await devPage.goto(BASE + '/?IsKioskInShop=true');
  await devPage.waitForSelector('.lang-card');
  await devPage.locator('.lang-card', { hasText: 'English' }).click();
  await devPage.fill('#k-name', 'Device Tester');
  await devPage.locator('section.slide.active .slide-foot .btn').first().click();
  check('26 device slide appears when IsKioskInShop=true',
    (await devPage.locator('.slide-title').innerText()).includes('How would you like to continue?'));
  await devPage.locator('.opt-card', { hasText: 'Continue on my device' }).click();
  await devPage.waitForSelector('.overlay .sheet svg');
  const qrText = await devPage.locator('.overlay .sheet').innerText();
  check('27 handoff QR modal shows with a live countdown',
    /\d+s/.test(qrText));
  await devPage.locator('.btn', { hasText: 'Got it, close' }).click();
  await devPage.locator('section.slide.active .opt-card').first().click();
  check('28 continue-on-this-kiosk path reaches the type slide',
    (await devPage.locator('.slide-title').innerText()).includes('Select Glass Type'));

  /* ---------- continue-here prefill (separate context) ---------- */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pre = await ctx2.newPage();
  await pre.goto(BASE + '/#/?customerName=Smoke%20Tester&projectName=Prefill%20Job');
  await pre.waitForSelector('.lang-card');
  await pre.locator('.lang-card', { hasText: 'English' }).click();
  const prefilled = await pre.inputValue('#k-name');
  check('29 URL params prefill the customer name after language pick',
    prefilled === 'Smoke Tester');

  await browser.close();
  console.log(`\nSMOKE: ${pass} passed, ${fail} failed, ${pass + fail} total`);
  if (fail > 0 || pass !== 29) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => server.kill());
