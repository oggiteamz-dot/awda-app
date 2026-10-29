/**
 * staff/requests.js — الطلبات: what the team asks to have made or changed.
 *
 * ⛔ STAFF CODE. Shared by both staff doors; the admin-only steps arrive through
 * `admin`, which only the console passes in, so the desk carries none of them.
 *
 * Two approvals, in this order (Hadi, 29 Oct 2026):
 *   1  a scholar files a request — a wall of text, a recording, "change this",
 *      "make this a page / a video" — and an ADMIN approves or declines it;
 *   2  the thing is made and sent back, and the person who ASKED approves it
 *      (which publishes it) or says what still needs changing.
 * An admin's own request skips step 1. The database enforces every step.
 */
import { head, card, icon, animateIn, esc, sheet } from '../core/ui.js';
import { setGround } from '../core/theme.js';
import { human } from '../core/cloud.js';
import { sectionByKey } from '../core/pages.js';
import * as api from './api.js';
import { ago, toast, note, wireNav, screenAr } from './common.js';
import { recorder, recBlock } from './recorder.js';
import { toAr } from '../core/num.js';

export const KIND_AR = { new_page: 'صفحة جديدة', change: 'تعديل على ما هو موجود', media: 'مادّة مرئيّة أو صوتيّة', question: 'سؤال', other: 'شيء آخر' };
const KIND_SUB = {
  new_page: 'نصّ يُبنى صفحةً في المعرفة', change: 'شيء في التطبيق يحتاج تغييراً',
  media: 'فيديو، رسوم متحرّكة، قصّة مصوّرة… من نصّ أو تسجيل', question: 'سؤال للفريق', other: '',
};
export const REQ_STATUS = {
  new: ['بانتظار موافقة المدير', 'tag-acc'], approved: ['وافق المدير — في الطابور', ''], building: ['قيد التنفيذ', ''],
  review: ['جاهز — بانتظار الموافقة النهائيّة', 'tag-acc'], changes: ['طُلبت تعديلات', 'tag-warn'],
  done: ['اعتُمد ونُشر', ''], declined: ['رُفض', 'tag-warn'], withdrawn: ['سُحب', ''],
};
const tagFor = (st) => { const [t, c] = REQ_STATUS[st] || [st, '']; return `<span class="tag ${c}">${t}</span>`; };
const who4 = (label) => { const s = String(label || ''); return s.endsWith('@staff.invalid') ? s.split('@')[0].toUpperCase() : s.split('@')[0]; };

/** The screen a request was started from (the bar sets it just before opening the form). */
let fromRoute = '';
export const requestFrom = (route) => { fromRoute = route || ''; };
const takeFrom = () => { const r = fromRoute; fromRoute = ''; return r; };

