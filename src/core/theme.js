/**
 * theme.js — puts the tokens on the document, and nothing else.
 *
 * Three independent axes plus a per-module ground:
 *   palette   colour          (8)
 *   layout    structure       (12)
 *   surface   how a container announces itself (4)
 *   ground    doc / shroud — set by the ROUTE, not by the user
 *
 * The ground is the important one and it is deliberately not a preference. A
 * person does not choose to be sombre on الاحتضار; the module is sombre because
 * of what it is. That is what lets the palettes be bright everywhere else — the
 * mood is carried by the module, not by the colour scheme.
 */
import { PALETTES, GROUNDS, paletteByKey, DEFAULT_PALETTE } from './palettes.js';

const KEY = 'awda.theme.v1';
export const state = {
  palette: document.querySelector('meta[name="awda-palette"]')?.content || DEFAULT_PALETTE, layout: 'bento', surface: 'glass',
  ground: null, quran: 'on', lang: 'ar',
};

try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* private mode: defaults */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* fine */ } };

export function apply() {
  const p = paletteByKey(state.palette);
  const v = state.ground ? GROUNDS[state.ground].v : p.v;
  const root = document.documentElement;
  for (const [k, val] of Object.entries(v)) root.style.setProperty(`--${k}`, val);
  const b = document.body;
  b.dataset.palette = state.palette;
  b.dataset.layout = state.layout;
  b.dataset.surface = state.surface;
  b.dataset.quran = state.quran;
  if (state.ground) b.dataset.ground = state.ground; else delete b.dataset.ground;
  // the OS chrome (status bar, pull-to-refresh) follows the header block
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', v['head-flat']);
  b.dataset.dark = state.ground ? '0' : String(p.dark || 0);
}

export function set(k, val) { state[k] = val; save(); apply(); }
export function setGround(g) { if (state.ground === g) return; state.ground = g; apply(); }
export { PALETTES, GROUNDS };
