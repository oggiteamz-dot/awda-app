/**
 * main.js — الرئيسية · الصلاة · القضاء · التقويم · المعرفة
 *
 * ─── THE ONE RULE THAT SHAPES EVERY SCREEN IN THIS FILE ─────────────────────
 * NO GAMIFICATION ON A SACRED ACT. No streaks, no points, no badges, no
 * leaderboard, nothing turns red, nothing breaks. (SPEC NO-GO 2 and 3, and there
 * is a gate — no_gamification.mjs — that fails the build on the words.)
 *
 * The reason is not taste. A streak punishes illness, menstruation, travel and
 * grief — the exact circumstances under which Islamic law already excuses a
 * person — and it introduces riyāʾ, performing worship for a number, into an act
 * whose validity depends on intention. An app that shows you a broken chain for
 * a prayer you were legitimately exempt from is not motivating you; it is
 * lying to you about your own religion.
 *
 * So the substitutes, everywhere:
 *   a streak            → a dot grid of the last weeks, with no total and no
 *                         judgement. stoic.'s "one dot = one day" — you can see
 *                         a pattern and nobody scores it.
 *   a score going up    → a DEBT GOING DOWN toward zero.
 *   pass / fail         → a range. Eight Sleep reports "in range (±30m)" rather
 *                         than good/bad, and that is the honest register for a
 *                         person's own practice.
 *   "you broke it!"     → a fact. «بقيت صلاتان على هدف اليوم» is allowed.
 *                         Anything implying you have failed is not.
 *
 * Game mechanics ARE permitted on المعرفة — progress through a section, "not yet
 * read", "new this week". A lesson is not a sacred act. (D-011.)
 */
import { h, head, card, facetCard, secHead, regRow, icon, animateIn, sheet, esc } from '../core/ui.js';
import { toAr, num, fmtHijri, toHijri, HIJRI_MONTHS, WEEKDAYS, hijriMonthLength, hijriToGregorian, projectFinish } from '../core/num.js';
import { astroArc, turbah, muqarnasPath, rosette12 } from '../core/ornament.js';
import { countTo, pulse, rise } from '../core/motion.js';
import { setGround, state as theme } from '../core/theme.js';

/* The person's own rows, in the shape design build 8's demo object had. core/store.js. */
import { demo, togglePrayer, logQada, setPace } from '../core/store.js';
import { t } from '../core/text.js';
export { demo };
/* The areas shown on home. الصلاة and الأقسام are TABS and deliberately absent —
   see docs/HOME-AND-NAVIGATION.md §1. Adding an area is one row here. */
export const AREAS = [
  { k: 'knowledge', ar: 'المعرفة', sub: 'الفقه والعقيدة', ic: 'knowledge' },
  { k: 'history', ar: 'التاريخ', sub: 'السيرة وأهل البيت', ic: 'doc' },
  { k: 'stories', ar: 'القصص', sub: 'قصص تُروى', ic: 'people' },
  { k: 'daily', ar: 'العمل اليوميّ', sub: 'الأدعية والأذكار', ic: 'moon' },
  { k: 'ihtidar', ar: 'الاحتضار', sub: 'ما يُقال ويُفعل', ic: 'ihtidar' },
];

const PRAYERS = [['fajr', 'الصبح', '04:42'], ['dhuhr', 'الظهر', '12:08'], ['asr', 'العصر', '15:31'], ['maghrib', 'المغرب', '18:24'], ['isha', 'العشاء', '19:46']];
/* Which prayer's time we are in, from the approximate Beirut times above. The
   real times need the location-based calculation, which has its own spec. */
const NOW_IDX = (() => {
  const m = new Date().getHours() * 60 + new Date().getMinutes();
  let k = -1; PRAYERS.forEach(([, , hm], n) => { const [H, M] = hm.split(':').map(Number); if (m >= H * 60 + M) k = n; });
  return k < 0 ? 4 : k;
})();

export const hijToday = () => fmtHijri(toHijri(new Date(), demo.offset));
export const monthName = (m) => t('calendar.month.' + String(m).padStart(2, '0'), HIJRI_MONTHS[m - 1]);
const greet = () => { const hr = new Date().getHours(); return hr < 5 ? 'ليلة مباركة' : hr < 12 ? 'صباح الخير' : hr < 17 ? 'نهارك طيّب' : 'مساء الخير'; };

