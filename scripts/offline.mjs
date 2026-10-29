#!/usr/bin/env node
/**
 * offline.mjs — the PWA claim, proven the hard way for each door: load once,
 * let the service worker take control, then KILL THE SERVER and reload. The
 * door must still render. (iḥtiḍār in particular must open in a corridor with
 * no signal, signed out.)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const cases = [['app', 8111, '#/ihtidar', 'وضعيّة المحتضَر'], ['desk', 8112, '#/', 'الدخول'], ['console', 8113, '#/', 'الدخول']];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let bad = 0;
for (const [door, port, hash, expect] of cases) {
  const srv = spawn('python3', ['-m', 'http.server', String(port), '-d', join(ROOT, 'dist', door)], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 700));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://upgfyvdnuniccgkwyacd.supabase.co/**', (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/${hash}`);
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let k = 0; k < 40 && !navigator.serviceWorker.controller; k++) await new Promise((r) => setTimeout(r, 100));
    return !!navigator.serviceWorker.controller;
  });
  const manifest = await page.evaluate(async () => (await fetch('manifest.webmanifest')).json());
  srv.kill(); await new Promise((r) => setTimeout(r, 400));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForTimeout(1200);
  const text = await page.evaluate(() => document.body.innerText);
  const ok = controlled && text.includes(expect);
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${door.padEnd(8)} sw-controlling=${controlled}  server-killed+offline renders «${expect}»=${text.includes(expect)}  manifest="${manifest.name}" icons=${manifest.icons.length}`);
  await ctx.close();
}
await browser.close();
process.exitCode = bad ? 1 : 0;
