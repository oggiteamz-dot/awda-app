/**
 * overrides.js — every line of text in the app can be rewritten without a
 * developer, including lines that were written straight into a screen's code.
 *
 * How. After anything is drawn, each visible text node gets a stable key from
 * the screen it is on and the words it was written with:
 *     ui.<screen>.<fnv1a of the original words>
 * If the content table has a published value for that key, the node shows that
 * value instead. A screen can also name its own key with data-k (the iḥtiḍār
 * cards do); those lines are read through t() and are never touched here.
 *
 * What is never keyed: anything containing a digit (the app computes those),
 * the person's own name or email, form fields, icons, and anything inside
 * [data-noedit] (a knowledge page's own text is edited as the page).
 *
 * This file only READS. Writing a change is a staff action, checked by the
 * database, and lives in the staff doors — not in this bundle.
 */
import { t, hasText } from './text.js';

const INFO = new WeakMap();                 // text node → { key, orig }
const DIGIT = /[0-9٠-٩۰-۹]/;
const LETTER = /\p{L}/u;
let personal = () => [];
export const setPersonal = (fn) => { personal = fn; };

/** FNV-1a, 32-bit, base 36. Short, stable, and plenty for one screen's lines. */
export function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
export const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
export const screenOf = () => (location.hash.split('?')[0].replace(/^#\/?/, '').split('/')[0] || 'home').replace(/[^a-z0-9_-]/gi, '') || 'home';

function skippable(el) {
  return !el || el.closest('[data-noedit],[data-k],svg,script,style,textarea,input,select,option,[data-staff]');
}

/** The key and original words of a text node, or null if it is not editable. */
export function infoFor(node) {
  if (!node || node.nodeType !== 3) return null;
  if (INFO.has(node)) return INFO.get(node);
  const el = node.parentElement;
  if (skippable(el)) return null;
  const orig = norm(node.data);
  if (orig.length < 2 || !LETTER.test(orig) || DIGIT.test(orig)) return null;
  if (personal().some((p) => p && p.length > 1 && orig.includes(p))) return null;
  const where = el.closest('#tabs') ? 'tabs' : screenOf();
  const info = { key: `ui.${where}.${fnv(orig)}`, orig, where };
  INFO.set(node, info);
  return info;
}

/** Show the published wording on one text node, keeping its surrounding spaces. */
export function paint(node) {
  const info = infoFor(node);
  if (!info || !hasText(info.key)) return;
  const want = t(info.key);
  if (norm(node.data) === want) return;
  const lead = node.data.match(/^\s*/)[0], trail = node.data.match(/\s*$/)[0];
  node.data = lead + want + trail;
}

export function paintAll(root) {
  if (!root) return;
  if (root.nodeType === 3) return paint(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) paint(n);
}

/** Every text node under `root` that can be edited, with its info. */
export function editable(root) {
  const out = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { const i = infoFor(n); if (i) out.push([n, i]); }
  return out;
}

/** Repaint whatever gets drawn, wherever: screens, sheets, the tab bar. */
export function watch() {
  if (!('MutationObserver' in window)) return;
  new MutationObserver((list) => {
    for (const m of list) for (const n of m.addedNodes) {
      if (n.nodeType === 1 || n.nodeType === 3) paintAll(n);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