const pills = () => `<div class="pills">${PRAYERS.map(([k, ar, t], n) => `
  <button class="pill" data-p="${n}" aria-pressed="${demo.today[n] ? 'true' : 'false'}" ${n === NOW_IDX ? 'data-now="1"' : ''}>
    <span class="pill-check">${icon('check', 'ic-sm')}</span>
    <span>${ar}</span><span class="t">${t}</span></button>`).join('')}</div>`;

/* ══ الرئيسية ══════════════════════════════════════════════════════════════
   Never more than four cards. A feed you scroll is a feed you stop reading.
   Card 1 is ALWAYS today's prayers: the most-repeated action in the product
   should not cost a navigation. Cards 2–4 are chosen by what you actually use. */
export function home(root, go) {
  setGround(null);
  const p = projectFinish(demo.owed, demo.perDay, demo.offset);
  root.innerHTML = `
  ${head({
    kicker: hijToday(), title: demo.name ? `${greet()}، ${esc(demo.name)}` : greet(),
    actions: `<button class="icon-btn" data-go="#/account" aria-label="حسابي">${icon('account')}</button>
              <button class="icon-btn" data-styles aria-label="الأنماط">${icon('palette')}</button>`,
  })}
  <div class="wrap lift stack">

    ${demo.onboarded ? '' : `
    <button class="card card-tap card-glint" data-go="#/onboarding">
      <span class="kicker-ar">ابدأ من هنا</span>
      <div class="between" style="margin-top:4px"><span class="h2">المعايرة</span>${icon('next', 'ic-sm')}</div>
      <p class="hint" style="margin-top:8px">دقيقتان: تاريخ ميلادك ومتى بدأتَ الصلاة، فيُحسب القضاء أمامك سطراً سطراً.</p>
    </button>`}

    <!-- القضاء: shown ONLY if the person has a ledger. For everyone else it does not exist. -->
    ${demo.hasQada ? `
    <button class="card card-tap" data-go="#/qada">
      <div class="between">
        <span class="h3">القضاء</span>
        <span class="n n-md">بقي <span id="owed">٠</span></span>
      </div>
      <div class="bar" style="margin-top:12px"><i style="width:${Math.round(100 * (1 - demo.owed / (demo.startOwed || 1)))}%"></i></div>
      <p class="hint" style="margin-top:8px">تاريخ الفراغ · ${p ? fmtHijri(p.hijri) : '—'} · على وتيرتك الحاليّة</p>
    </button>` : ''}

    <!-- The five prayers are FIVE cards with a line of text above them, never five
         things inside one card. They are five acts, not one object. -->
    <div class="sec">
      <div class="between" style="margin-bottom:10px">
        <span class="kicker-ar">صلوات اليوم</span>
        <span class="hint">${PRAYERS[NOW_IDX][1]} · ${toAr(PRAYERS[NOW_IDX][2])}</span>
      </div>
      ${pills()}
    </div>

    <!-- THE AREAS. الصلاة and الأقسام have tabs, so by the navigation rule they do
         not also appear here: a tab is a place you return to, a card is a place you go to. -->
    <div class="sec">
      ${secHead('الأقسام', `<span class="kicker-ar">${toAr(AREAS.length)} من ${toAr(AREAS.length + 3)}</span>`)}
      <div class="bento">
        ${AREAS.map((a, i) => `
        <button class="card card-tap cell ${i === 0 ? 'b-wide' : ''}" data-go="#/${a.k}">
          <span style="color:var(--acc)">${icon(a.ic, 'ic-lg')}</span>
          <b class="h3">${a.ar}</b>
          <span class="hint">${a.sub}</span>
        </button>`).join('')}
      </div>
    </div>

    <button class="btn btn-ghost btn-block" data-go="#/index">كلّ الأقسام ${icon('next', 'ic-sm')}</button>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  const ow = root.querySelector('#owed'); if (ow) countTo(ow, demo.owed, { ms: 1000, fmt: (n) => num(n) });
  wirePills(root);
  pulse(root.querySelector('.pill[data-now="1"]'));
}

function wirePills(root) {
  root.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => {
    const n = +b.dataset.p;
    togglePrayer(n);
    b.setAttribute('aria-pressed', demo.today[n] ? 'true' : 'false');
    if (navigator.vibrate) navigator.vibrate(8);
  });
}

/* ══ الصلاة ═══════════════════════════════════════════════════════════════
   المسار / the day as a rail with a "now" marker — the best semantic fit in the
   whole layout atlas for this screen. A day IS a sequence, and the rail says so
   without implying you have to finish it.                                     */
export function prayers(root, go) {
  setGround(null);
  root.innerHTML = `
  ${head({ kicker: hijToday(), title: 'الصلاة', sub: 'اليوم، واحدةً واحدة.', back: true })}
  <div class="wrap lift stack">
    ${card(pills() + `<p class="hint" style="margin-top:12px">الوقت المعروض تقريبيّ لبيروت. مواقيت الصلاة المحسوبة بالموقع لها مواصفة منفصلة.</p>`)}
    <div class="sec">
      ${secHead('اليوم على المسار')}
      ${card(`<div style="position:relative;padding-inline-end:30px">
        <div style="position:absolute;inset-block:14px;inset-inline-end:13px;width:2px;background:var(--line)"></div>
        ${PRAYERS.map(([k, ar, t], n) => `
          <div class="row" style="position:relative;padding-block:14px;gap:14px">
            <span style="position:absolute;inset-inline-end:-24px;width:24px;height:24px;border-radius:50%;
              border:2px solid ${n <= NOW_IDX ? 'var(--acc)' : 'var(--line)'};
              background:${demo.today[n] ? 'var(--acc)' : 'var(--card)'};display:grid;place-items:center;
              color:var(--acc-ink)">${demo.today[n] ? icon('check', 'ic-sm') : ''}</span>
            <span class="grow"><b class="h3">${ar}</b>
              ${n === NOW_IDX ? '<span class="tag tag-acc" style="margin-inline-start:8px">الآن</span>' : ''}
              <span class="hint" style="display:block">${demo.today[n] ? 'سُجّلت' : n < NOW_IDX ? 'لم تُسجَّل بعد' : 'لم يدخل وقتها'}</span></span>
            <span class="n" style="font-family:Mono;color:var(--soft)">${t}</span>
          </div>`).join('')}
      </div>`)}
    </div>
    <div class="sec">
      ${secHead('الأسابيع الماضية')}
      ${card(`<div class="dotgrid">${demo.weeks.map((v) => `<i class="dot" data-v="${v}"></i>`).join('')}</div>
        <p class="hint" style="margin-top:12px">لا يوجد «تتابع» في هذا التطبيق. المرض والسفر والحيض والحزن أعذارٌ في الشرع، ولا يصحّ أن يكسر أيٌّ منها رقماً.</p>`)}
    </div>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root); wirePills(root);
}

