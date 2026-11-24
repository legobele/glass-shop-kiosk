/* QA screenshot walk for the 3D kiosk redesign.
 * Usage: node tests/qa-shots.mjs <outdir>
 * Captures desktop + mobile states of the redesigned flow. */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const outdir = process.argv[2] || '/tmp/qa';
mkdirSync(outdir, { recursive: true });

const PORT = 4175;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore',
});
const CHROME = process.env.CHROME_BIN
  || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux/chrome`;
const GL = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

async function flow(page, shot, opts = {}) {
  const active = (sel, o) => page.locator(`section.slide.active ${sel}`, o);
  const footBtn = () => active('.slide-foot .btn').first();
  await page.goto(BASE + '/');
  await page.waitForSelector('.lang-card');
  await page.locator('.lang-card', { hasText: 'English' }).click();
  await page.fill('#k-name', 'QA Tester');
  await footBtn().click(); // -> type
  await active('.opt-card', { hasText: 'Float Glass' }).click();
  await active('.switch .track').first().click(); // tempered
  await page.waitForTimeout(400);
  await shot('type-tempered');
  await footBtn().click(); // -> thick
  await active('.opt-card', { hasText: '1/2"' }).first().click();
  await page.waitForTimeout(600);
  await shot('thick-ruler');
  await footBtn().click(); // -> color
  await active('.opt-card', { hasText: opts.color || 'Gray' }).first().click();
  await page.waitForTimeout(500);
  await shot('color');
  await footBtn().click(); // -> size
  await active('.size-field').first().click();
  await page.locator('.np-key', { hasText: /^4$/ }).click();
  await page.locator('.np-key', { hasText: /^8$/ }).click();
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  await active('.size-field').nth(1).click();
  await page.locator('.np-key', { hasText: /^6$/ }).click();
  await page.locator('.np-key', { hasText: /^0$/ }).click();
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  await page.waitForTimeout(1200);
  await shot('size-plancha-midcut');
  await page.waitForTimeout(2600);
  await shot('size-cut-done');
  await page.locator('.k-edgebtn[data-m="e2"]').dispatchEvent('click');
  await page.waitForTimeout(900);
  await shot('size-clearance');
  await page.locator('.k-edgebtn[data-m="c1"]').dispatchEvent('click');
  await page.waitForTimeout(900);
  await shot('size-desnivel');
  await footBtn().click(); // -> qty
  await page.waitForTimeout(900);
  await shot('qty-stack5');
  await active('.opt-card', { hasText: '2×' }).first().click();
  await page.waitForTimeout(650);
  await shot('qty-shatter-mid');
  await page.waitForTimeout(1200);
  await shot('qty-settled-2');
  await active('#k-qty').fill('7');
  await page.waitForTimeout(400);
  await shot('qty-custom');
  await footBtn().click(); // -> add
  await active('.add-head').first().click(); // beveling open (fires machine pass)
  await page.waitForTimeout(700);
  await shot('add-bevel-machine');
  await page.waitForTimeout(3000);
  await active('.seg button', { hasText: 'Edge 2' }).click();
  await page.waitForTimeout(1200);
  await shot('add-bevel-edge');
  await footBtn().click(); // -> pay
  await active('.opt-card', { hasText: 'Credit / Debit Card' }).first().click();
  await page.waitForTimeout(900);
  await shot('pay-card');
  await footBtn().click(); // -> review
  await page.waitForTimeout(600);
  await shot('review');
}

async function main() {
  await waitServer();
  const browser = await chromium.launch({ executablePath: CHROME, args: GL });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  let i = 0;
  const shot = async (name) => { i++; try { await page.screenshot({ path: path.join(outdir, `${String(i).padStart(2, '0')}-${name}.png`), timeout: 15000 }); } catch { console.log('shot skipped (timeout):', name); } };
  if (!process.env.MOBILE_ONLY) { await flow(page, shot); }

  if (!process.env.DESKTOP_ONLY && !process.env.SKIP_MOBILE) {
  const m = await browser.newContext({ viewport: { width: +(process.env.MW || 390), height: +(process.env.MH || 844) } });
  const mp = await m.newPage();
  mp.setDefaultTimeout(20000);
  let j = 0;
  const mshot = async (name) => { j++; try { await mp.screenshot({ path: path.join(outdir, `m${String(j).padStart(2, '0')}-${name}.png`), timeout: 15000 }); } catch { console.log('mshot skipped (timeout):', name); } };
  await flow(mp, mshot, {});
  }
  await browser.close();
  console.log('shots in', outdir);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => server.kill());
