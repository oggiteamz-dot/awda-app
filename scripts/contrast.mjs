/**
 * contrast.mjs — the gate. Fails the build below 4.5:1 on any TEXT pair.
 *
 * No large-text exemption. WCAG allows 3:1 for large text; that exemption
 * measures large-area luminance and knows nothing about the dots and tashkil
 * that distinguish Arabic letters at 8-10% of the em. A grey that reads as
 * "subtle" in Latin is illegible in Arabic. Every pair here is held to 4.5:1.
 *
 * Gradients are measured at their DARKEST and LIGHTEST stop, and both must pass,
 * because text sits across the whole block.
 */
import { PALETTES, GROUNDS } from '../src/core/palettes.js';

const TEXT_MIN = 4.5;
const ORNAMENT_MIN = 1.6;

const hex = (h) => {
  h = h.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// every #rrggbb / #rgb stop inside a gradient string, or the colour itself
const stops = (v) => (v.match(/#[0-9a-fA-F]{3,8}/g) || [v]).filter((s) => /^#[0-9a-fA-F]{3,6}$/.test(s));

// [textToken, groundToken, label]
const TEXT_PAIRS = [
  ['head-ink', 'head', 'display type on the saturated block'],
  ['head-soft', 'head', 'secondary type on the saturated block'],
  ['ink', 'bg', 'body on the page ground'],
  ['ink', 'card', 'body on a card'],
  ['soft', 'bg', 'secondary on the page ground'],
  ['soft', 'card', 'secondary on a card'],
  ['ink', 'card2', 'body on the recessed card'],
  ['soft', 'card2', 'secondary on the recessed card'],
  ['acc', 'card', 'accent text/icon on a card'],
  ['acc', 'bg', 'accent text/icon on the page ground'],
  ['acc-ink', 'acc', 'label on an accent fill'],
];
const ORNAMENT_PAIRS = [['rule', 'card', 'gold hairline on a card'], ['rule', 'bg', 'gold hairline on the ground']];

let fail = 0, checked = 0;
const rows = [];

function check(name, v) {
  let worst = { r: Infinity, label: '' };
  for (const [t, g, label] of TEXT_PAIRS) {
    for (const gs of stops(v[g])) {
      for (const ts of stops(v[t])) {
        const r = ratio(ts, gs); checked++;
        if (r < worst.r) worst = { r, label };
        if (r < TEXT_MIN) { fail++; console.error(`  FAIL ${name}  ${t} on ${g} = ${r.toFixed(2)}:1  (${label})  ${ts} / ${gs}`); }
      }
    }
  }
  for (const [t, g, label] of ORNAMENT_PAIRS) {
    if (!/^#/.test(v[t])) continue;
    for (const gs of stops(v[g])) {
      const r = ratio(v[t], gs); checked++;
      if (r < ORNAMENT_MIN) { fail++; console.error(`  FAIL ${name}  ornament ${t} on ${g} = ${r.toFixed(2)}:1 (${label})`); }
    }
  }
  rows.push({ name, worst: worst.r, where: worst.label });
}

for (const p of PALETTES) check(`${p.key} (${p.ar})`, p.v);
for (const [k, g] of Object.entries(GROUNDS)) check(`ground:${k} (${g.ar})`, g.v);

console.log('\n  worst text pair per palette — floor is 4.5:1, no exemptions\n');
console.log('  ' + 'palette'.padEnd(26) + 'worst   where');
console.log('  ' + '-'.repeat(74));
for (const r of rows.sort((a, b) => a.worst - b.worst)) {
  console.log('  ' + r.name.padEnd(26) + (r.worst.toFixed(2) + ':1').padEnd(8) + r.where);
}
console.log(`\n  ${checked} pairs measured across ${rows.length} palettes. ${fail} failures.\n`);
process.exit(fail ? 1 : 0);