/* ══ القضاء ═══════════════════════════════════════════════════════════════
   السجل / the register. Rows, hairlines, tabular figures, label right and
   figure left. A debt is a ledger and a ledger is rows — the atlas names this
   the best screen in the catalogue and it is right.
   The hero is the REMAINING count, decreasing. There is no lifetime ring: a ring
   implies a closable goal, and a lifetime ring sitting at 4% is an accusation. */
export function qada(root, go) {
  setGround(null);
  if (!demo.hasQada) {
    root.innerHTML = `${head({ kicker: 'القضاء', title: 'لا حساب بعد', back: true })}
    <div class="wrap lift stack">${card(`<p class="body">القضاء يُحسب من تاريخ ميلادك ومتى بدأتَ الصلاة. دقيقتان، وترى الحساب سطراً سطراً قبل أن يُحفظ.</p>
      <button class="btn btn-block" data-go="#/onboarding" style="margin-top:14px">ابدأ المعايرة</button>`)}</div>`;
    return animateIn(root);
  }
  const p = projectFinish(demo.owed, demo.perDay, demo.offset);
  const done = demo.startOwed - demo.owed;
  const left = (k) => demo.ledger.filter((r) => r.prayer === k).reduce((n, r) => n + r.owed - r.made_up, 0);
  const perType = PRAYERS.map(([k, ar]) => [ar, left(k)]);
  const c = demo.calc || {};
  const bd = c.birth ? new Date(c.birth) : null;
  const ageY = demo.gender === 'f' ? 9 : 15;
  const ob = bd ? toHijri(hijriToGregorian(toHijri(bd, demo.offset).y + ageY, toHijri(bd, demo.offset).m, toHijri(bd, demo.offset).d, demo.offset), demo.offset) : null;
  const days = Math.round((c.prayers || 0) / 5);
  root.innerHTML = `
  ${head({
    kicker: 'القضاء', title: '', back: true,
    actions: `<button class="icon-btn" data-edit aria-label="تعديل الحساب">${icon('gear')}</button>`,
    body: `<div style="position:relative;text-align:center;padding-block:14px 4px">
      <span class="kicker-ar">الباقي</span>
      <div class="n-hero" id="q" style="color:var(--head-ink);margin-top:8px">٠</div>
      <span class="kicker-ar" style="margin-top:8px">صلاة · من ${toAr(num(demo.startOwed))}</span>
      <div style="max-width:250px;margin:16px auto 0"><div class="bar" style="background:color-mix(in srgb,var(--head-ink) 22%,transparent)">
        <i style="width:${Math.round(100 * done / demo.startOwed)}%;background:var(--head-ink)"></i></div></div>
      <p class="kicker-ar" style="margin-top:10px">قضيتَ ${toAr(num(done))} حتّى الآن</p>
    </div>`,
  })}
  <div class="wrap lift stack">
    ${card(`<div class="between"><div><span class="kicker-ar">وتيرتك</span>
        <p class="h2" style="margin-top:4px"><span class="n">${toAr(demo.perDay)}</span> في اليوم</p></div>
      <button class="btn btn-sm btn-quiet" data-pace>تعديل</button></div>
      <div class="rule" style="margin-block:14px"></div>
      <div class="between"><span class="hint">تنتهي في</span><span class="n-md">${fmtHijri(p.hijri)}</span></div>
      <div class="between" style="margin-top:8px"><span class="hint">هذا الأسبوع</span>
        <span class="hint n">${toAr(demo.weekMadeUp)} من ${toAr(demo.perDay * 7)}${demo.weekMadeUp >= demo.perDay * 4 ? ' — ضمن المدى' : ''}</span></div>
      <p class="hint" style="margin-top:12px">«ضمن المدى» لا «ناجح». الوتيرة هدفٌ تقريبيّ لا امتحان، والأسبوع الذي ينزل قليلاً أسبوعٌ عاديّ.</p>`)}

    <div class="sec">
      ${secHead('السجلّ', `<span class="kicker-ar">بحسب الصلاة</span>`)}
      ${card(`<div class="reg">${perType.map(([lbl, n]) => regRow({ label: lbl, fig: num(n), sub: 'صلاة باقية', stat: true })).join('')}</div>`, 'card-flush')}
    </div>

    <div class="sec">
      ${secHead('الحساب')}
      ${card(`<div class="reg">
        ${regRow({ label: 'سنّ التكليف', fig: toAr(ageY) + ' سنة', sub: 'قمريّة — في الشيفرة، لا في المحتوى', stat: true })}
        ${regRow({ label: 'من تاريخ', fig: ob ? fmtHijri(ob) : '—', sub: 'يوم بلوغك التكليف', stat: true })}
        ${regRow({ label: 'الأيّام المحسوبة', fig: num(days), stat: true })}
        ${regRow({ label: 'المجموع', fig: num(demo.startOwed), sub: num(days) + ' × ٥', stat: true })}
      </div>
      <p class="hint" style="margin-top:14px">كلّ سطر هنا مبنيّ على شيء أدخلتَه أنت، ويمكنك تغييره فيُعاد الحساب فوراً. هذا تقدير، وليس حُكماً.</p>`, 'card-flush')}
    </div>

    ${card(`<div class="row" style="align-items:flex-start;gap:14px">
      <span style="color:var(--acc);flex:none">${turbah({ size: 46 })}</span>
      <div><b class="label">لماذا التربة علامةُ هذه الشاشة</b>
      <p class="hint" style="margin-top:4px">لأنّها ما تُوضع تحت الجبهة في كلّ سجدة — أكثر شيءٍ تكراراً في العبادة، وأليقُ ما يمثّل دَيناً يُقضى على مهل.</p></div></div>`)}

    <div style="height:20px"></div>
  </div>
  <button class="btn" data-log style="position:fixed;inset-block-end:88px;inset-inline-start:50%;transform:translateX(50%);
    z-index:35;box-shadow:0 6px 24px rgba(0,0,0,.22)">${icon('plus')} سجّل قضاءً</button>`;
  animateIn(root);
  countTo(root.querySelector('#q'), demo.owed, { ms: 1100, fmt: (n) => num(n) });
  root.querySelector('[data-log]').onclick = () => logSheet(root, go);
  root.querySelector('[data-pace]').onclick = () => paceSheet(root, go);
}

