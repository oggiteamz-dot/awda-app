/**
 * staff/admin-requests.js — an admin's part of a request.
 *
 * ⛔ ADMIN CODE — imported by the console only (via admin.js).
 *   new                 approve (step 1) or decline with a reason
 *   approved / changes  mark that building started
 *   approved … changes  send what was made back to the person who asked (step 2 is theirs)
 *   closed              remove it
 */
import { card, esc, sheet } from '../core/ui.js';
import { human } from '../core/cloud.js';
import * as A from './admin-api.js';
import * as api from './api.js';
import { note, toast } from './common.js';
import { pageOption } from './requests.js';

export function requestAdmin() {
  function panel(r) {
    if (r.status === 'new') return card(`<b class="label">قرارك (الموافقة الأولى)</b>
      <p class="hint" style="margin-top:4px">إن وافقت، يدخل الطلب طابور التنفيذ. وإن رفضت، يصل السبب إلى صاحبه.</p>
      <textarea class="input" id="dn" rows="2" style="margin-top:10px" placeholder="ملاحظة لصاحب الطلب (مطلوبة عند الرفض)"></textarea>
      <button class="btn btn-block" data-decide="yes" style="margin-top:10px">موافقة</button>
      <button class="btn btn-ghost btn-block" data-decide="no" style="margin-top:8px">رفض مع السبب</button>`);
    if (['approved', 'building', 'changes'].includes(r.status)) return `
      ${r.status !== 'building' ? '<button class="btn btn-quiet btn-block" data-start>بدأ التنفيذ</button>' : ''}
      ${card(`<b class="label">أرسل ما صُنع لصاحب الطلب</b>
        <p class="hint" style="margin-top:4px">لا يظهر للناس قبل أن يعتمده صاحب الطلب. إن ربطته بصفحة، تُنشر الصفحة لحظة موافقته.</p>
        <textarea class="input" id="rn" rows="3" style="margin-top:10px" placeholder="ما الذي صُنع، وماذا يراجع"></textarea>
        <label class="label" for="rp" style="display:block;margin-top:12px">الصفحة <span class="hint">(اختياريّ)</span></label>
        <select class="input" id="rp" style="margin-top:8px"><option value="">— بلا صفحة —</option></select>
        <label class="label" for="rr" style="display:block;margin-top:12px">رابط أو شاشة في التطبيق <span class="hint">(اختياريّ)</span></label>
        <input class="input" id="rr" dir="ltr" style="margin-top:8px" placeholder="#/ihtidar  أو  https://…">
        <button class="btn btn-block" data-deliver style="margin-top:12px">أرسله للموافقة النهائيّة</button>`)}`;
    if (r.status === 'review') return '<p class="hint">أُرسل إلى صاحب الطلب، وينتظر موافقته النهائيّة.</p>';
    return '<button class="btn btn-danger btn-block" data-remove>حذف الطلب</button>';
  }

  function wire(root, r, again, go) {
    const busy = (b, on) => { b.disabled = on; };
    root.querySelectorAll('[data-decide]').forEach((b) => b.onclick = async () => {
      const ok = b.dataset.decide === 'yes', txt = root.querySelector('#dn').value.trim();
      if (!ok && !txt) return note(root, 'اكتب سبب الرفض.');
      busy(b, true);
      try { await A.decide(r.id, ok, txt); toast(ok ? 'وُفق على الطلب. دخل طابور التنفيذ.' : 'رُفض، ووصل السبب.'); again(); }
      catch (err) { note(root, human(err)); busy(b, false); }
    });
    root.querySelector('[data-start]')?.addEventListener('click', async () => {
      try { await A.startRequest(r.id); toast('عُلِّم: قيد التنفيذ.'); again(); } catch (err) { note(root, human(err)); }
    });
    const sel = root.querySelector('#rp');
    if (sel) api.teamPages().then((ps) => {
      sel.insertAdjacentHTML('beforeend', ps.filter((p) => p.status !== 'published' || p.id === r.result_page).map(pageOption).join(''));
      if (r.result_page) sel.value = r.result_page;
      if (r.result_route) root.querySelector('#rr').value = r.result_route;
      if (r.result_note) root.querySelector('#rn').value = r.result_note;
    }).catch(() => {});
    root.querySelector('[data-deliver]')?.addEventListener('click', async (e) => {
      const txt = root.querySelector('#rn').value.trim(), page = sel.value, route = root.querySelector('#rr').value.trim();
      if (!txt && !page && !route) return note(root, 'اكتب ما صُنع، أو اربطه بصفحة أو رابط.');
      if (route && !/^(#\/|https:\/\/)/.test(route)) return note(root, 'الرابط يبدأ بـ #/ أو https://');
      busy(e.target, true);
      try { await A.deliver(r.id, txt || null, page || null, route || null); toast('أُرسل لصاحب الطلب ليعتمده.'); again(); }
      catch (err) { note(root, human(err)); busy(e.target, false); }
    });
    root.querySelector('[data-remove]')?.addEventListener('click', () => {
      const close = sheet('حذف الطلب', `<div class="stack" data-staff><p class="body">يُحذف «${esc(r.title)}» ولا يمكن استرجاعه.</p>
        <button class="btn btn-danger btn-block" data-yes>نعم، احذفه</button></div>`);
      const s = document.querySelector('.sheet:last-of-type'); s.dataset.staff = '';
      s.querySelector('[data-yes]').onclick = async () => {
        try { await A.removeRequest(r.id); close(); toast('حُذف.'); go('#/staff/requests'); } catch (err) { toast(human(err)); }
      };
    });
  }
  return { panel, wire };
}
