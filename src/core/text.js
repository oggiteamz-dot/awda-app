/**
 * text.js — the words that scholars can change without a developer.
 *
 * t(key, fallback) returns the PUBLISHED value of a line from the content
 * table. Drafts never reach this file — only what the owner approved.
 *
 * Boot order matters and is not negotiable: the device's own copy first
 * (synchronous, so the first paint never waits on a network that may hang),
 * then a refresh in the background. A white screen on a hanging connection was
 * a real bug in the v2 build; this is the fix for it.
 */
import { publishedText } from './cloud.js';

const KEY = 'awda.text.v1';
let words = {};
try { words = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { words = {}; }

/* The text each key was written with in the code, so an editor can always see
   — and return to — the original line. Filled as screens render. */
const ORIGINALS = new Map();
export const originalOf = (key) => ORIGINALS.get(key);

/** Published text for `key`, or the fallback the screen was written with. */
export const t = (key, fallback = '') => { if (fallback) ORIGINALS.set(key, fallback); return words[key] ?? fallback; };
/** Apply a change on this device at once (after it was saved), before the next refresh. */
export function setLocal(key, value) {
  if (value == null) delete words[key]; else words[key] = value;
  try { localStorage.setItem(KEY, JSON.stringify(words)); } catch { /* full */ }
}
export const hasText = (key) => key in words;
export const textCount = () => Object.keys(words).length;

/** Refresh from the server. Resolves true if anything changed. */
export async function refreshText() {
  try {
    const next = await publishedText();
    const changed = JSON.stringify(next) !== JSON.stringify(words);
    words = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full: keep in memory */ }
    return changed;
  } catch (err) {
    window.reportError?.(err, 'refreshing published text', 'TEXT_REFRESH_FAILED');
    return false;
  }
}
