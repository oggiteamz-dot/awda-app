/**
 * staff/layer.js — the staff tools, laid over the real app.
 *
 * ⛔ STAFF CODE — never copied into the user app.
 *
 * Staff see exactly what a person sees. A small bar floats above the tabs:
 *
 *   عرض      use the app normally
 *   تعديل    admins: tap any text and rewrite it — live for everyone at once.
 *            scholars: tap any text and propose new wording — nothing changes
 *            until an admin approves it (29 Oct 2026)
 *   ملاحظة   tap any line to leave a note, a suggested wording or a voice note;
 *            notes already left show as marks on the line
 *   رسم      circle anything on the screen and say what is wrong with it
 *   +        a new page, or a request (about this screen)
 *   لوحة     approvals (admins), requests, pages, notes, people, errors
 *
 * Which text a tap lands on is read from the point under the finger, so no
 * screen had to be rewritten to become editable.
 */
import { h, esc, icon, sheet } from '../core/ui.js';
import { infoFor, screenOf, norm, editable } from '../core/overrides.js';
import { originalOf } from '../core/text.js';
import { signOut, human } from '../core/cloud.js';
import * as api from './api.js';
import { ROLE_AR, screenAr, toast, ago, diff } from './common.js';
import { toAr } from '../core/num.js';
import { recorder, recBlock } from './recorder.js';
import { requestFrom } from './requests.js';

const DIGIT = /[0-9٠-٩]/;