function logSheet(root, go) {
  const close = sheet('تسجيل قضاء', `
    <div class="stack">
      ${PRAYERS.map(([k, ar]) => `<div class="between" style="min-height:52px;border-bottom:1px solid var(--line)">
        <span class="label">${ar}</span>
        <div class="row" style="gap:10px">
          <button class="icon-btn btn-sm" data-m="-" data-k="${k}" style="width:40px;height:40px">${icon('down', 'ic-sm')}</button>
          <span class="n-md" data-v="${k}" style="min-width:34px;text-align:center">٠</span>
          <button class="icon-btn btn-sm" data-m="+" data-k="${k}" style="width:40px;height:40px">${icon('plus', 'ic-sm')}</button>
        </div></div>`).join('')}
      <p class="hint">سجّل ما قضيتَه فعلاً. الرقم ينقص من الدَّين مباشرةً، ولا يُضاف إلى أيّ نقاط — لا توجد نقاط.</p>
      <button class="btn btn-block" data-save>حفظ</button>
    </div>`);
  const vals = {};
  root.ownerDocument.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
    const k = b.dataset.k; vals[k] = Math.max(0, (vals[k] || 0) + (b.dataset.m === '+' ? 1 : -1));
    root.ownerDocument.querySelector(`[data-v="${k}"]`).textContent = toAr(vals[k]);
  });
  root.ownerDocument.querySelector('[data-save]').onclick = () => {
    const btn = root.ownerDocument.querySelector('[data-save]');
    btn.disabled = true; btn.textContent = 'يُحفَظ…';
    logQada(vals).then(() => { close(); qada(root, go); })
      .catch((err) => { window.reportError?.(err, 'logging qada', 'QADA_LOG_FAILED'); btn.disabled = false; btn.textContent = 'تعذّر الحفظ — أعد المحاولة'; });
  };
}

