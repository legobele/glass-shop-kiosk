/* Before/after screenshot capture for the 1.3.1 restyle.
 * Usage: node tests/shots.mjs <outdir>
 * Captures: kiosk type slide, kiosk color slide, admin, portal (seed order). */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const outdir = process.argv[2];
if (!outdir) { console.error('usage: node tests/shots.mjs <outdir>'); process.exit(2); }
mkdirSync(outdir, { recursive: true });

const PORT = 4174;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: root, stdio: 'ignore',
});
const CHROME = process.env.CHROME_BIN
  || `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux/chrome`;

async function waitServer() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

async function main() {
  await waitServer();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  // kiosk flow: type slide, then color slide
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const active = (sel, opts) => page.locator(`section.slide.active ${sel}`, opts);
  await page.goto(BASE + '/');
  await page.waitForSelector('.lang-card');
  await page.locator('.lang-card', { hasText: 'English' }).click();
  await page.fill('#k-name', 'Maria Rivera');
  await active('.slide-foot .btn').first().click();
  await active('.opt-card', { hasText: 'Float Glass' }).click();
  await active('.switch .track').first().click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outdir, 'kiosk-type.png') });

  await active('.slide-foot .btn').first().click();
  await active('.size-field').first().click();
  await page.locator('.np-key', { hasText: /^3$/ }).click();
  await page.locator('.np-key', { hasText: /^6$/ }).click();
  await page.locator('.frac-grid button', { hasText: '1/2"' }).click();
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  await active('.size-field').nth(1).click();
  await page.locator('.np-key', { hasText: /^7$/ }).click();
  await page.locator('.np-key', { hasText: /^2$/ }).click();
  await page.locator('.sheet .btn', { hasText: /^OK$/ }).click();
  await active('.slide-foot .btn').first().click();
  await active('.opt-card', { hasText: '3/8"' }).first().click();
  await active('.slide-foot .btn').first().click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(outdir, 'kiosk-color.png') });
  await ctx.close();

  // admin (fresh store: seed order only)
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const admin = await ctx2.newPage();
  await admin.goto(BASE + '/#/admin');
  await admin.waitForSelector('.order-card');
  await admin.waitForTimeout(450);
  await admin.screenshot({ path: path.join(outdir, 'admin.png') });

  // portal with the seed order open
  await admin.goto(BASE + '/#/portal?order=QG1HZLVYSG');
  await admin.waitForSelector('.order-card');
  await admin.waitForTimeout(450);
  await admin.screenshot({ path: path.join(outdir, 'portal.png') });
  await ctx2.close();

  await browser.close();
  console.log('shots written to', outdir);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => server.kill());
