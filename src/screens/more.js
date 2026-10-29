/**
 * more.js — التقويم and المعرفة. Split out of main.js to keep every file under
 * the 300-line cap; the screens themselves are unchanged from design build 8
 * except that the calendar now draws the person's real marks.
 */
import { head, card, secHead, icon, animateIn } from '../core/ui.js';
import { toAr, fmtHijri, toHijri, WEEKDAYS, hijriMonthLength, hijriToGregorian } from '../core/num.js';
import { muqarnasPath } from '../core/ornament.js';
import { setGround } from '../core/theme.js';
import { demo, setOffset } from '../core/store.js';
import { SECTIONS, allPages, inSection } from '../core/pages.js';
import { monthName } from './main.js';

/* ══ التقويم ══════════════════════════════════════════════════════════════
   A real Hijri month with your marks on it, and the ±1 sighting offset the spec
   requires. The app STATES that it is using the tabular reckoning rather than
   pretending the arithmetic and the sighting are the same thing — a person
   fixing the date of a fast or an anniversary needs to know which they have.  */
export function calendar(root, go) {
  setGround(null);
  const t = toHijri(new Date(), demo.offset);
  const len = hijriMonthLength(t.y, t.m);
  const first = hijriToGregorian(t.y, t.m, 1, demo.offset).getDay();
  const cells = [...Array(first).fill(null), ...Array.from({ length: len }, (_, k) => k + 1)];
  // A day's mark is what the person logged that day: all five, some, or nothing.
  // Nothing is not a failure and is drawn exactly like a day still to come.
  const mark = (d) => {
    const back = Math.round((new Date().setHours(0, 0, 0, 0) - hijriToGregorian(t.y, t.m, d, demo.offset).setHours(0, 0, 0, 0)) / 864e5);
    return back >= 0 && back < 49 ? demo.weeks[48 - back] : 0;
  };
  root.innerHTML = `
  ${head({ kicker: `${monthName(t.m)} ${toAr(t.y)}`, title: 'التقويم', back: true,
    actions: `<button class="icon-btn" data-off aria-label="تعديل الرؤية">${icon('moon')}</button>` })}
  <div class="wrap lift stack">
    ${card(`
      <div class="dotgrid" style="grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">
        ${WEEKDAYS.map((w) => `<span class="kicker-ar" style="text-align:center;font-size:9px">${w.slice(0, 3)}</span>`).join('')}</div>
      <div class="dotgrid" style="grid-template-columns:repeat(7,1fr);gap:4px">
        ${cells.map((d) => d === null ? '<span></span>' : `
          <button style="aspect-ratio:1;min-height:44px;border-radius:10px;border:1px solid ${d === t.d ? 'var(--acc)' : 'transparent'};
            background:${mark(d) === 1 ? 'color-mix(in srgb,var(--acc) 85%,var(--card))' : mark(d) === 'p' ? 'color-mix(in srgb,var(--acc) 40%,var(--card2))' : 'var(--card2)'};
            color:${mark(d) === 1 ? 'var(--acc-ink)' : 'var(--soft)'};font-family:Kufi;font-size:12px;font-weight:600;cursor:pointer" class="n">${toAr(d)}</button>`).join('')}
      </div>`)}
    ${card(`<div class="between"><div><span class="kicker-ar">اليوم</span>
        <p class="h3" style="margin-top:4px">${fmtHijri(t)}</p>
        <p class="hint">${WEEKDAYS[new Date().getDay()]} · ${new Date().toLocaleDateString('ar-EG')}</p></div>
      <span style="color:var(--acc)">${icon('moon', 'ic-lg')}</span></div>`)}
    ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('info')}
      <div><b class="label">تقويم حسابيّ، لا رؤية</b>
      <p class="hint" style="margin-top:4px">هذا التقويم الهجريّ الحسابيّ، وقد يختلف عن الرؤية بيوم. عدّاد الرؤية ±١ يحرّك كلّ التواريخ معاً، والتطبيق يقول أيّهما يستعمل بدل أن يخلط بينهما.</p>
      <div class="row" style="margin-top:12px;gap:8px">
        ${[-1, 0, 1].map((o) => `<button class="btn btn-sm ${demo.offset === o ? '' : 'btn-quiet'}" data-o="${o}">${o > 0 ? '+' : ''}${toAr(o)}</button>`).join('')}
      </div></div></div>`)}
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  root.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { setOffset(+b.dataset.o).catch((err) => window.reportError?.(err, 'saving offset', 'OFFSET_SAVE_FAILED')); calendar(root, go); });
}

/* ══ المعرفة ══════════════════════════════════════════════════════════════
   المجلة / editorial — the atlas names this the best home for a library, and
   eight sections as "departments" with pages as "articles" is the shape.
   The muqarnas shoulder on each section tile is the one place ornament becomes
   structure rather than background.                                          */
export function knowledge(root, go) {
  setGround(null);
  const total = allPages().length;
  root.innerHTML = `
  ${head({ kicker: 'المعرفة', title: 'ثمانية أبواب', sub: 'كلّ صفحة بقلم عالم، وبإذنٍ قبل النشر.', back: true })}
  <div class="wrap lift stack">
    ${card(`<div class="between"><div><span class="kicker-ar">في المكتبة الآن</span>
        <p class="h3" style="margin-top:4px">${total ? `${toAr(total)} ${total === 1 ? 'صفحة منشورة' : 'صفحات منشورة'}` : 'الصفحات قيد الكتابة'}</p></div>${icon('knowledge', 'ic-lg')}</div>
      <p class="hint" style="margin-top:10px">الدرس ليس عبادة، والعبادة لا تُقاس بنقاط. اقرأ ما تحتاجه، متى تحتاجه.</p>`)}
    <div class="bento" style="margin-top:4px">
      ${SECTIONS.map((s, k) => { const n = inSection(s.k).length; return `
        <div class="card card-tap cell ${k === 0 ? 'b-wide' : ''}" data-go="#/section/${s.k}" style="padding-top:22px">
          <svg viewBox="0 0 100 26" preserveAspectRatio="none" style="position:absolute;inset-block-start:0;inset-inline:0;height:16px;color:var(--acc);opacity:.16" aria-hidden="true">
            <path d="${muqarnasPath(100, 26, { step: 3, shoulder: .9, inset: .16 })}" fill="currentColor"/></svg>
          <div style="color:var(--acc)">${icon(s.ic, 'ic-lg')}</div>
          <div><b class="h3">${s.ar}</b><p class="hint">${n ? `${toAr(n)} ${n === 1 ? 'صفحة' : 'صفحات'}` : 'قيد الكتابة'}</p></div>
        </div>`; }).join('')}
    </div>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
}