function paceSheet(root, go) {
  const close = sheet('وتيرة القضاء', `
    <div class="stack-lg">
      <div style="text-align:center"><div class="n-hero" id="pv2">${toAr(demo.perDay)}</div>
        <span class="kicker-ar" style="margin-top:6px">في اليوم</span></div>
      <input class="slider" type="range" min="1" max="15" value="${demo.perDay}" data-pace2>
      <div class="between"><span class="hint">تنتهي في</span><span class="n-md" id="fin3">—</span></div>
      <p class="hint">اختر رقماً تستطيعه في أسوأ أسابيعك لا في أفضلها.</p>
      <button class="btn btn-block" data-ok>تمّ</button></div>`);
  const d = root.ownerDocument;
  const upd = (v) => {
    d.querySelector('#pv2').textContent = toAr(v);
    d.querySelector('#fin3').textContent = fmtHijri(projectFinish(demo.owed, v, demo.offset).hijri);
  };
  upd(demo.perDay);
  d.querySelector('[data-pace2]').oninput = (e) => { demo.perDay = +e.target.value; upd(demo.perDay); };
  d.querySelector('[data-ok]').onclick = () => { setPace(demo.perDay).catch((err) => window.reportError?.(err, 'saving pace', 'PACE_SAVE_FAILED')); close(); qada(root, go); };
}
