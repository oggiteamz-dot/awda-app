/**
 * staff/admin.js — what only an admin can do.
 *
 * ⛔ ADMIN CODE — imported by console-main.js only.
 *
 *   · rewrite any line in the app, in place, with its history and an undo
 *   · rewrite a line of a published page from the page itself
 *   · apply a scholar's suggested wording in one tap
 *   · approve or return pages (through tools.setPageStatus)
 *   · people and errors
 */
import { head, card, secHead, regRow, icon, animateIn, sheet, esc } from '../core/ui.js';
import { toAr } from '../core/num.js';
import { setGround } from '../core/theme.js';
import { human } from '../core/cloud.js';
import { setLocal } from '../core/text.js';
import { refreshPages } from '../core/pages.js';
import * as A from './admin-api.js';
import * as api from './api.js';
import { ROLE_AR, ROLE_SUB, screenAr, ago, diff, note, toast, wireNav } from './common.js';

export function adminTools({ refresh, who }) {
  const isOwner = who.roles.includes('owner');

  /** Save a line, show it on this phone at once, and redraw the screen. */
  async function commit(key, value, original, where) {
    await A.setText(key, value, original, where);
    setLocal(key, value);
    refresh();
  }

  /* ── rewrite one line ─────────────────────────────────────────────── */
  async function editText(tg) {
    const close = sheet('تعديل النصّ', `<div class="stack" data-staff>
      <div class="squote"><span class="kicker-ar">${esc(screenAr(tg.where || tg.key))}</span>
        <p class="hint" style="margin-top:4px">النصّ كما كُتب في التطبيق</p><p>${esc(tg.orig || tg.cur)}</p></div>
      <label class="label" for="ed">النصّ الذي يظهر للناس</label>
      <textarea class="input" id="ed" rows="${Math.min(10, Math.max(2, Math.ceil((tg.cur || '').length / 34)))}">${esc(tg.cur)}</textarea>
      <div data-diff></div>
      <button class="btn btn-block" data-save>حفظ — يظهر للجميع فوراً</button>
      <div data-note-slot></div>
      <div data-hist><p class="hint">يُحمَّل السجلّ…</p></div></div>`);
    const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
    const ed = s.querySelector('#ed');
    ed.oninput = () => { s.querySelector('[data-diff]').innerHTML = ed.value.trim() !== tg.cur ? `<p class="diff">${diff(tg.cur, ed.value)}</p>` : ''; };
    ed.focus();
    s.querySelector('[data-save]').onclick = async (e) => {
      const v = ed.value.trim();
      if (!v) return note(s, 'لا يمكن أن يكون السطر فارغاً.');
      if (v === tg.cur) return close();
      e.target.disabled = true; e.target.textContent = 'يُحفَظ…';
      try {
        if (tg.key.startsWith('ui.') && v === tg.orig) { await A.resetText(tg.key); setLocal(tg.key, null); refresh(); }
        else await commit(tg.key, v, tg.orig, tg.where);
        close(); toast('حُفظ. يراه الجميع الآن.');
      } catch (err) {
        window.reportError?.(err, 'editing text in place', 'TEXT_EDIT_FAILED');
        e.target.disabled = false; e.target.textContent = 'حفظ — يظهر للجميع فوراً'; note(s, human(err));
      }
    };
    // history: every version this line has had, any of which can be put back
    try {
      const [row, hist] = await Promise.all([A.textRow(tg.key), A.textHistory(tg.key)]);
      const versions = hist.filter((h) => h.old_value && h.old_value !== tg.cur);
      s.querySelector('[data-hist]').innerHTML = `
        ${row && tg.key.startsWith('ui.') && (row.hint || '').startsWith('in-app:') ? `<button class="btn btn-ghost btn-block" data-reset>أرجِعه إلى النصّ الأصليّ</button>` : ''}
        ${hist.length ? `<p class="label" style="margin-top:14px">السجلّ</p>${hist.map((h, k) => `
          <div class="snote"><span class="hint">${esc((h.actor_label || '').split('@')[0])} · ${ago(h.at)}</span>
          ${h.old_value != null || h.new_value != null ? `<p class="diff" style="margin-top:6px">${diff(h.old_value || '', h.new_value || '')}</p>` : ''}
          ${h.old_value && versions.includes(h) ? `<button class="btn btn-quiet btn-sm" data-back-to="${k}" style="margin-top:6px">أرجِع هذه الصيغة السابقة</button>` : ''}</div>`).join('')}`
          : '<p class="hint" style="margin-top:8px">لم يُعدَّل هذا السطر من قبل.</p>'}`;
      s.querySelector('[data-reset]')?.addEventListener('click', async () => {
        try { await A.resetText(tg.key); setLocal(tg.key, null); refresh(); close(); toast('عاد السطر إلى نصّه الأصليّ.'); }
        catch (err) { note(s, human(err)); }
      });
      s.querySelectorAll('[data-back-to]').forEach((b) => b.onclick = async () => {
        try { await commit(tg.key, hist[+b.dataset.backTo].old_value, tg.orig, tg.where); close(); toast('أُرجعت الصيغة السابقة.'); }
        catch (err) { note(s, human(err)); }
      });
    } catch { s.querySelector('[data-hist]').innerHTML = ''; }
  }

  /* ── rewrite one block of a page, from the page itself ────────────── */
  async function editPageBlock(pid, idx) {
    const p = await api.getPage(pid);
    if (!p) return toast('لم أجد الصفحة.');
    const isTitle = idx === 'title';
    const b = isTitle ? { text: p.title } : p.blocks[+idx];
    if (!b) return;
    const close = sheet(isTitle ? 'عنوان الصفحة' : 'تعديل في الصفحة', `<div class="stack" data-staff>
      <textarea class="input" id="pb" rows="${isTitle ? 2 : 6}">${esc(b.text || '')}</textarea>
      ${!isTitle && (b.t === 'verse' || b.t === 'hadith') ? `<input class="input" id="pr" value="${esc(b.ref || '')}" placeholder="المصدر">` : ''}
      <button class="btn btn-block" data-save>حفظ — يظهر للجميع فوراً</button>
      <button class="btn btn-ghost btn-block" data-open-editor>افتح محرّر الصفحة كاملة</button>
      <div data-note-slot></div></div>`);
    const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
    s.querySelector('[data-open-editor]').onclick = () => { close(); location.hash = `#/staff/page/${pid}`; };
    s.querySelector('[data-save]').onclick = async (e) => {
      const v = s.querySelector('#pb').value.trim();
      if (!v) return note(s, 'لا يمكن أن يكون فارغاً.');
      e.target.disabled = true;
      try {
        const blocks = p.blocks.map((x) => ({ ...x }));
        if (!isTitle) { blocks[+idx].text = v; const r = s.querySelector('#pr'); if (r) blocks[+idx].ref = r.value.trim(); }
        await api.savePage({ id: p.id, section: p.section, title: isTitle ? v : p.title, summary: p.summary, blocks, status: p.status });
        await refreshPages(); refresh(); close(); toast('حُفظ في الصفحة.');
      } catch (err) { e.target.disabled = false; note(s, human(err)); }
    };
  }

  /** A scholar's suggested wording, made live. */
  async function applySuggestion(n) {
    await commit(n.target_key, n.suggestion, n.target_text, (n.route || '').replace(/^#\/?/, '').split('/')[0]);
  }

  /* ══ people ═══════════════════════════════════════════════════════ */
  async function people(root, go) {
    setGround(null);
    const [ppl, inv] = await Promise.all([A.people(), A.invites()]);
    const grantable = isOwner ? ['writer', 'admin'] : ['writer'];
    const staff = ppl.filter((p) => p.roles.length);
    const name = (e) => (e || '').endsWith('@staff.invalid') ? e.split('@')[0].toUpperCase() : e;
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: 'الأشخاص', back: true, sub: `${toAr(ppl.length)} حساباً · ${toAr(staff.length)} في الفريق` })}
    <div class="wrap lift stack" data-screen="staff-people" data-noedit>
      ${card(`<b class="label">دعوة إلى الفريق</b>
        <p class="hint" style="margin-top:4px">اكتب بريده واختر دوره، ثمّ أرسل له رابط الدخول الخاصّ بدوره. يدخل بالبريد نفسه فتصله الصلاحيّة.</p>
        <input class="input" id="ie" type="email" dir="ltr" placeholder="name@example.com" style="margin-top:10px">
        <div class="stack" style="margin-top:10px">${grantable.map((r, n) => `
          <button class="choice" data-role="${r}" aria-pressed="${!n}"><span class="grow"><b>${ROLE_AR[r]}</b>
            <span class="hint" style="display:block">${ROLE_SUB[r]}</span></span><span class="tick">${icon('check', 'ic-sm')}</span></button>`).join('')}</div>
        <button class="btn btn-block" data-invite style="margin-top:12px">دعوة</button><div data-note-slot></div>`)}
      ${inv.length ? `<div class="sec">${secHead('دعوات لم تُستعمل بعد')}${card(`<div class="reg">${inv.map((i) => `
        <div class="reg-row" data-static><span class="grow"><span dir="ltr" style="display:block;text-align:end">${esc(i.email)}</span>
          <span class="hint">${ROLE_AR[i.role]} · ${ago(i.invited_at)}</span></span>
          <button class="btn btn-sm btn-quiet" data-cancel="${i.id}">إلغاء</button></div>`).join('')}</div>`, 'card-flush')}</div>` : ''}
      <div class="sec">${secHead('الفريق')}${card(`<div class="reg">${staff.map((p) => `
        <div class="reg-row" data-static><span class="grow"><span dir="ltr" style="display:block;text-align:end">${esc(name(p.email))}</span>
          <span class="hint">آخر دخول ${ago(p.last_seen) || '—'}</span></span>
          <span class="row" style="gap:6px;flex-wrap:wrap">${p.roles.map((r) => `<button class="tag" data-revoke="${p.user_id}" data-r="${r}" ${r === 'owner' || (!isOwner && r === 'admin') ? 'disabled' : ''}>${ROLE_AR[r]}${r === 'owner' || (!isOwner && r === 'admin') ? '' : ' ×'}</button>`).join('')}</span></div>`).join('')}</div>`, 'card-flush')}</div>
      <p class="hint">صلوات الناس ووصاياهم لا تظهر هنا، ولا تستطيع هذه اللوحة قراءتها أصلاً.</p>
      <div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
    let role = grantable[0];
    root.querySelectorAll('[data-role]').forEach((b) => b.onclick = () => {
      role = b.dataset.role; root.querySelectorAll('[data-role]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    root.querySelector('[data-invite]').onclick = async (e) => {
      e.target.disabled = true;
      try {
        const r = await A.invite(root.querySelector('#ie').value.trim(), role);
        note(root, r === 'granted' ? 'لديه حساب — أُعطي الدور الآن.' : 'سُجّلت الدعوة. تصله الصلاحيّة أوّل ما يدخل بهذا البريد.');
        setTimeout(() => people(root, go), 1200);
      } catch (err) { note(root, /Only|email/.test(err.message) ? err.message : human(err)); e.target.disabled = false; }
    };
    root.querySelectorAll('[data-cancel]').forEach((b) => b.onclick = async () => { await A.cancelInvite(b.dataset.cancel); people(root, go); });
    root.querySelectorAll('[data-revoke]').forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await A.revoke(b.dataset.revoke, b.dataset.r); people(root, go); }
      catch (err) { note(root, human(err)); b.disabled = false; }
    });
  }

  /* ══ errors ═══════════════════════════════════════════════════════ */
  async function errors(root, go) {
    setGround(null);
    const rows = await A.errors();
    const groups = {};
    for (const e of rows) (groups[e.code] ||= []).push(e);
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: 'الأخطاء', back: true, sub: `آخر ${toAr(rows.length)}، مجمّعة بالرمز.` })}
    <div class="wrap lift stack" data-screen="staff-errors" data-noedit>
      ${rows.length ? card(`<div class="reg">${Object.entries(groups).map(([code, es]) =>
        regRow({ label: `<span dir="ltr">${esc(code)}</span>`, sub: `${esc(String(es[0].message || '').slice(0, 90))} · ${ago(es[0].at)}`, fig: toAr(es.length), stat: true })).join('')}</div>`, 'card-flush')
        : card('<div class="empty"><p class="body">لا أخطاء. هكذا يجب أن تبقى.</p></div>')}
      <div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
  }

  return {
    editText, editPageBlock, applySuggestion,
    returnPage: (id, why) => A.setPageStatus(id, 'returned', why),
    routes: { '#/staff/people': people, '#/staff/errors': errors },
  };
}
