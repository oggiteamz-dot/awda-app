/**
 * staff/pages.js — writing pages for المعرفة.
 *
 * ⛔ STAFF CODE.
 *
 *   A SCHOLAR writes a page, saves it as a draft, and sends it. It waits until
 *   an admin publishes it or returns it with a reason. A scholar never
 *   publishes. To change a page that is already published (or someone
 *   else's), the scholar edits it here and it is sent as a PROPOSAL: nothing
 *   on the page changes until an admin approves it (29 Oct 2026). The
 *   database enforces all of this.
 *
 *   AN ADMIN writes and publishes directly, rewrites any page (published ones
 *   too), approves or returns scholars' pages, and can restore any earlier
 *   version. Admin actions arrive through `tools`, passed in by the console;
 *   the scholars' desk passes none.
 */
import { head, card, icon, animateIn, esc, sheet } from '../core/ui.js';
import { setGround } from '../core/theme.js';
import { human } from '../core/cloud.js';
import { SECTIONS, sectionByKey, refreshPages } from '../core/pages.js';
import { renderBlocks } from '../screens/library.js';
import * as api from './api.js';
import { pageTag, ago, toast, wireNav } from './common.js';
import { toAr } from '../core/num.js';

const PROP_STATUS = { pending: ['بانتظار الموافقة', 'tag-acc'], approved: ['اعتُمد', ''], returned: ['أُعيد', 'tag-warn'], withdrawn: ['سُحب', ''] };
const propTag = (st) => { const [t, c] = PROP_STATUS[st] || [st, '']; return `<span class="tag ${c}">${t}</span>`; };
const KINDS = [['p', 'فقرة'], ['h', 'عنوان'], ['verse', 'آية'], ['hadith', 'حديث'], ['note', 'ملاحظة']];

