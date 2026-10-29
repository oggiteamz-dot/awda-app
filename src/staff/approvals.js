/**
 * staff/approvals.js — الموافقات: everything waiting for an admin, in one place.
 *
 * ⛔ ADMIN CODE — imported by the console only (via admin.js).
 *   طلبات       scholars' requests (step 1 of 2)
 *   صفحات       new pages sent by scholars
 *   تعديلات     scholars' proposed edits to existing pages, shown word by word
 *   صياغات      suggested wording on a line of the app
 * Nothing a scholar does is live until it is approved here (or by Hadi in chat).
 */
import { head, card, secHead, icon, animateIn, esc, sheet } from '../core/ui.js';
import { setGround } from '../core/theme.js';
import { human } from '../core/cloud.js';
import { refreshPages, sectionByKey } from '../core/pages.js';
import * as A from './admin-api.js';
import * as api from './api.js';
import { ago, diff, toast, wireNav, screenAr, pageTag } from './common.js';
import { KIND_AR } from './requests.js';
import { toAr } from '../core/num.js';

const who4 = (l) => { const s = String(l || ''); return s.endsWith('@staff.invalid') ? s.split('@')[0].toUpperCase() : s.split('@')[0]; };
const flat = (blocks) => (blocks || []).map((b) => [b.text || '', b.ref ? `(${b.ref})` : ''].join(' ').trim()).join('\n\n');

/** Ask for a reason, then run fn(reason). */
function why(title, fn) {
  const close = sheet(title, `<div class="stack" data-staff><p class="hint">اكتب السبب. يصل كما هو إلى الكاتب.</p>
    <textarea class="input" id="why" rows="4"></textarea><button class="btn btn-block" data-why>إرسال</button></div>`);
  const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
  s.querySelector('[data-why]').onclick = async () => {
    const v = s.querySelector('#why').value.trim(); if (!v) return toast('السبب مطلوب.');
    try { await fn(v); close(); } catch (err) { toast(human(err)); }
  };
}