export function startLayer({ who, admin = null }) {
  const isAdmin = !!admin;
  let mode = 'view';
  let openNotes = [];
  let waiting = null;   // staff_inbox(): what is waiting for this person

  /* ── the bar ─────────────────────────────────────────────────────────── */
  const bar = h(`<div class="sbar" data-staff role="toolbar" aria-label="أدوات الفريق">
    <div class="sbar-seg" role="radiogroup" aria-label="الوضع">
      <button role="radio" data-m="view">${icon('play', 'ic-sm')}<span>عرض</span></button>
      <button role="radio" data-m="edit">${icon('edit', 'ic-sm')}<span>تعديل</span></button>
      <button role="radio" data-m="note">${icon('doc', 'ic-sm')}<span>ملاحظة</span></button>
    </div>
    <button class="sbar-btn" data-draw aria-label="ارسم على الشاشة">${icon('edit')}</button>
    <button class="sbar-btn" data-newpage aria-label="صفحة أو طلب جديد">${icon('plus')}</button>
    <button class="sbar-btn" data-panel aria-label="لوحة الفريق">${icon('grid')}<b class="sbar-badge" hidden></b></button>
  </div>`);
  const hint = h(`<div class="shint" data-staff hidden></div>`);
  document.body.append(bar, hint);

  const setMode = (m) => {
    mode = m;
    document.body.dataset.staffMode = m;
    bar.querySelectorAll('[data-m]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.m === m)));
    hint.hidden = m === 'view';
    hint.textContent = m === 'edit'
      ? (isAdmin ? 'وضع التعديل — اضغط أيّ نصّ لتعيد كتابته' : 'وضع التعديل — اضغط أيّ نصّ لتقترح صياغته. لا يتغيّر شيء قبل موافقة المدير')
      : 'وضع الملاحظات — اضغط سطراً لتترك ملاحظة';
    mark();
  };
  bar.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => setMode(b.dataset.m));
  bar.querySelector('[data-draw]').onclick = () => draw();
  bar.querySelector('[data-newpage]').onclick = () => {
    const here = location.hash.split('?')[0] || '#/home';
    const close = sheet('جديد', `<div class="stack" data-staff>
      <button class="choice" data-new="page"><span class="grow"><b>صفحة جديدة</b><span class="hint" style="display:block">${isAdmin ? 'تكتبها وتنشرها' : 'تكتبها، وتُنشر بعد موافقة المدير'}</span></span>${icon('next', 'ic-sm')}</button>
      <button class="choice" data-new="req"><span class="grow"><b>طلب</b><span class="hint" style="display:block">نصّ طويل، تسجيل صوتيّ، «اصنعوا هذا»، «غيّروا هذا»</span></span>${icon('next', 'ic-sm')}</button>
      ${here.startsWith('#/staff') ? '' : `<button class="choice" data-new="req-here"><span class="grow"><b>طلب عن هذه الشاشة</b><span class="hint" style="display:block">${esc(screenAr(here))}</span></span>${icon('next', 'ic-sm')}</button>`}
    </div>`);
    const sh = document.querySelector('.sheet:last-of-type'); sh.dataset.staff = '';
    sh.querySelectorAll('[data-new]').forEach((b) => b.onclick = () => {
      close(); setMode('view');
      if (b.dataset.new === 'page') location.hash = '#/staff/page/new';
      else { requestFrom(b.dataset.new === 'req-here' ? here : ''); location.hash = '#/staff/request/new'; }
    });
  };
  bar.querySelector('[data-panel]').onclick = () => panel();

  /* ── what can be tapped ──────────────────────────────────────────────── */
  const scopeRoots = () => [document.getElementById('view'), document.getElementById('tabs'), ...document.querySelectorAll('.sheet:not([data-staff])')].filter(Boolean);
  function mark() {
    document.querySelectorAll('[data-ed]').forEach((e) => e.removeAttribute('data-ed'));
    document.querySelectorAll('[data-has-note]').forEach((e) => e.removeAttribute('data-has-note'));
    if (mode === 'view') return drawings(false);
    const here = location.hash.split('?')[0] || '#/home';
    const noted = new Map();
    for (const n of openNotes) if (n.target_key && n.route === here) noted.set(n.target_key, (noted.get(n.target_key) || 0) + 1);
    for (const root of scopeRoots()) {
      for (const [node, info] of editable(root)) {
        node.parentElement.setAttribute('data-ed', '');
        if (noted.has(info.key)) node.parentElement.setAttribute('data-has-note', noted.get(info.key));
      }
      root.querySelectorAll('[data-k]').forEach((el) => {
        el.setAttribute('data-ed', '');
        if (noted.has(el.dataset.k)) el.setAttribute('data-has-note', noted.get(el.dataset.k));
      });
      root.querySelectorAll('[data-pk]').forEach((el) => {
        el.setAttribute('data-ed', '');
        const k = 'page.' + el.dataset.pk.replace(':', '.');
        if (noted.has(k)) el.setAttribute('data-has-note', noted.get(k));
      });
    }
    drawings(mode === 'note');
  }
  // Sheets and late renders appear after the hook; mark them too.
  let t0 = 0;
  new MutationObserver(() => { if (mode === 'view') return; clearTimeout(t0); t0 = setTimeout(mark, 60); })
    .observe(document.body, { childList: true, subtree: true });

  /** The text node under a point on the screen. */
  function nodeAt(x, y) {
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); return p?.offsetNode; }
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r?.startContainer; }
    return null;
  }
  /** Everything we know about the line that was tapped. */
  function targetAt(e) {
    const el = e.target;
    const pk = el.closest?.('[data-pk]');
    if (pk) { const [pid, idx] = pk.dataset.pk.split(':'); return { page: true, pid, idx, key: `page.${pid}.${idx}`, cur: norm(pk.textContent) }; }
    const ek = el.closest?.('[data-k]');
    if (ek) { const key = ek.dataset.k; return { key, orig: originalOf(key) || norm(ek.textContent), cur: norm(ek.textContent), where: screenOf(), named: true }; }
    let node = nodeAt(e.clientX, e.clientY);
    if (!node || node.nodeType !== 3 || !el.contains(node)) {
      // fall back to the first editable text inside the tapped element
      node = [...(el.childNodes || [])].find((n) => n.nodeType === 3 && infoFor(n)) || null;
    }
    const info = node && infoFor(node);
    if (!info) return { none: true, digits: DIGIT.test(norm(el.textContent || '')) };
    return { ...info, cur: norm(node.data) };
  }

  document.addEventListener('click', (e) => {
    if (mode === 'view' || e.target.closest('[data-staff]')) return;
    if (!e.target.closest('#view,#tabs,.sheet') || location.hash.startsWith('#/staff')) return;
    e.preventDefault(); e.stopPropagation();
    const tg = targetAt(e);
    if (tg.none) return toast(tg.digits ? 'هذا رقمٌ يحسبه التطبيق، فلا يُعدَّل باليد.' : 'اضغط على سطرٍ مكتوب.');
    if (mode === 'edit' && admin) {
      if (tg.page) return admin.editPageBlock(tg.pid, tg.idx);
      return admin.editText(tg);
    }
    if (mode === 'edit') return tg.page ? proposeBlock(tg) : noteSheet({ target: tg, wording: true });
    noteSheet({ target: tg });
  }, true);
  // In edit and note modes a tap selects a line; it must not also drag, open or navigate.
  for (const ev of ['pointerdown', 'pointerup']) {
    document.addEventListener(ev, (e) => {
      if (mode !== 'view' && !e.target.closest('[data-staff]') && e.target.closest('#view,#tabs') && !location.hash.startsWith('#/staff')) e.stopPropagation();
    }, true);
  }

  /* ── a note ──────────────────────────────────────────────────────────── */
  function noteSheet({ target = null, drawing = null, at = null, wording = false } = {}) {
    const here = location.hash.split('?')[0] || '#/home';
    const existing = target ? openNotes.filter((n) => n.target_key === target.key && n.route === here) : [];
    let audio = null;
    const close = sheet(wording ? 'اقتراح صياغة' : 'ملاحظة', `<div class="stack" data-staff>
      ${wording ? '<p class="hint">تصل صياغتك إلى المدير. لا يتغيّر النصّ عند الناس قبل موافقته.</p>' : ''}
      ${target ? `<div class="squote"><span class="kicker-ar">${esc(screenAr(here))}</span><p>${esc(target.cur)}</p></div>` : ''}
      ${drawing ? `<img class="sdraw-prev" src="${drawing}" alt="ما رسمته">` : ''}
      ${existing.length ? `<div class="stack">${existing.map(noteCard).join('')}</div>` : ''}
      ${target && !target.page && wording ? `<label class="label" for="sg">الصياغة التي تقترحها</label>
      <textarea class="input" id="sg" rows="${Math.min(10, Math.max(3, Math.ceil((target.cur || '').length / 34)))}">${esc(target.cur)}</textarea>` : ''}
      <label class="label" for="nt">${wording ? 'لماذا؟ <span class="hint">(اختياريّ)</span>' : 'ملاحظتك'}</label>
      <textarea class="input" id="nt" rows="3" placeholder="${wording ? 'سبب التعديل، أو مصدره' : 'ما الذي يحتاج تصحيحاً، ولماذا؟'}"></textarea>
      ${target && !target.page && !wording ? `<label class="label" for="sg">صياغة مقترحة <span class="hint">(اختياريّ)</span></label>
      <textarea class="input" id="sg" rows="3">${esc(target.cur)}</textarea>` : ''}
      ${recBlock('note')}
      <button class="btn btn-block" data-save-note>${wording ? 'أرسل الاقتراح للموافقة' : 'حفظ الملاحظة'}</button>
      <div data-note-slot></div></div>`);
    const s = document.querySelector('.sheet:last-of-type');
    s.dataset.staff = '';
    wireNoteCards(s, close);
    recorder(s, (a) => { audio = a; }, 'note');
    s.querySelector('[data-save-note]').onclick = async (ev) => {
      const note = s.querySelector('#nt').value.trim();
      const sgEl = s.querySelector('#sg');
      const suggestion = sgEl && sgEl.value.trim() !== (target?.cur || '') ? sgEl.value.trim() : null;
      if (wording && !suggestion) return toast('غيّر النصّ أوّلاً، ثمّ أرسل.');
      if (!note && !suggestion && !audio && !drawing) return toast('اكتب ملاحظة، أو اقترح صياغة، أو سجّل صوتاً.');
      ev.target.disabled = true; ev.target.textContent = 'يُحفَظ…';
      try {
        const row = await api.addNote({
          route: here, target_key: target?.key || null, target_text: target?.cur || null,
          note: note || null, suggestion, audio, drawing,
          scroll_y: at?.y ?? null, view_w: at?.w ?? null, view_h: at?.h ?? null,
        });
        openNotes.unshift(row); close(); toast(wording ? 'أُرسل الاقتراح. لا يتغيّر شيء قبل موافقة المدير.' : 'حُفظت الملاحظة. يراها الفريق فقط.'); mark(); reloadNotes();
      } catch (err) {
        window.reportError?.(err, 'saving a note', 'NOTE_SAVE_FAILED');
        ev.target.disabled = false; ev.target.textContent = wording ? 'أرسل الاقتراح للموافقة' : 'حفظ الملاحظة'; toast(human(err));
      }
    };
  }

  /** One existing note, with what the viewer is allowed to do to it. */
  function noteCard(n) {
    const mine = n.author === who.user.id;
    return `<div class="snote" data-nid="${n.id}">
      <div class="between"><span class="hint">${esc(n.author_label || '')} · ${ago(n.created_at)}</span>
        ${n.status === 'resolved' ? '<span class="tag">تمّ</span>' : ''}</div>
      ${n.note ? `<p class="body" style="margin-top:6px">${esc(n.note)}</p>` : ''}
      ${n.suggestion ? `<p class="hint" style="margin-top:8px">الصياغة المقترحة</p><p class="diff">${diff(n.target_text || '', n.suggestion)}</p>` : ''}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">
        ${n.has_audio ? `<button class="btn btn-quiet btn-sm" data-play="${n.id}">${icon('play', 'ic-sm')} استمع</button>` : ''}
        ${n.has_drawing ? `<button class="btn btn-quiet btn-sm" data-show-draw="${n.id}">اعرض الرسم</button>` : ''}
        ${isAdmin && n.suggestion && n.target_key && !n.target_key.startsWith('page.') && n.status === 'open' ? `<button class="btn btn-sm" data-apply="${n.id}">طبّق الصياغة</button>` : ''}
        ${(isAdmin || mine) && n.status === 'open' ? `<button class="btn btn-ghost btn-sm" data-resolve="${n.id}">تمّ</button>` : ''}
        ${(isAdmin || mine) && n.status !== 'open' ? `<button class="btn btn-ghost btn-sm" data-reopen="${n.id}">أعد فتحها</button>` : ''}
      </div><div data-media="${n.id}"></div></div>`;
  }
  function wireNoteCards(root, after = () => {}) {
    const find = (id) => openNotes.find((n) => n.id === id) || root._notes?.find((n) => n.id === id);
    root.querySelectorAll('[data-play]').forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { const src = await api.noteMedia(b.dataset.play, 'audio'); root.querySelector(`[data-media="${b.dataset.play}"]`).innerHTML = `<audio controls autoplay src="${src}" style="width:100%;margin-top:8px"></audio>`; }
      catch (err) { toast(human(err)); b.disabled = false; }
    });
    root.querySelectorAll('[data-show-draw]').forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { const src = await api.noteMedia(b.dataset.showDraw, 'drawing'); root.querySelector(`[data-media="${b.dataset.showDraw}"]`).innerHTML = `<img class="sdraw-prev" src="${src}" alt="الرسم">`; }
      catch (err) { toast(human(err)); b.disabled = false; }
    });
    root.querySelectorAll('[data-resolve],[data-reopen]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.resolve || b.dataset.reopen, st = b.dataset.resolve ? 'resolved' : 'open';
      b.disabled = true;
      try { await api.setNoteStatus(id, st); await reloadNotes(); toast(st === 'resolved' ? 'أُغلقت الملاحظة.' : 'أُعيد فتح الملاحظة.'); after(); }
      catch (err) { toast(human(err)); b.disabled = false; }
    });
    root.querySelectorAll('[data-apply]').forEach((b) => b.onclick = async () => {
      const n = find(b.dataset.apply); if (!n || !admin) return;
      b.disabled = true;
      try { await admin.applySuggestion(n); await api.setNoteStatus(n.id, 'resolved'); await reloadNotes(); toast('طُبّقت الصياغة، وهي الآن ظاهرة للجميع.'); after(); }
      catch (err) { toast(human(err)); b.disabled = false; }
    });
  }

  /* ── a scholar's edit to one block of a page: sent as a proposal ───────── */
  async function proposeBlock(tg) {
    const p = await api.getPage(tg.pid);
    if (!p) return toast('لم أجد الصفحة.');
    const isTitle = tg.idx === 'title';
    const b = isTitle ? { text: p.title } : p.blocks[+tg.idx];
    if (!b) return;
    const close = sheet('اقتراح تعديل في الصفحة', `<div class="stack" data-staff>
      <p class="hint">يُرسَل اقتراحاً إلى المدير. لا تتغيّر الصفحة قبل موافقته.</p>
      <textarea class="input" id="pb" rows="${isTitle ? 2 : 6}">${esc(b.text || '')}</textarea>
      <textarea class="input" id="pw" rows="2" placeholder="لماذا؟ (اختياريّ)"></textarea>
      <button class="btn btn-block" data-send>أرسل للموافقة</button>
      <button class="btn btn-ghost btn-block" data-full>عدّل الصفحة كاملة</button></div>`);
    const sh = document.querySelector('.sheet:last-of-type'); sh.dataset.staff = '';
    sh.querySelector('[data-full]').onclick = () => { close(); setMode('view'); location.hash = `#/staff/page/${p.id}`; };
    sh.querySelector('[data-send]').onclick = async (e) => {
      const v = sh.querySelector('#pb').value.trim();
      if (!v) return toast('لا يمكن أن يكون فارغاً.');
      if (v === (b.text || '').trim()) return toast('غيّر النصّ أوّلاً.');
      e.target.disabled = true;
      try {
        const blocks = p.blocks.map((x) => ({ ...x }));
        if (!isTitle) blocks[+tg.idx].text = v;
        await api.propose({ page_id: p.id, title: isTitle ? v : p.title, summary: p.summary, blocks, note: sh.querySelector('#pw').value.trim() });
        close(); toast('أُرسل الاقتراح. لا يتغيّر شيء قبل موافقة المدير.'); reloadNotes();
      } catch (err) { e.target.disabled = false; toast(human(err)); }
    };
  }

  /* ── drawing on the screen ───────────────────────────────────────────── */
  function scroller() { const sc = document.getElementById('view-scroll'); return sc && sc.scrollHeight > sc.clientHeight + 2 && getComputedStyle(sc).overflowY !== 'visible' ? sc : null; }
  function draw() {
    const frame = (document.getElementById('frame') || document.body).getBoundingClientRect();
    const top = Math.max(0, frame.top), height = Math.min(innerHeight, frame.bottom) - top;
    const wrap = h(`<div class="sdraw" data-staff style="left:${frame.left}px;top:${top}px;width:${frame.width}px;height:${height}px">
      <canvas></canvas>
      <p class="sdraw-hint">ارسم حول ما تريد التعليق عليه</p>
      <div class="sdraw-bar">
        <button class="btn btn-ghost btn-sm" data-x>إلغاء</button>
        <button class="btn btn-quiet btn-sm" data-undo>تراجع</button>
        <button class="btn btn-sm" data-ok>التالي</button>
      </div></div>`);
    document.body.append(wrap);
    const cv = wrap.querySelector('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = frame.width * dpr; cv.height = height * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const ink = getComputedStyle(document.body).getPropertyValue('--acc').trim() || 'orange';
    const strokes = []; let cur = null;
    const paint = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = ink;
      for (const s of strokes) { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.onpointerdown = (e) => { cv.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push(cur); };
    cv.onpointermove = (e) => { if (cur) { cur.push(pos(e)); paint(); } };
    cv.onpointerup = () => { cur = null; };
    wrap.querySelector('[data-x]').onclick = () => wrap.remove();
    wrap.querySelector('[data-undo]').onclick = () => { strokes.pop(); paint(); };
    wrap.querySelector('[data-ok]').onclick = () => {
      if (!strokes.length) return toast('ارسم أوّلاً، ثمّ اضغط التالي.');
      const sc = scroller();
      const at = { y: Math.round((sc ? sc.scrollTop : scrollY) + (sc ? 0 : top)), w: Math.round(frame.width), h: Math.round(height) };
      const png = cv.toDataURL('image/png');
      wrap.remove();
      noteSheet({ drawing: png, at });
    };
  }
  /** Open drawings on this screen, laid where they were drawn (notes mode only). */
  let drawnFor = '';
  async function drawings(on) {
    const host = document.getElementById('app');
    const here = location.hash.split('?')[0] || '#/home';
    if (!on) { host?.querySelectorAll('.sdraw-layer').forEach((e) => e.remove()); drawnFor = ''; return; }
    if (!host || drawnFor === here || !openNotes.some((n) => n.route === here && n.has_drawing)) return;
    drawnFor = here;
    try {
      const rows = await api.drawingsFor(here);
      if ((location.hash.split('?')[0] || '#/home') !== here || mode !== 'note') return;
      host.style.position = 'relative';
      host.querySelectorAll('.sdraw-layer').forEach((e) => e.remove());
      for (const r of rows) {
        const img = h(`<img class="sdraw-layer" data-staff alt="" src="${r.drawing}">`);
        img.style.top = `${r.scroll_y || 0}px`;
        img.style.width = r.view_w ? `${Math.min(100, (r.view_w / host.clientWidth) * 100)}%` : '100%';
        host.append(img);
      }
    } catch (err) { drawnFor = ''; }
  }

  /* ── the panel ───────────────────────────────────────────────────────── */
  async function reloadNotes() {
    try { openNotes = await api.notes({ status: 'open' }); } catch { /* keep the last */ }
    waiting = await api.inbox().catch(() => waiting) || waiting;
    badge(); mark();
  }
  function badge() {
    const b = bar.querySelector('.sbar-badge'), n = waiting?.total || 0;
    b.hidden = !n; b.textContent = toAr(n);
  }
  function panel() {
    const w = waiting || {};
    const row = (go, ic, label, sub, count) => `<button class="reg-row" data-go-to="${go}">${icon(ic)}
      <span class="grow"><span style="display:block">${label}</span><span class="hint">${sub}</span></span>
      ${count ? `<span class="tag tag-acc">${toAr(count)}</span>` : ''}${icon('next', 'ic-sm')}</button>`;
    const close = sheet('لوحة الفريق', `<div class="stack" data-staff>
      <div class="card card-flush"><div class="reg">
        ${isAdmin ? row('#/staff/approvals', 'check', 'الموافقات', 'طلبات وصفحات وتعديلات وصياغات العلماء', (w.requests || 0) + (w.pages || 0) + (w.proposals || 0) + (w.wording || 0)) : ''}
        ${row('#/staff/requests', 'bell', 'الطلبات', isAdmin ? 'ما يُطلب صنعه، وما ينتظر التنفيذ' : 'ما طلبتَه، وما ينتظر موافقتك النهائيّة', isAdmin ? (w.to_build || 0) + (w.signoff || 0) : (w.signoff || 0))}
        ${isAdmin ? row('#/staff/pages', 'doc', 'الصفحات', 'كلّ صفحات المعرفة، المنشورة والمسوّدات', 0)
          : row('#/staff/pages', 'doc', 'صفحاتي', 'ما كتبتَه، وتعديلاتك المقترحة، وما أُعيد إليك', w.returned || 0)}
        ${row('#/staff/notes', 'doc', 'الملاحظات', 'كلّ ما تُرك على شاشات التطبيق', openNotes.length)}
        ${isAdmin ? row('#/staff/people', 'people', 'الأشخاص', 'دعوة عالم أو مدير، وإزالة صلاحيّة', 0) : ''}
        ${isAdmin ? row('#/staff/errors', 'alert', 'الأخطاء', 'ما تعطّل عند الناس، قبل أن يخبروك', 0) : ''}
      </div></div>
      <p class="hint">${esc(who.user.email?.endsWith('@staff.invalid') ? who.user.email.split('@')[0].toUpperCase() : who.user.email || '')} · ${who.roles.map((r) => ROLE_AR[r] || r).join('، ')}</p>
      <button class="btn btn-ghost btn-block" data-out>تسجيل الخروج</button></div>`);
    const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
    s.querySelectorAll('[data-go-to]').forEach((b) => b.onclick = () => { close(); setMode('view'); location.hash = b.dataset.goTo; });
    s.querySelector('[data-out]').onclick = async () => { await signOut(); location.reload(); };
  }

  // A staff sheet belongs to the screen it was opened on.
  addEventListener('hashchange', () => {
    document.querySelectorAll('.sheet[data-staff]').forEach((sh) => { sh.previousElementSibling?.classList.contains('scrim') && sh.previousElementSibling.remove(); sh.remove(); });
  });
  setMode('view');
  reloadNotes();
  return {
    /** Called by the shell after every screen is drawn. */
    after(hash) { drawnFor = ''; if (String(hash).startsWith('#/staff') && mode !== 'view') setMode('view'); else mark(); },
    reloadNotes, noteCard, wireNoteCards,
    get notes() { return openNotes; },
    setMode,
  };
}
