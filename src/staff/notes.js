/**
 * staff/notes.js — every note left on the app, in one list.
 *
 * ⛔ STAFF CODE. Grouped by screen. Each note can be listened to, its drawing
 * shown, its suggested wording applied (admins), closed, or followed back to
 * the screen it was left on.
 */
import { head, card, secHead, animateIn, esc } from '../core/ui.js';
import { setGround } from '../core/theme.js';
import * as api from './api.js';
import { screenAr, wireNav } from './common.js';
import { toAr } from '../core/num.js';

export function notesRoutes(layer) {
  let showing = 'open';
  async function list(root, go) {
    setGround(null);
    const at = location.hash;
    const rows = await api.notes({ status: showing });
    if (location.hash !== at) return;   // moved on while loading
    const groups = {};
    for (const n of rows) (groups[n.route] ||= []).push(n);
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: 'الملاحظات', back: true, sub: `${toAr(rows.length)} ${showing === 'open' ? 'مفتوحة' : 'مُغلقة'}` })}
    <div class="wrap lift stack" data-screen="staff-notes" data-noedit data-staff-screen>
      <div class="seg" role="tablist">
        <button role="tab" aria-selected="${showing === 'open'}" data-show="open">مفتوحة</button>
        <button role="tab" aria-selected="${showing === 'resolved'}" data-show="resolved">مُغلقة</button>
      </div>
      ${rows.length ? Object.entries(groups).map(([route, ns]) => `<div class="sec">${secHead(esc(screenAr(route)),
        `<button class="btn btn-quiet btn-sm" data-goto="${esc(route)}">اذهب إليها</button>`)}
        <div class="stack">${ns.map((n) => `${n.target_text ? `<div class="squote"><p>${esc(n.target_text)}</p></div>` : ''}${layer.noteCard(n)}`).join('')}</div></div>`).join('')
        : card(`<div class="empty"><p class="body">${showing === 'open' ? 'لا ملاحظات مفتوحة.' : 'لا شيء هنا بعد.'}</p>
          <p class="hint">في أيّ شاشة، اختر «ملاحظة» من الشريط ثمّ اضغط على السطر.</p></div>`)}
      <div style="height:90px"></div>
    </div>`;
    animateIn(root);
    wireNav(root, go);
    root._notes = rows;
    root.querySelectorAll('[data-show]').forEach((b) => b.onclick = () => { showing = b.dataset.show; list(root, go); });
    root.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => { layer.setMode('note'); go(b.dataset.goto); });
    layer.wireNoteCards(root, () => list(root, go).catch((err) => window.reportError?.(err, 'notes list', 'NOTES_LIST_FAILED')));
  }
  return { '#/staff/notes': list };
}