export function pageRoutes({ who, tools = null }) {
  const isAdmin = !!tools;
  let filter = isAdmin ? 'pending' : 'mine';

  /* ══ the list ════════════════════════════════════════════════════════ */
  async function list(root, go) {
    setGround(null);
    const at = location.hash;
    const all = await api.teamPages();
    if (location.hash !== at) return;   // moved on while loading
    const F = isAdmin
      ? [['pending', 'بانتظار موافقتك', (p) => p.status === 'pending'], ['published', 'منشورة', (p) => p.status === 'published'],
        ['drafts', 'مسوّدات وأُعيدت', (p) => p.status === 'draft' || p.status === 'returned']]
      : [['mine', 'صفحاتي', (p) => p.author === who.user.id], ['published', 'المنشورة', (p) => p.status === 'published']];
    const props = isAdmin ? [] : (await api.proposals()).filter((x) => x.author === who.user.id);
    if (!isAdmin) F.push(['props', 'تعديلاتي المقترحة', () => false]);
    if (!F.some(([k]) => k === filter)) filter = F[0][0];
    const rows = all.filter(F.find(([k]) => k === filter)[2]);
    const titleOf = Object.fromEntries(all.map((p) => [p.id, p.title]));
    root.innerHTML = `
    ${head({ kicker: 'أدوات الفريق', title: isAdmin ? 'الصفحات والموافقات' : 'صفحاتي', back: true })}
    <div class="wrap lift stack" data-screen="staff-pages" data-noedit>
      <div class="seg" role="tablist">${F.map(([k, label, fn]) => `<button role="tab" aria-selected="${k === filter}" data-f="${k}">${label} <b class="n">${toAr(k === 'props' ? props.length : all.filter(fn).length)}</b></button>`).join('')}</div>
      <button class="btn btn-block" data-go="#/staff/page/new">${icon('plus', 'ic-sm')} صفحة جديدة</button>
      ${filter === 'props' ? (props.length ? card(`<div class="reg">${props.map((x) => `
        <button class="reg-row" data-go="#/staff/page/${x.page_id}">
          <span class="grow"><b style="display:block">${esc(titleOf[x.page_id] || x.title)}</b>
            <span class="hint">${ago(x.created_at)}${x.status === 'returned' && x.review_note ? ' · ' + esc(x.review_note.slice(0, 80)) : ''}</span></span>
          ${propTag(x.status)}</button>`).join('')}</div>`, 'card-flush')
        : card('<div class="empty"><p class="body">لم تقترح تعديلاً على صفحة بعد.</p><p class="hint">افتح أيّ صفحة منشورة وعدّلها؛ يصل تعديلك إلى المدير ليوافق عليه.</p></div>'))
      : rows.length ? card(`<div class="reg">${rows.map((p) => `
        <button class="reg-row" data-go="#/staff/page/${p.id}">
          <span class="grow"><b style="display:block">${esc(p.title)}</b>
            <span class="hint">${esc(sectionByKey(p.section)?.ar || '')} · ${esc((p.author_label || '').split('@')[0])} · ${ago(p.updated_at)}</span></span>
          ${pageTag(p.status)}</button>`).join('')}</div>`, 'card-flush')
        : card(`<div class="empty"><p class="body">${filter === 'pending' ? 'لا صفحات تنتظر موافقتك.' : 'لا صفحات هنا بعد.'}</p></div>`)}
      <div style="height:90px"></div>
    </div>`;
    animateIn(root);
    wireNav(root, go);
    root.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { filter = b.dataset.f; list(root, go); });
  }

  /* ══ the editor ══════════════════════════════════════════════════════ */
  async function editor(root, go, id) {
    setGround(null);
    let p = id && id !== 'new' ? await api.getPage(id) : null;
    if (id !== 'new' && !p) { root.innerHTML = `${head({ title: 'الصفحة غير موجودة', back: true })}`; return; }
    p = p || { section: 'will', title: '', summary: '', blocks: [{ t: 'p', text: '' }], status: 'draft' };
    const mine = !p.id || p.author === who.user.id;
    // a scholar changing a published page, or someone else's, proposes instead of saving
    const proposing = !isAdmin && !!p.id && (p.status === 'published' || !mine);
    const locked = false;
    const myProps = p.id ? (await api.proposals({ page: p.id })).filter((x) => isAdmin ? x.status === 'pending' : x.author === who.user.id) : [];
    if (id && !location.hash.includes(id)) return;   // moved on while loading
    const state = { ...p, blocks: (p.blocks || []).map((b) => ({ ...b })) };

    const paint = () => {
      root.innerHTML = `
      ${head({ kicker: p.id ? 'تحرير صفحة' : 'صفحة جديدة', title: p.id ? esc(p.title) : 'صفحة جديدة', back: true,
        sub: p.id ? `${pageTag(p.status)} <span class="hint">· ${esc((p.author_label || '').split('@')[0])}</span>` : '' })}
      <div class="wrap lift stack" data-screen="staff-page" data-noedit>
        ${p.status === 'returned' && p.review_note ? card(`<span class="kicker-ar">سبب الإعادة</span><p class="body" style="margin-top:6px">${esc(p.review_note)}</p>`, 'card-preview') : ''}
        ${p.status === 'pending' && !isAdmin ? card('<p class="hint">مُرسَلة، بانتظار موافقة المدير. ما زال يمكنك تعديلها؛ تبقى بانتظار الموافقة.</p>', 'card-preview') : ''}
        ${proposing ? card(`<p class="body">${p.status === 'published' ? 'هذه الصفحة منشورة.' : 'هذه الصفحة لعالمٍ آخر.'} عدّل ما تريد هنا، ويُرسَل تعديلك اقتراحاً إلى المدير. لا يتغيّر شيء في الصفحة قبل موافقته.</p>`, 'card-preview') : ''}
        ${myProps.length ? card(`<b class="label">${isAdmin ? 'تعديلات مقترحة على هذه الصفحة تنتظرك' : 'تعديلاتك المقترحة على هذه الصفحة'}</b>
          <div class="stack" style="margin-top:8px">${myProps.map((x) => `<div class="between"><span class="hint">${esc((x.author_label || '').split('@')[0])} · ${ago(x.created_at)}${x.status === 'returned' && x.review_note ? ' — ' + esc(x.review_note) : ''}</span>${propTag(x.status)}</div>`).join('')}</div>
          ${isAdmin ? '<button class="btn btn-quiet btn-sm" data-go="#/staff/approvals" style="margin-top:10px">راجِعها في الموافقات</button>' : ''}`) : ''}
        ${card(`
          <span class="label">الباب</span>
          <div class="chips" style="margin-top:8px">${SECTIONS.map((s) => `<button class="chip" data-sec="${s.k}" aria-pressed="${state.section === s.k}" ${locked || proposing ? 'disabled' : ''}>${s.ar}</button>`).join('')}</div>
          <label class="label" for="pt" style="display:block;margin-top:16px">العنوان</label>
          <input class="input" id="pt" maxlength="160" value="${esc(state.title)}" ${locked ? 'disabled' : ''} style="margin-top:8px">
          <label class="label" for="ps" style="display:block;margin-top:14px">سطر تحت العنوان <span class="hint">(اختياريّ)</span></label>
          <input class="input" id="ps" maxlength="400" value="${esc(state.summary || '')}" ${locked ? 'disabled' : ''} style="margin-top:8px">`)}
        <div class="stack" data-blocks>${state.blocks.map((b, i) => blockCard(b, i, locked)).join('')}</div>
        ${locked ? '' : `<div class="chips">${KINDS.map(([k, ar]) => `<button class="chip" data-add="${k}">${icon('plus', 'ic-sm')} ${ar}</button>`).join('')}</div>`}
        <div data-note-slot></div>
        <div class="stack sactions">
          <button class="btn btn-ghost btn-block" data-preview>${icon('play', 'ic-sm')} معاينة كما يراها الناس</button>
          ${actions()}
        </div>
        ${p.id && isAdmin ? `<button class="btn btn-quiet btn-block" data-revs>النسخ السابقة</button>` : ''}
        ${p.id && !proposing && (isAdmin || (mine && p.status !== 'published')) ? `<button class="btn btn-danger btn-block" data-del>حذف الصفحة</button>` : ''}
        <div style="height:90px"></div>
      </div>`;
      animateIn(root);
      wireNav(root, go);
      wire();
    };

    function actions() {
      if (locked) return '';
      if (proposing) return `
        <label class="label" for="pn">ما الذي عدّلته، ولماذا؟</label>
        <textarea class="input" id="pn" rows="3" placeholder="يقرؤه المدير قبل أن يوافق"></textarea>
        <button class="btn btn-block" data-propose>أرسل التعديل للموافقة</button>`;
      if (!isAdmin) return `
        <button class="btn btn-quiet btn-block" data-save="draft">حفظ كمسوّدة</button>
        <button class="btn btn-block" data-save="pending">${p.status === 'pending' ? 'حفظ التعديل (تبقى بانتظار الموافقة)' : 'إرسال للموافقة'}</button>`;
      if (p.status === 'pending') return `
        <button class="btn btn-block" data-save="published">موافقة ونشر</button>
        <button class="btn btn-ghost btn-block" data-return>إعادة إلى الكاتب مع السبب</button>
        <button class="btn btn-quiet btn-block" data-save="pending">حفظ تعديلاتي دون نشر</button>`;
      if (p.status === 'published') return `
        <button class="btn btn-block" data-save="published">حفظ — يظهر للجميع فوراً</button>
        <button class="btn btn-ghost btn-block" data-save="draft">سحبها من النشر</button>`;
      return `
        <button class="btn btn-block" data-save="published">نشر الآن</button>
        <button class="btn btn-quiet btn-block" data-save="draft">حفظ كمسوّدة</button>`;
    }

    function blockCard(b, i, ro) {
      const ref = b.t === 'verse' || b.t === 'hadith';
      return `<div class="card sblock" data-b="${i}">
        <div class="between" style="gap:8px">
          <div class="chips chips-sm">${KINDS.map(([k, ar]) => `<button class="chip" data-kind="${k}" aria-pressed="${b.t === k}" ${ro ? 'disabled' : ''}>${ar}</button>`).join('')}</div>
          ${ro ? '' : `<div class="row" style="gap:4px">
            <button class="icon-btn icon-sm" data-up aria-label="إلى الأعلى" ${i === 0 ? 'disabled' : ''}>${icon('up', 'ic-sm')}</button>
            <button class="icon-btn icon-sm" data-down aria-label="إلى الأسفل" ${i === state.blocks.length - 1 ? 'disabled' : ''}>${icon('down', 'ic-sm')}</button>
            <button class="icon-btn icon-sm" data-rm aria-label="حذف">${icon('close', 'ic-sm')}</button></div>`}
        </div>
        <textarea class="input ${b.t === 'verse' ? 'is-verse' : ''}" data-text rows="${b.t === 'h' ? 1 : 4}" ${ro ? 'disabled' : ''}
          placeholder="${b.t === 'verse' ? 'نصّ الآية كما في المصحف' : b.t === 'hadith' ? 'نصّ الحديث' : b.t === 'h' ? 'العنوان' : 'اكتب هنا'}" style="margin-top:10px">${esc(b.text || '')}</textarea>
        ${ref ? `<input class="input" data-ref ${ro ? 'disabled' : ''} value="${esc(b.ref || '')}" placeholder="${b.t === 'verse' ? 'السورة · رقم الآية' : 'المصدر'}" style="margin-top:8px">` : ''}
      </div>`;
    }

    function read() {
      state.title = root.querySelector('#pt').value.trim();
      state.summary = root.querySelector('#ps').value.trim();
      root.querySelectorAll('[data-b]').forEach((el) => {
        const b = state.blocks[+el.dataset.b];
        b.text = el.querySelector('[data-text]').value;
        const r = el.querySelector('[data-ref]'); if (r) b.ref = r.value.trim(); else delete b.ref;
      });
    }

    async function save(status) {
      read();
      const say = (m) => { root.querySelector('[data-note-slot]').innerHTML = `<p class="hint" role="alert">${icon('info', 'ic-sm')} ${esc(m)}</p>`; };
      if (state.title.length < 2) return say('اكتب عنواناً للصفحة.');
      const blocks = state.blocks.filter((b) => (b.text || '').trim());
      if (!blocks.length) return say('الصفحة فارغة. اكتب فقرة واحدة على الأقلّ.');
      root.querySelectorAll('[data-save],[data-return]').forEach((b) => { b.disabled = true; });
      try {
        const out = await api.savePage({ id: p.id, section: state.section, title: state.title, summary: state.summary, blocks, status });
        p = out; Object.assign(state, { ...out, blocks: out.blocks.map((b) => ({ ...b })) });
        await refreshPages();
        toast(out.status === 'published' ? 'نُشرت. تظهر الآن في المعرفة لكلّ الناس.'
          : out.status === 'pending' ? 'أُرسلت للموافقة.' : 'حُفظت.');
        if (!id || id === 'new') { history.replaceState(null, '', `#/staff/page/${out.id}`); }
        paint();
      } catch (err) {
        window.reportError?.(err, 'saving a page', 'PAGE_SAVE_FAILED');
        say(human(err));
        root.querySelectorAll('[data-save],[data-return]').forEach((b) => { b.disabled = false; });
      }
    }

    function wire() {
      root.querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => { read(); state.section = b.dataset.sec; paint(); });
      root.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => { read(); state.blocks.push({ t: b.dataset.add, text: '' }); paint(); root.querySelector(`[data-b="${state.blocks.length - 1}"] textarea`)?.focus(); });
      root.querySelectorAll('[data-b]').forEach((el) => {
        const i = +el.dataset.b;
        el.querySelectorAll('[data-kind]').forEach((b) => b.onclick = () => { read(); state.blocks[i].t = b.dataset.kind; paint(); });
        el.querySelector('[data-up]')?.addEventListener('click', () => { read(); [state.blocks[i - 1], state.blocks[i]] = [state.blocks[i], state.blocks[i - 1]]; paint(); });
        el.querySelector('[data-down]')?.addEventListener('click', () => { read(); [state.blocks[i + 1], state.blocks[i]] = [state.blocks[i], state.blocks[i + 1]]; paint(); });
        el.querySelector('[data-rm]')?.addEventListener('click', () => { read(); state.blocks.splice(i, 1); if (!state.blocks.length) state.blocks.push({ t: 'p', text: '' }); paint(); });
      });
      root.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => save(b.dataset.save));
      root.querySelector('[data-propose]')?.addEventListener('click', async (e) => {
        read();
        const say = (m) => { root.querySelector('[data-note-slot]').innerHTML = `<p class="hint" role="alert">${icon('info', 'ic-sm')} ${esc(m)}</p>`; };
        const blocks = state.blocks.filter((b) => (b.text || '').trim());
        if (state.title.length < 2 || !blocks.length) return say('العنوان والنصّ مطلوبان.');
        const same = state.title === p.title && (state.summary || '') === (p.summary || '') && JSON.stringify(blocks) === JSON.stringify(p.blocks);
        if (same) return say('لم تغيّر شيئاً بعد.');
        e.target.disabled = true; e.target.textContent = 'يُرسَل…';
        try {
          await api.propose({ page_id: p.id, title: state.title, summary: state.summary, blocks, note: root.querySelector('#pn').value.trim() });
          toast('أُرسل التعديل. لا يتغيّر شيء قبل موافقة المدير.'); editor(root, go, p.id);
        } catch (err) {
          window.reportError?.(err, 'proposing a page edit', 'PROPOSAL_SAVE_FAILED');
          e.target.disabled = false; e.target.textContent = 'أرسل التعديل للموافقة'; say(human(err));
        }
      });
      root.querySelector('[data-preview]').onclick = () => {
        read();
        sheet('معاينة', `<article class="spreview"><p class="kicker-ar">${esc(sectionByKey(state.section)?.ar || '')}</p>
          <h2 class="display" style="font-size:26px;line-height:1.35">${esc(state.title || 'بلا عنوان')}</h2>
          ${state.summary ? `<p class="body soft" style="margin-top:8px">${esc(state.summary)}</p>` : ''}
          <div class="rule" style="margin-block:14px"></div>${renderBlocks({ blocks: state.blocks.filter((b) => (b.text || '').trim()) })}</article>`);
        document.querySelector('.sheet:last-of-type').dataset.staff = '';
      };
      root.querySelector('[data-return]')?.addEventListener('click', () => {
        read();
        const close = sheet('إعادة إلى الكاتب', `<div class="stack" data-staff>
          <p class="hint">اكتب السبب. يصله كما هو، ولا تُقبل إعادة بلا سبب.</p>
          <textarea class="input" id="why" rows="4"></textarea>
          <button class="btn btn-block" data-why>إعادة</button></div>`);
        const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
        s.querySelector('[data-why]').onclick = async () => {
          const why = s.querySelector('#why').value.trim();
          if (!why) return toast('السبب مطلوب.');
          try { p = await tools.returnPage(p.id, why); Object.assign(state, p); close(); toast('أُعيدت إلى الكاتب مع السبب.'); paint(); }
          catch (err) { toast(human(err)); }
        };
      });
      root.querySelector('[data-revs]')?.addEventListener('click', async () => {
        const revs = await api.pageRevisions(p.id);
        const close = sheet('النسخ السابقة', `<div class="stack" data-staff>${revs.length ? revs.map((r, k) => `
          <div class="snote"><div class="between"><b>${esc(r.title || '')}</b>${pageTag(r.status)}</div>
            <p class="hint">${esc((r.actor_label || '').split('@')[0])} · ${ago(r.at)}</p>
            <button class="btn btn-quiet btn-sm" data-restore="${k}" style="margin-top:8px">ضعها في المحرّر</button></div>`).join('')
          : '<p class="hint">لا نسخ سابقة بعد.</p>'}</div>`);
        const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
        s.querySelectorAll('[data-restore]').forEach((b) => b.onclick = () => {
          const r = revs[+b.dataset.restore];
          Object.assign(state, { title: r.title, summary: r.summary, blocks: (r.blocks || []).map((x) => ({ ...x })) });
          close(); paint(); toast('وُضعت النسخة في المحرّر. احفظ لتعتمدها.');
        });
      });
      root.querySelector('[data-del]')?.addEventListener('click', () => {
        const close = sheet('حذف الصفحة', `<div class="stack" data-staff>
          <p class="body">تُحذف «${esc(p.title)}» ونسخها السابقة، ولا يمكن استرجاعها.</p>
          <button class="btn btn-danger btn-block" data-yes>نعم، احذفها</button></div>`);
        const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
        s.querySelector('[data-yes]').onclick = async () => {
          try { await api.deletePage(p.id); await refreshPages(); close(); toast('حُذفت.'); go('#/staff/pages'); }
          catch (err) { toast(human(err)); }
        };
      });
    }
    paint();
  }

  return { '#/staff/pages': list, '#/staff/page': editor };
}
