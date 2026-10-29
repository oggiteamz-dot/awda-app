#!/usr/bin/env node
/**
 * icons.mjs — each door gets its own home-screen icon, so a scholar with both
 * the app and the desk installed can tell them apart at a glance. Same 12-point
 * girih rosette, constructed by ornament.js; a different ground per door.
 * Rendered with the Chromium Playwright already ships with. Run once, or when
 * doors.json colours change.
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DOORS = JSON.parse(readFileSync(join(ROOT, 'doors.json'), 'utf8'));
globalThis.document = { querySelector: () => null };
const { rosette12 } = await import(join(ROOT, 'src/core/ornament.js'));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage();
for (const [key, d] of Object.entries(DOORS)) {
  const dir = join(ROOT, 'build/icons', key); mkdirSync(dir, { recursive: true });
  // ornament size is relative; maskable icons need the mark inside the 80% safe zone
  for (const [name, px, pad, round] of [['icon-512', 512, .16, 0.22], ['icon-192', 192, .16, 0.22],
    ['maskable-512', 512, .26, 0], ['apple-touch-icon', 180, .18, 0], ['favicon-32', 32, .06, 0.2]]) {
    const inner = Math.round(px * (1 - pad * 2));
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(`<html><body style="margin:0;background:transparent">
      <div style="width:${px}px;height:${px}px;background:${d.icon_bg};border-radius:${round * px}px;display:grid;place-items:center;color:${d.icon_ink}">
      <div style="width:${inner}px;height:${inner}px">${rosette12({ size: inner, weight: px < 64 ? 2.6 : 1.5 })}</div></div></body></html>`);
    await page.screenshot({ path: join(dir, name + '.png'), omitBackground: true });
  }
  console.log('icons', key);
}
await browser.close();
