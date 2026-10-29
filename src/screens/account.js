/**
 * account.js — حسابي. The personal account screen, and nothing else.
 * The two staff surfaces moved to staff.js on 18 Sep — see the note below.
 *
 * THE THREE DOORS, corrected 18 Sep. This file used to claim that roles come
 * from the database and that "a person who types #/admin does not get in". On a
 * static site with no backend that was simply untrue — every deep link opened for
 * anyone. The staff screens now live in staff.js, which is NOT deployed to the
 * public app, and the staff build sits behind its own sign-in on its own URL.
 * A screen you do not ship is the only access control a static site really has.
 *
 * A scholar is ALSO a person, with their own prayers and their own will, so the
 * studio is an addition to the personal app rather than a replacement for it.
 *
 * And the publish rule, which is the reason the studio exists at all: a scholar
 * may write and correct any religious line and SUBMIT it. Only the owner
 * publishes. Not an admin, not a QC role — the owner. Every religious line in
 * this product is approved by one named human before a user ever sees it.
 */
import { head, card, secHead, regRow, icon, animateIn, sheet } from '../core/ui.js';
import { toAr } from '../core/num.js';
import { PALETTES, GROUNDS, state as theme, set as setTheme, setGround } from '../core/theme.js';
import { LAYOUTS, SURFACES } from '../core/layouts.js';
import { demo, forget } from '../core/store.js';
import { signOut } from '../core/cloud.js';
import { textCount } from '../core/text.js';
import { installCard, wireInstall } from '../core/pwa.js';
import { esc } from '../core/ui.js';
const BUILD = document.querySelector('meta[name="awda-build"]')?.content || 'dev';

export function account(root, go) {
  setGround(null);
  root.innerHTML = `
  ${head({ kicker: 'حسابي', title: demo.name ? esc(demo.name) : 'حسابي', back: true, sub: `<span dir="ltr">${esc(demo.email)}</span>` })}
  <div class="wrap lift stack">
    ${installCard('عَوْدة')}
    ${card(`<div class="reg">
      ${regRow({ label: 'الأنماط والألوان', sub: 'ثماني لوحات · اثنا عشر تخطيطاً', ic: 'palette', go: true })}
      ${regRow({ label: 'المعايرة', sub: demo.onboarded ? 'أعِد الحساب من جديد' : 'لم تُكمَل بعد', ic: 'qada', go: true })}
      ${regRow({ label: 'التذكير', fig: toAr(demo.remind?.length || 0), sub: 'الإشعارات تأتي مع النسخة القادمة', ic: 'bell', stat: true })}
    </div>`, 'card-flush')}
    ${card(`<span class="kicker-ar">إظهار النصّ القرآنيّ</span>
      <p class="hint" style="margin-top:6px">حين يكون مُوقَفاً، لا يُعرض أيّ نصّ قرآنيّ في التطبيق ويُستبدَل بإشارة — لمن هي حائض أو لمن ليس على وضوء.</p>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn btn-sm ${theme.quran === 'on' ? '' : 'btn-quiet'}" data-q="on">إظهار</button>
        <button class="btn btn-sm ${theme.quran === 'off' ? '' : 'btn-quiet'}" data-q="off">إيقاف</button>
      </div>`)}
    ${card(`<div class="reg">
      ${regRow({ label: 'نسخة البناء', fig: '<span dir="ltr">' + BUILD + '</span>', sub: toAr(textCount()) + ' سطراً منشوراً محمّلاً', stat: true })}
      ${regRow({ label: 'الاتّصال', fig: navigator.onLine ? 'متّصل' : 'بلا شبكة', ic: 'sync', stat: true })}
    </div>`, 'card-flush')}
    <button class="btn btn-ghost btn-block" data-out>تسجيل الخروج</button>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  wireInstall(root);
  const rows = root.querySelectorAll('.reg-row');
  rows[0].onclick = () => stylesSheet(root, go);
  rows[1].onclick = () => go('#/onboarding/1');
  root.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { setTheme('quran', b.dataset.q); account(root, go); });
  root.querySelector('[data-out]').onclick = async () => { await signOut(); forget(); location.hash = '#/welcome'; location.reload(); };
}

/** The styles sheet — the comparison surface. Palette, layout and surface are
 *  three independent choices, which is the whole difference between seventeen
 *  bundled skins and a skin SYSTEM: changing one does not disturb the other two. */
export function stylesSheet(root, go) {
  const close = sheet('الأنماط', `
    <div class="stack-lg">
      <div>
        <span class="kicker-ar">اللوحة — الكتلة الملوّنة، والبطاقات بيضاء تحتها</span>
        <div class="swatches" style="margin-top:12px">
          ${PALETTES.map((p) => `<button class="sw" data-pal="${p.key}" aria-pressed="${theme.palette === p.key}">
            <span class="sw-chip" style="background:${p.v.head}"><i style="background:${p.v.card}"></i></span>
            <span class="grow"><span class="sw-name">${p.ar}</span><span class="sw-meta">${p.en}</span></span></button>`).join('')}
        </div>
        <p class="hint" style="margin-top:10px">كلّ لوحة مقيسة: ٤٫٥:١ على كلّ زوج نصّ، وللعناوين أيضاً — لأنّ الحرف العربيّ يُميَّز بنقاطٍ بحجم ٨٪ من السطر، فلا يصحّ استثناء الخطّ الكبير.</p>
      </div>
      <div>
        <span class="kicker-ar">التخطيط — البنية، لا اللون</span>
        <div class="stack" style="margin-top:12px">
          ${['page', 'grid', 'dense', 'form'].map((fam) => `
            <div><span class="kicker-ar" style="margin-bottom:6px">${({ page: 'الصفحة', grid: 'الشبكة', dense: 'الكثيف', form: 'النموذج' })[fam]}</span>
            <div class="row" style="gap:8px;flex-wrap:wrap">
              ${LAYOUTS.filter((l) => l.family === fam).map((l) => `
                <button class="btn btn-sm ${theme.layout === l.key ? '' : 'btn-quiet'}" data-lay="${l.key}">${l.ar}</button>`).join('')}
            </div></div>`).join('')}
        </div>
      </div>
      <div>
        <span class="kicker-ar">السطح — كيف تُعلن البطاقة عن نفسها</span>
        <div class="row" style="gap:8px;margin-top:12px;flex-wrap:wrap">
          ${SURFACES.map((s) => `<button class="btn btn-sm ${theme.surface === s.key ? '' : 'btn-quiet'}" data-surf="${s.key}">${s.ar}</button>`).join('')}
        </div>
      </div>
      ${card(`<p class="hint">الوصيّة والاحتضار لا تتبعان اللوحة المختارة. لهما أرضيّتان ثابتتان — الوثيقة والكفن — لأنّ المزاج يحمله الموضع لا نظام الألوان. وهذا بالضبط ما يسمح لبقيّة التطبيق أن يكون مضيئاً.</p>`)}
    </div>`);
  const d = root.ownerDocument;
  d.querySelectorAll('[data-pal]').forEach((b) => b.onclick = () => { setTheme('palette', b.dataset.pal); close(); stylesSheet(root, go); });
  d.querySelectorAll('[data-lay]').forEach((b) => b.onclick = () => { setTheme('layout', b.dataset.lay); close(); stylesSheet(root, go); });
  d.querySelectorAll('[data-surf]').forEach((b) => b.onclick = () => { setTheme('surface', b.dataset.surf); close(); stylesSheet(root, go); });
}
