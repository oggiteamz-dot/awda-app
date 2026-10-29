/** ui.js — the handful of builders every screen shares. Keeps screens declarative. */
import { icon } from './icons.js';
import { rosette12, kuficField, facetField } from './ornament.js';
import { rise, riseAll, extend, fold, glint, rotate, drawArc } from './motion.js';

export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * The saturated header block. `back` renders a LEFT-pointing chevron, because in
 * RTL forward is left and back is right — the single most common thing an
 * Arabic app gets wrong.
 */
export const head = ({ kicker = '', title = '', sub = '', back = false, actions = '', rosette = true, kufic = true, tall = false, body = '' }) => `
  <header class="head" style="${tall ? 'padding-bottom:72px' : ''}">
    ${kufic ? kuficField({ id: 'kf-' + Math.random().toString(36).slice(2, 7), unit: 52, weight: 1.6, opacity: .045 }) : ''}
    ${rosette ? `<div class="head-orn" data-rotate>${rosette12({ size: 420, weight: 1.1 })}</div>` : ''}
    <div class="head-row">
      ${back ? `<button class="icon-btn" data-back aria-label="رجوع">${icon('prev')}</button>` : ''}
      <div class="grow">
        ${kicker ? `<span class="kicker-ar">${kicker}</span>` : ''}
        ${title ? `<h1 class="h1" style="color:var(--head-ink);margin-top:2px">${title}</h1>` : ''}
        ${sub ? `<p class="body soft" style="margin-top:6px">${sub}</p>` : ''}
      </div>
      ${actions}
    </div>
    ${body}
  </header>`;

export const card = (inner, cls = '') => `<div class="card ${cls}">${inner}</div>`;
export const facetCard = (inner, cls = '') => `<div class="card card-glint ${cls}" data-glint>${facetField({ id: 'fc' + Math.random().toString(36).slice(2, 7) })}<div style="position:relative">${inner}</div></div>`;

export const secHead = (title, right = '') => `
  <div class="sec-head"><h2 class="h2">${title}</h2>${right}</div>
  <div class="rule" data-extend></div>`;

export const regRow = ({ label, fig = '', sub = '', ic = '', go = false, stat = false }) => `
  <${stat ? 'div' : 'button'} class="reg-row" ${stat ? 'data-static' : ''}>
    ${ic ? icon(ic) : ''}
    <span class="grow"><span style="display:block">${label}</span>${sub ? `<span class="hint">${sub}</span>` : ''}</span>
    ${fig ? `<span class="fig n">${fig}</span>` : ''}
    ${go ? icon('next', 'ic-sm') : ''}
  </${stat ? 'div' : 'button'}>`;

/** Bottom sheet. Returns a close fn. Scrim click and Escape both close it. */
export function sheet(title, inner, onClose) {
  const scrim = h(`<div class="scrim"></div>`);
  const el = h(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-grab"></div>
    <div class="between" style="margin-bottom:14px"><h2 class="h2">${title}</h2>
      <button class="icon-btn" data-close aria-label="إغلاق">${icon('close')}</button></div>
    ${inner}</div>`);
  document.body.append(scrim, el);
  requestAnimationFrame(() => scrim.setAttribute('data-open', ''));
  fold(el);
  const close = () => {
    scrim.removeAttribute('data-open');
    el.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'both' });
    setTimeout(() => { scrim.remove(); el.remove(); onClose?.(); }, 220);
  };
  scrim.onclick = close;
  el.querySelector('[data-close]').onclick = close;
  const esckey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esckey); } };
  document.addEventListener('keydown', esckey);
  return close;
}

/** Runs the entrance choreography for a freshly-painted screen. */
export function animateIn(root) {
  rise(root);
  riseAll(root.querySelectorAll('[data-stagger]'));
  root.querySelectorAll('[data-extend]').forEach((e) => extend(e));
  root.querySelectorAll('[data-rotate] svg').forEach((e) => rotate(e));
  root.querySelectorAll('.arc-draw').forEach((p) => drawArc(p));
  root.querySelectorAll('[data-glint]').forEach((e) => e.addEventListener('click', () => glint(e)));
}
export { icon, rosette12, kuficField, facetField };