export function requestRoutes({ who, admin = null }) {
  const isAdmin = !!admin;
  const mine = (r) => r.author === who.user.id;
  const F = isAdmin
    ? [['decide', 'تحتاج قرارك', (r) => r.status === 'new'],
       ['build', 'للتنفيذ', (r) => ['approved', 'building', 'changes'].includes(r.status)],
       ['review', 'بانتظار الموافقة النهائيّة', (r) => r.status === 'review'],
       ['closed', 'منتهية', (r) => ['done', 'declined', 'withdrawn'].includes(r.status)]]
    : [['mine', 'طلباتي', (r) => mine(r) && !['done', 'declined', 'withdrawn'].includes(r.status)],
       ['review', 'تنتظر موافقتك', (r) => mine(r) && r.status === 'review'],
       ['all', 'كلّ طلبات الفريق', () => true],
       ['closed', 'منتهية', (r) => mine(r) && ['done', 'declined', 'withdrawn'].includes(r.status)]];
  let filter = F[0][0];

  /* ══ the list ════════════════════════════════════════════════════════ */
  async function list(root, go) {
    setGround(null);
    const at = location.hash;
    const all = await api.requests();
    if (location.hash !== at) return;   // moved on while loading
    if (!F.some(([k]) => k === filter)) filter = F[0][0];
    const rows = all.filter(F.find(([k]) => k === filter)[2]);
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: 'الطلبات', back: true,
      sub: isAdmin ? 'ما يطلبه العلماء والمديرون. توافق أوّلاً، ثمّ يعتمد صاحب الطلب ما صُنع.' : 'اطلب صفحة أو تعديلاً أو مادّة. لا يُنشر شيء قبل موافقة المدير ثمّ موافقتك.' })}
    <div class="wrap lift stack" data-screen="staff-requests" data-noedit>
      <button class="btn btn-block" data-go="#/staff/request/new">${icon('plus', 'ic-sm')} طلب جديد</button>
      <div class="seg seg-wrap" role="tablist">${F.map(([k, label, fn]) => `<button role="tab" aria-selected="${k === filter}" data-f="${k}">${label} <b class="n">${toAr(all.filter(fn).length)}</b></button>`).join('')}</div>
      ${rows.length ? card(`<div class="reg">${rows.map((r) => `
        <button class="reg-row" data-go="#/staff/request/${r.id}">
          <span class="grow"><b style="display:block">${esc(r.title)}</b>
            <span class="hint">${KIND_AR[r.kind] || ''} · ${esc(who4(r.author_label))} · ${ago(r.updated_at)}${r.has_audio ? ' · فيه تسجيل' : ''}</span></span>
          ${tagFor(r.status)}</button>`).join('')}</div>`, 'card-flush')
        : card(`<div class="empty"><p class="body">${filter === 'decide' ? 'لا طلبات تنتظر قرارك.' : filter === 'review' ? 'لا شيء ينتظر الموافقة النهائيّة.' : 'لا طلبات هنا.'}</p></div>`)}
      <div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
    root.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; list(root, go); });
  }

  /* ══ a new request ═══════════════════════════════════════════════════ */
  function form(root, go, from) {
    setGround(null);
    let kind = 'new_page', audio = null;
    root.innerHTML = `
    ${head({ kicker: 'الطلبات', title: 'طلب جديد', back: true })}
    <div class="wrap lift stack" data-screen="staff-request-new" data-noedit>
      ${from ? card(`<span class="kicker-ar">عن هذه الشاشة</span><p class="body" style="margin-top:4px">${esc(screenAr(from))}</p>`, 'card-preview') : ''}
      ${card(`<span class="label">ماذا تطلب؟</span>
        <div class="stack" style="margin-top:10px">${Object.keys(KIND_AR).map((k) => `
          <button class="choice" data-kind="${k}" aria-pressed="${k === kind}"><span class="grow"><b>${KIND_AR[k]}</b>
          ${KIND_SUB[k] ? `<span class="hint" style="display:block">${KIND_SUB[k]}</span>` : ''}</span><span class="tick">${icon('check', 'ic-sm')}</span></button>`).join('')}</div>`)}
      ${card(`<label class="label" for="rt">عنوان قصير</label>
        <input class="input" id="rt" maxlength="200" style="margin-top:8px" placeholder="مثلاً: صفحة عن قضاء الصيام">
        <label class="label" for="rb" style="display:block;margin-top:14px">النصّ <span class="hint">(الصقه كما هو، مهما طال)</span></label>
        <textarea class="input" id="rb" rows="10" style="margin-top:8px" placeholder="اكتب أو الصق هنا"></textarea>
        <p class="label" style="margin-top:14px">أو سجّل صوتاً <span class="hint">(حتّى نحو ٣٠ دقيقة)</span></p>
        ${recBlock('request')}`)}
      <p class="hint">${isAdmin ? 'طلبك لا يحتاج موافقة أولى. يصلك ما يُصنع لتعتمده.' : 'يصل الطلب إلى المدير أوّلاً. إن وافق، يُصنع، ثمّ يعود إليك لتعتمده قبل أن يراه أحد.'}</p>
      <button class="btn btn-block" data-send>${isAdmin ? 'سجّل الطلب' : 'أرسل الطلب'}</button>
      <div data-note-slot></div><div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
    recorder(root, (a) => { audio = a; }, 'request');
    root.querySelectorAll('[data-kind]').forEach((b) => b.onclick = () => {
      kind = b.dataset.kind; root.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    root.querySelector('[data-send]').onclick = async (e) => {
      const title = root.querySelector('#rt').value.trim(), body = root.querySelector('#rb').value.trim();
      if (title.length < 2) return note(root, 'اكتب عنواناً قصيراً للطلب.');
      if (!body && !audio && kind !== 'question' && kind !== 'other') return note(root, 'اكتب النصّ أو سجّل صوتاً.');
      e.target.disabled = true; e.target.textContent = 'يُرسَل…';
      try {
        const r = await api.fileRequest({ kind, title, body, audio, route: from || null });
        toast(isAdmin ? 'سُجّل الطلب.' : 'أُرسل الطلب. ينتظر موافقة المدير.');
        history.replaceState(null, '', `#/staff/request/${r.id}`); detail(root, go, r.id);
      } catch (err) {
        window.reportError?.(err, 'filing a request', 'REQUEST_SAVE_FAILED');
        e.target.disabled = false; e.target.textContent = isAdmin ? 'سجّل الطلب' : 'أرسل الطلب'; note(root, human(err));
      }
    };
  }

  /* ══ one request: where it is, and what you may do next ═══════════════ */
  async function detail(root, go, id) {
    setGround(null);
    const at = location.hash;
    const r = await api.getRequest(id);
    if (location.hash !== at) return;   // moved on while loading
    if (!r) { root.innerHTML = head({ title: 'الطلب غير موجود', back: true }); wireNav(root, go); return; }
    const steps = [['أُرسل', true], ['موافقة المدير', !['new', 'declined', 'withdrawn'].includes(r.status)],
      ['يُصنع', ['building', 'review', 'changes', 'done'].includes(r.status)], ['الموافقة النهائيّة', r.status === 'done'], ['نُشر', r.status === 'done']];
    const long = (r.body || '').length > 900;
    const iAsked = mine(r), canSign = r.status === 'review' && (iAsked || isAdmin);
    root.innerHTML = `
    ${head({ kicker: KIND_AR[r.kind] || 'طلب', title: esc(r.title), back: true, sub: `${tagFor(r.status)} <span class="hint">· ${esc(who4(r.author_label))} · ${ago(r.created_at)}</span>` })}
    <div class="wrap lift stack" data-screen="staff-request" data-noedit>
      ${card(`<ol class="ssteps" aria-label="مراحل الطلب">${steps.map(([t, on], i) => `<li data-on="${on}"><b>${toAr(i + 1)}</b><span>${t}</span></li>`).join('')}</ol>`)}
      ${r.status === 'declined' ? card(`<span class="kicker-ar">سبب الرفض</span><p class="body" style="margin-top:6px">${esc(r.decision_note || '')}</p>`, 'card-preview') : ''}
      ${r.status === 'changes' && r.signoff_note ? card(`<span class="kicker-ar">ما طُلب تعديله</span><p class="body" style="margin-top:6px">${esc(r.signoff_note)}</p>`, 'card-preview') : ''}
      ${['review', 'done', 'changes'].includes(r.status) && (r.result_note || r.result_page || r.result_route) ? card(`
        <span class="kicker-ar">ما صُنع</span>
        ${r.result_note ? `<p class="body" style="margin-top:6px;white-space:pre-wrap">${esc(r.result_note)}</p>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
          ${r.result_page ? `<button class="btn btn-ghost btn-sm" data-go="#/staff/page/${r.result_page}">${icon('doc', 'ic-sm')} افتح الصفحة</button>` : ''}
          ${r.result_route ? (/^https:\/\//.test(r.result_route) ? `<a class="btn btn-ghost btn-sm" href="${esc(r.result_route)}" target="_blank" rel="noopener">${icon('play', 'ic-sm')} شاهِده</a>`
            : `<button class="btn btn-ghost btn-sm" data-go="${esc(r.result_route)}">${icon('play', 'ic-sm')} اعرضه في التطبيق</button>`) : ''}
        </div>`) : ''}
      ${canSign ? card(`<b class="label">${iAsked ? 'موافقتك النهائيّة' : 'الموافقة النهائيّة (نيابةً عن صاحب الطلب)'}</b>
        <p class="hint" style="margin-top:4px">إن وافقت، يُنشر للناس الآن. وإن احتاج تعديلاً، اكتب ما يجب تغييره.</p>
        <textarea class="input" id="so" rows="3" style="margin-top:10px" placeholder="ملاحظة (مطلوبة إن طلبت تعديلاً)"></textarea>
        <button class="btn btn-block" data-sign="yes" style="margin-top:10px">أوافق — انشره</button>
        <button class="btn btn-ghost btn-block" data-sign="no" style="margin-top:8px">يحتاج تعديلاً</button>`) : ''}
      ${r.route ? card(`<span class="kicker-ar">عن الشاشة</span><button class="btn btn-quiet btn-sm" data-go="${esc(r.route)}" style="margin-top:6px">${esc(screenAr(r.route))}</button>`) : ''}
      ${r.body ? card(`<span class="kicker-ar">النصّ</span><div class="sbody" data-long="${long}"><p class="body" style="white-space:pre-wrap;margin-top:6px">${esc(r.body)}</p></div>
        ${long ? '<button class="btn btn-quiet btn-sm" data-more style="margin-top:8px">اقرأ الكلّ</button>' : ''}`) : ''}
      ${r.has_audio ? card(`<span class="kicker-ar">التسجيل</span><div data-audio style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-play>${icon('play', 'ic-sm')} استمع</button></div>`) : ''}
      ${r.decision_note && r.status !== 'declined' ? `<p class="hint">ملاحظة المدير: ${esc(r.decision_note)}</p>` : ''}
      ${isAdmin ? admin.panel(r) : ''}
      ${iAsked && ['new', 'approved'].includes(r.status) ? '<button class="btn btn-quiet btn-block" data-withdraw>اسحب الطلب</button>' : ''}
      <div data-note-slot></div><div style="height:90px"></div>
    </div>`;
    animateIn(root); wireNav(root, go);
    const again = () => detail(root, go, id);
    root.querySelector('[data-more]')?.addEventListener('click', (e) => { root.querySelector('.sbody').dataset.long = 'false'; e.target.remove(); });
    root.querySelector('[data-play]')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { root.querySelector('[data-audio]').innerHTML = `<audio controls autoplay src="${await api.requestAudio(id)}" style="width:100%"></audio>`; }
      catch (err) { note(root, human(err)); e.target.disabled = false; }
    });
    root.querySelectorAll('[data-sign]').forEach((b) => b.onclick = async () => {
      const ok = b.dataset.sign === 'yes', txt = root.querySelector('#so').value.trim();
      if (!ok && !txt) return note(root, 'اكتب ما يجب تعديله.');
      b.disabled = true;
      try { await api.signoff(id, ok, txt); toast(ok ? 'اعتُمد. هو الآن ظاهر للناس.' : 'أُرسلت التعديلات المطلوبة.'); again(); }
      catch (err) { note(root, human(err)); b.disabled = false; }
    });
    root.querySelector('[data-withdraw]')?.addEventListener('click', async () => {
      try { await api.withdrawRequest(id); toast('سُحب الطلب.'); again(); } catch (err) { note(root, human(err)); }
    });
    if (isAdmin) admin.wire(root, r, again, go);
  }

  const one = (root, go, id) => (!id || id === 'new' ? form(root, go, takeFrom()) : detail(root, go, id));
  return { '#/staff/requests': list, '#/staff/request': one };
}

/** The pages a finished request can point at, for the admin's "send it back" form. */
export const pageOption = (p) => `<option value="${p.id}">${esc(p.title)} — ${esc(sectionByKey(p.section)?.ar || '')}</option>`;
