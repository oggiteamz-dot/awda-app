/**
 * areas.js — الأقسام: the index, and the areas that have no content yet.
 *
 * WHY THIS FILE EXISTS. Home became a launcher, and a launcher whose cards open
 * nothing is worse than no launcher at all. The Software Quality-of-Life standard
 * is explicit about dead ends: every screen needs a way home and a next action.
 * So every card and every tab added to the navigation lands somewhere real, and
 * where the content is genuinely not written yet the screen SAYS SO rather than
 * showing an empty page that reads as a bug.
 *
 * The index is the second tier of the pattern the census found in Afterpay and
 * Binance: home shows the few, an index holds the many. Adding an area means one
 * row in main.js's AREAS plus one row in FULL below — nothing else.
 */
import { head, card, secHead, icon, animateIn } from '../core/ui.js';
import { toAr } from '../core/num.js';
import { setGround } from '../core/theme.js';
import { AREAS } from './main.js';

/* Everything the app contains, grouped the way a person would look for it.
   `ready` marks what actually has content behind it today — the index tells the
   truth about that instead of letting someone tap into an empty room. */
const FULL = [
  { g: 'العمل', rows: [
    { k: 'prayers', ar: 'الصلاة', sub: 'صلوات اليوم وأوقاتها', ic: 'prayer', ready: 1 },
    { k: 'qada', ar: 'القضاء', sub: 'الفوائت وتاريخ الفراغ', ic: 'qada', ready: 1 },
    { k: 'daily', ar: 'العمل اليوميّ', sub: 'الأدعية والأذكار', ic: 'moon', ready: 0 },
  ] },
  { g: 'المعرفة', rows: [
    { k: 'knowledge', ar: 'المعرفة', sub: 'الفقه والعقيدة', ic: 'knowledge', ready: 1 },
    { k: 'history', ar: 'التاريخ', sub: 'السيرة وأهل البيت', ic: 'doc', ready: 0 },
    { k: 'stories', ar: 'القصص', sub: 'قصص تُروى', ic: 'people', ready: 0 },
  ] },
  { g: 'ما بعد', rows: [
    { k: 'will', ar: 'الوصيّة', sub: 'وثيقة تُكتب مرّة واحدة', ic: 'will', ready: 1 },
    { k: 'ihtidar', ar: 'الاحتضار', sub: 'ما يُقال ويُفعل', ic: 'ihtidar', ready: 1 },
  ] },
];

const row = (r) => `
  <button class="reg-row" data-go="#/${r.k}">
    <span style="color:var(--acc)">${icon(r.ic)}</span>
    <span class="grow">
      <b class="h3">${r.ar}</b>
      <span class="hint">${r.sub}</span>
    </span>
    ${r.ready ? '' : '<span class="tag">قريباً</span>'}
    ${icon('next', 'ic-sm')}
  </button>`;

/* ══ الأقسام ═══════════════════════════════════════════════════════════════ */
export function index(root) {
  setGround(null);
  const total = FULL.reduce((n, g) => n + g.rows.length, 0);
  const ready = FULL.reduce((n, g) => n + g.rows.filter((r) => r.ready).length, 0);
  root.innerHTML = `
  ${head({ kicker: 'كلّ ما في التطبيق', title: 'الأقسام' })}
  <div class="wrap lift stack">
    ${FULL.map((g) => `
      <div class="sec">
        ${secHead(g.g, '')}
        ${card(`<div class="reg">${g.rows.map(row).join('')}</div>`, 'card-flush')}
      </div>`).join('')}
    <p class="hint" style="text-align:center">${toAr(ready)} من ${toAr(total)} أقسام جاهزة. البقيّة قيد الكتابة.</p>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
}

/* ══ the areas whose content is not written yet ════════════════════════════
   An honest empty state, not a blank screen: it names what will be here, says
   plainly that it is not here yet, and offers the two ways out. Nothing here
   pretends to be loading, and nothing apologises. */
const SOON = {
  history: { ar: 'التاريخ', ic: 'doc', line: 'السيرة، وأهل البيت، والأحداث التي بُنيت عليها المذاهب.' },
  stories: { ar: 'القصص', ic: 'people', line: 'قصص تُروى — للكبار وللصغار، بإسنادٍ يُذكر.' },
  daily: { ar: 'العمل اليوميّ', ic: 'moon', line: 'الأدعية والأذكار وسنن اليوم، بلا تتابع وبلا نقاط.' },
};

export const soon = (key) => function (root) {
  setGround(null);
  const a = SOON[key];
  root.innerHTML = `
  ${head({ kicker: 'قسم', title: a.ar,
    actions: `<button class="icon-btn" data-back aria-label="رجوع">${icon('next')}</button>` })}
  <div class="wrap lift stack">
    ${card(`<div class="empty">
      ${icon(a.ic, 'ic')}
      <p class="body" style="margin-bottom:8px">${a.line}</p>
      <p class="hint">هذا القسم لم يُكتب بعد. لا شيء هنا ناقص أو معطَّل — المحتوى قيد الإعداد.</p>
    </div>`)}
    <button class="btn btn-block" data-go="#/index">تصفّح الأقسام الجاهزة</button>
    <button class="btn btn-ghost btn-block" data-go="#/home">العودة إلى الرئيسيّة</button>
  </div>`;
  animateIn(root);
};

export const history = soon('history');
export const stories = soon('stories');
export const daily = soon('daily');
