/**
 * icons.js — the UI set. 24×24, 1.6px stroke, geometric, currentColor.
 *
 * Every icon is drawn on the same twelve-fold / orthogonal grammar as the
 * ornament, so the interface and the decoration are visibly one system rather
 * than a stock icon pack sitting next to some Islamic art.
 *
 * NO EMOJI ANYWHERE IN THE PRODUCT. There is a gate for it
 * (scripts/checks/no_emoji_ui.mjs in the main repo). An emoji is somebody else's
 * drawing, rendered differently on every phone, and it is the single fastest way
 * to make a religious app look unserious.
 *
 * The five tab icons were each chosen to avoid the category cliché:
 *   home      a dodecagon — the brand geometry, not a house
 *   prayer    a miḥrāb arch — unmistakably prayer, and NOT a mosque-with-dome
 *             silhouette, which is the stock mark every other app uses
 *   qada      the turbah disc with a descending rule — a debt going down
 *   knowledge an open manuscript spread — the app's own register
 *   will      a folded document with a seal
 *   ihtidar   the jarīda, the fresh green twig placed with the body. Quiet,
 *             correct, and it is the only tab icon that is a living thing
 */

const S = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="ic">${d}${extra}</svg>`;

const dodeca = (() => {
  const p = [];
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 12;
    p.push(`${(12 + 8.6 * Math.cos(a)).toFixed(2)} ${(12 + 8.6 * Math.sin(a)).toFixed(2)}`);
  }
  return 'M' + p.join('L') + 'Z';
})();

export const ICONS = {
  /* ── navigation ─────────────────────────────────────────────────────────── */
  home: S(`<path d="${dodeca}"/><path d="M12 8.2v7.6M8.2 12h7.6" opacity=".45"/>`),
  prayer: S(`<path d="M6 21v-9.2C6 8 8.7 5.2 12 5.2S18 8 18 11.8V21"/><path d="M4 21h16"/><path d="M12 5.2V3.2"/><path d="M9.6 21v-8.6a2.4 2.4 0 0 1 4.8 0V21" opacity=".45"/>`),
  qada: S(`<circle cx="12" cy="10" r="5.6"/><circle cx="12" cy="10" r="2.6" opacity=".45"/><path d="M5 19h14" /><path d="M8.4 19v-1.6M15.6 19v-1.6" opacity=".45"/>`),
  knowledge: S(`<path d="M12 6.4c-1.9-1.5-4-2.1-6.6-2.1v13c2.6 0 4.7.6 6.6 2.1 1.9-1.5 4-2.1 6.6-2.1v-13c-2.6 0-4.7.6-6.6 2.1Z"/><path d="M12 6.4v13" opacity=".45"/>`),
  will: S(`<path d="M6 3.2h8.4L18 6.8V17a3.8 3.8 0 0 1-3.8 3.8H6Z"/><path d="M14.4 3.2v3.6H18" opacity=".6"/><circle cx="12" cy="14.2" r="2.2" opacity=".6"/><path d="M12 16.4v3" opacity=".45"/>`),
  ihtidar: S(`<path d="M12 21V6"/><path d="M12 9.2c0-2 1.6-3.6 4.2-4 .3 2.6-1.2 4.6-4.2 4.8Z"/><path d="M12 14c0-2-1.6-3.6-4.2-4-.3 2.6 1.2 4.6 4.2 4.8Z" opacity=".7"/>`),
  account: S(`<circle cx="12" cy="8.4" r="3.6"/><path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0"/>`),

  /* ── instrument ─────────────────────────────────────────────────────────── */
  astrolabe: S(`<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="4.4" opacity=".5"/><path d="M12 3.4v17M3.4 12h17" opacity=".35"/><path d="M6 6l12 12M18 6L6 18" opacity=".2"/>`),
  calendar: S(`<rect x="3.4" y="5.4" width="17.2" height="15.2" rx="2.4"/><path d="M3.4 10.2h17.2"/><path d="M8 3.4v4M16 3.4v4"/><circle cx="8.4" cy="14.4" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14.4" r="1" fill="currentColor" stroke="none" opacity=".5"/>`),
  moon: S(`<path d="M20 13.6A8.4 8.4 0 1 1 10.4 4a6.6 6.6 0 0 0 9.6 9.6Z"/>`),
  sun: S(`<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.4 5.4l1.7 1.7M16.9 16.9l1.7 1.7M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7" opacity=".6"/>`),
  chart: S(`<path d="M3.6 20.4h16.8"/><path d="M6.6 20.4V13M11 20.4V8.2M15.4 20.4v-5.6M19.8 20.4V4.6" />`),
  scale: S(`<path d="M12 3.6v16.8"/><path d="M4.4 20.4h15.2"/><path d="M12 6.6 5 9.6M12 6.6l7 3"/><path d="M2.4 9.6a2.6 2.6 0 0 0 5.2 0ZM16.4 9.6a2.6 2.6 0 0 0 5.2 0Z" opacity=".6"/>`),

  /* ── controls ───────────────────────────────────────────────────────────── */
  next: S(`<path d="M14.4 6 8.4 12l6 6"/>`),      // RTL: forward points LEFT
  prev: S(`<path d="M9.6 6l6 6-6 6"/>`),
  up: S(`<path d="M6 14.4 12 8.4l6 6"/>`),
  down: S(`<path d="M6 9.6 12 15.6l6-6"/>`),
  check: S(`<path d="M4.8 12.6 9.6 17.4 19.2 6.6"/>`),
  plus: S(`<path d="M12 5.4v13.2M5.4 12h13.2"/>`),
  close: S(`<path d="M6 6l12 12M18 6 6 18"/>`),
  edit: S(`<path d="M16.4 3.8a2.4 2.4 0 0 1 3.4 3.4L8 19l-4.4 1.2L4.8 16Z"/>`),
  mic: S(`<rect x="9" y="2.8" width="6" height="11.4" rx="3"/><path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0"/><path d="M12 18v3.2"/>`),
  video: S(`<rect x="2.8" y="6.4" width="12.8" height="11.2" rx="2.4"/><path d="M15.6 10.8 21.2 7.6v8.8l-5.6-3.2Z"/>`),
  play: S(`<path d="M8.4 5.4 18.6 12 8.4 18.6Z"/>`),
  lock: S(`<rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.4"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8"/>`),
  shield: S(`<path d="M12 2.8 20 6v6c0 4.6-3.2 7.8-8 9.2-4.8-1.4-8-4.6-8-9.2V6Z"/><path d="M8.8 12.2 11 14.4l4.2-4.4" opacity=".7"/>`),
  bell: S(`<path d="M6.4 9.8a5.6 5.6 0 0 1 11.2 0c0 5 2 6.4 2 6.4H4.4s2-1.4 2-6.4Z"/><path d="M10.2 19.6a2.2 2.2 0 0 0 3.6 0"/>`),
  gear: S(`<circle cx="12" cy="12" r="3.1"/><path d="M19.5 12a7.5 7.5 0 0 0-.12-1.32l2.02-1.5-1.9-3.29-2.36.92a7.5 7.5 0 0 0-2.3-1.33L14.5 2.9h-3.8l-.34 2.58a7.5 7.5 0 0 0-2.3 1.33l-2.36-.92-1.9 3.29 2.02 1.5a7.5 7.5 0 0 0 0 2.64l-2.02 1.5 1.9 3.29 2.36-.92a7.5 7.5 0 0 0 2.3 1.33l.34 2.58h3.8l.34-2.58a7.5 7.5 0 0 0 2.3-1.33l2.36.92 1.9-3.29-2.02-1.5c.08-.43.12-.87.12-1.32Z"/>`),
  search: S(`<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6 20.4 20.4"/>`),
  offline: S(`<path d="M5 12.8a4.2 4.2 0 0 1 3.4-4.1M12 5.2a7 7 0 0 1 6.8 5.4"/><path d="M6.6 17.4h10.2a3.4 3.4 0 0 0 .6-6.7" opacity=".55"/><path d="M3.4 3.4l17.2 17.2"/>`),
  sync: S(`<path d="M20.4 12a8.4 8.4 0 0 1-14.6 5.7"/><path d="M3.6 12a8.4 8.4 0 0 1 14.6-5.7"/><path d="M18.2 2.6v3.7h-3.7M5.8 21.4v-3.7h3.7"/>`),
  language: S(`<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.4 2.5 3.6 5.4 3.6 8.6S14.4 18.1 12 20.6C9.6 18.1 8.4 15.2 8.4 12S9.6 5.9 12 3.4Z"/>`),
  palette: S(`<path d="M12 3.4a8.6 8.6 0 1 0 0 17.2c1.3 0 2-.8 2-1.8 0-1.6-1.4-1.8-1.4-3 0-1 .9-1.8 2-1.8h1.6a4.4 4.4 0 0 0 4.4-4.4c0-3.4-3.9-6.2-8.6-6.2Z"/><circle cx="8.4" cy="10.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.6" cy="10" r="1.1" fill="currentColor" stroke="none"/>`),
  grid: S(`<rect x="3.6" y="3.6" width="7" height="7" rx="1.6"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.6"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.6"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.6"/>`),
  people: S(`<circle cx="9" cy="8.4" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16.4 5.4a3.4 3.4 0 0 1 0 6.6M17.6 20h3.6a5.6 5.6 0 0 0-3.4-5.2" opacity=".6"/>`),
  info: S(`<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/><circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none"/>`),
  alert: S(`<path d="M12 3.6 21.4 20H2.6Z"/><path d="M12 9.6v4.6"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>`),
  doc: S(`<path d="M6 3.4h7.6L18.6 8.4V20.6H6Z"/><path d="M13.6 3.4v5h5" opacity=".6"/><path d="M9 12.6h6M9 16h4" opacity=".7"/>`),
};

export const icon = (name, cls = '') => {
  const raw = ICONS[name];
  if (!raw) return `<span class="ic-missing" title="${name}">⟦ICON:${name}⟧</span>`;
  return cls ? raw.replace('class="ic"', `class="ic ${cls}"`) : raw;
};