export function approvalsRoutes({ tools, layer }) {
  async function screen(root, go) {
    setGround(null);
    const at = location.hash;
    const [reqs, pages, props, notes] = await Promise.all([api.requests(), api.teamPages(), api.proposals({ status: 'pending' }), api.notes({ status: 'open' })]);
    if (location.hash !== at) return;   // the person moved on while this loaded: never paint over the next screen
    const newReqs = reqs.filter((r) => r.status === 'new');
    const pend = pages.filter((p) => p.status === 'pending');
    const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
    const wording = notes.filter((n) => n.suggestion && n.target_key && !n.target_key.startsWith('page.'));
    const total = newReqs.length + pend.length + props.length + wording.length;
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: 'الموافقات', back: true, sub: total ? `${toAr(total)} تنتظر قرارك` : 'لا شيء ينتظرك' })}
    <div class="wrap lift stack" data-screen="staff-approvals" data-noedit>
      ${!total ? card('<div class="empty"><p class="body">كلّ شيء معتمَد. لا شيء ينتظر قرارك.</p></div>') : ''}
      ${newReqs.length ? `<div class="sec">${secHead(`طلبات جديدة <b class="n">${toAr(newReqs.length)}</b>`)}<div class="stack">${newReqs.map((r) => `
        <div class="snote"><div class="between"><b>${esc(r.title)}</b><span class="tag">${KIND_AR[r.kind] || ''}</span></div>
          <p class="hint">${esc(who4(r.author_label))} · ${ago(r.created_at)}${r.has_audio ? ' · فيه تسجيل' : ''}</p>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
            <button class="btn btn-sm" data-req-yes="${r.id}">موافقة</button>
            <button class="btn btn-ghost btn-sm" data-req-no="${r.id}">رفض مع السبب</button>
            <button class="btn btn-quiet btn-sm" data-go="#/staff/request/${r.id}">اقرأه كاملاً</button></div></div>`).join('')}</div></div>` : ''}
      ${pend.length ? `<div class="sec">${secHead(`صفحات جديدة <b class="n">${toAr(pend.length)}</b>`)}<div class="stack">${pend.map((p) => `
        <div class="snote"><div class="between"><b>${esc(p.title)}</b>${pageTag(p.status)}</div>
          <p class="hint">${esc(sectionByKey(p.section)?.ar || '')} · ${esc(who4(p.author_label))} · ${ago(p.updated_at)}</p>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
            <button class="btn btn-quiet btn-sm" data-go="#/staff/page/${p.id}">${icon('doc', 'ic-sm')} اقرأها، ثمّ وافق أو أعِد</button></div></div>`).join('')}</div></div>` : ''}
      ${props.length ? `<div class="sec">${secHead(`تعديلات على صفحات <b class="n">${toAr(props.length)}</b>`)}<div class="stack">${props.map((pr) => {
        const cur = byId[pr.page_id] || {};
        return `<div class="snote" data-prop="${pr.id}"><div class="between"><b>${esc(cur.title || pr.title)}</b><span class="hint">${esc(who4(pr.author_label))} · ${ago(pr.created_at)}</span></div>
          ${pr.note ? `<p class="body" style="margin-top:6px">${esc(pr.note)}</p>` : ''}
          ${pr.title !== cur.title ? `<p class="hint" style="margin-top:8px">العنوان</p><p class="diff">${diff(cur.title || '', pr.title)}</p>` : ''}
          <p class="hint" style="margin-top:8px">النصّ، كلمةً كلمة</p><div class="diff sdiff-box" data-pdiff="${pr.id}"><span class="hint">يُحمَّل…</span></div>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
            <button class="btn btn-sm" data-prop-yes="${pr.id}">موافقة ونشر</button>
            <button class="btn btn-ghost btn-sm" data-prop-no="${pr.id}">إعادة مع السبب</button>
            <button class="btn btn-quiet btn-sm" data-go="#/page/${cur.slug || ''}">الصفحة الآن</button></div></div>`;
      }).join('')}</div></div>` : ''}
      ${wording.length ? `<div class="sec">${secHead(`صياغات مقترحة <b class="n">${toAr(wording.length)}</b>`)}<div class="stack">${wording.map((n) => `
        <div><p class="kicker-ar" style="margin-bottom:6px">${esc(screenAr(n.route))}</p>${layer.noteCard(n)}</div>`).join('')}</div></div>` : ''}
      <div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
    root._notes = notes;
    const again = () => { layer.reloadNotes(); screen(root, go); };
    layer.wireNoteCards(root, again);
    // the full text diff needs the page's current blocks
    for (const pr of props) api.getPage(pr.page_id).then((p) => {
      const el = root.querySelector(`[data-pdiff="${pr.id}"]`); if (el) el.innerHTML = diff(flat(p?.blocks), flat(pr.blocks));
    }).catch(() => {});
    root.querySelectorAll('[data-req-yes]').forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await A.decide(b.dataset.reqYes, true); toast('وُفق على الطلب. دخل طابور التنفيذ.'); again(); } catch (err) { toast(human(err)); b.disabled = false; }
    });
    root.querySelectorAll('[data-req-no]').forEach((b) => b.onclick = () => why('رفض الطلب', async (v) => { await A.decide(b.dataset.reqNo, false, v); toast('رُفض، ووصل السبب.'); again(); }));
    root.querySelectorAll('[data-prop-yes]').forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await A.approveProposal(b.dataset.propYes); await refreshPages(); toast('اعتُمد التعديل، وهو الآن ظاهر للناس.'); again(); } catch (err) { toast(human(err)); b.disabled = false; }
    });
    root.querySelectorAll('[data-prop-no]').forEach((b) => b.onclick = () => why('إعادة التعديل', async (v) => { await A.returnProposal(b.dataset.propNo, v); toast('أُعيد إلى الكاتب مع السبب.'); again(); }));
    void tools;
  }
  return { '#/staff/approvals': screen };
}
