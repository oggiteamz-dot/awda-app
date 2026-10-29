/**
 * will.js — الوصيّة, on the الوثيقة ground.
 *
 * ─── WHY THIS MODULE LOOKS DIFFERENT FROM THE REST OF THE APP ───────────────
 * Because it is a different kind of object. الرئيسية is an instrument panel; a
 * will is a legal document that will be read, once, by people who are grieving,
 * and possibly in front of a judge. So the ground switches to parchment and ink,
 * the radius drops to 10px, the matn is justified, the sections become numbered
 * articles, and the gold goes away entirely.
 *
 * Gold goes away for a reason and not for taste: gold-woven cloth is prohibited
 * in the kafan, so gold is kept off every screen that touches the body or the
 * burial. It belongs to the shrine, not to the grave.
 *
 * ─── SAMER'S CORRECTIONS, APPLIED ───────────────────────────────────────────
 * The scholar reviewed the previous build and marked up screenshots. Carried in
 * here: the Hijri date is derived from the Gregorian automatically rather than
 * typed twice; the theme picker is gone from inside the will; the two qaḍāʾ
 * boxes are gone from the will (they belong to القضاء); the public-funds field is
 * gone; witnesses are one block, not separate phone boxes.
 *
 * ─── AND THE BADGE THAT WAS REMOVED ─────────────────────────────────────────
 * The old app had a «موثّق ✓» verified badge. It is gone and it is not coming
 * back: the app does not verify identity, and NO-GO 8 forbids claiming to verify
 * something you do not. A false assurance on a will is worse than no assurance.
 */
import { head, card, secHead, regRow, icon, animateIn, sheet, esc } from '../core/ui.js';
import { toAr, fmtHijri, toHijri } from '../core/num.js';
import { setGround } from '../core/theme.js';
import { demo } from './main.js';

const SEC = [
  ['الديون والحقوق', 'ما عليك وما لك، ولمن', 1, 'doc'],
  ['الحقوق الشرعيّة', 'الخمس والزكاة والكفّارات', 1, 'scale'],
  ['قضاء العبادات', 'من يقضي عنك، وبأيّ ترتيب', 1, 'qada'],
  ['التجهيز والدفن', 'الغسل والكفن والمكان', 0, 'ihtidar'],
  ['الوصايا الماليّة', 'في حدود الثلث', 0, 'grid'],
  ['الأوصياء', 'من ينفّذ، ومن يشهد', 0, 'people'],
  ['رسائل الوداع', 'صوتاً أو صورة، لمن تختار', 0, 'video'],
];

export function will(root, go) {
  setGround('doc');
  const t = toHijri(new Date());
  root.innerHTML = `
  ${head({ kicker: 'وثيقة', title: 'الوصيّة', back: true, rosette: false, kufic: false,
    sub: `محرَّرة في ${fmtHijri(t)}` })}
  <div class="wrap lift stack">
    ${card(`<div class="between"><div><span class="kicker-ar">اكتمال الوثيقة</span>
        <p class="h2" style="margin-top:4px">${toAr(demo.will.done)} من ${toAr(demo.will.total)}</p></div>
      <span class="tag">مسوّدة</span></div>
      <div class="bar" style="margin-top:12px"><i style="width:${(demo.will.done / 7 * 100).toFixed(0)}%"></i></div>
      <p class="hint" style="margin-top:10px">لا يُفتح شيء من هذا لأحد — ولا لنا — حتّى يؤكّد إنسانٌ الوفاة. القسم التالي يستغرق نحو أربع دقائق.</p>`)}
    ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('info')}
      <div><b class="label">معاينة التصميم</b>
      <p class="hint" style="margin-top:4px">الوصيّة في هذه النسخة للعرض فقط ولا يُحفظ منها شيء بعد. نقلُها إلى السحابة بأمان هو الخطوة التالية، والنصّ الدينيّ فيها لم يراجعه العالِم.</p></div></div>`, 'card-preview')}

    <div class="sec">
      ${secHead('الأقسام')}
      ${card(`<div class="reg">${SEC.map(([t, s, done, ic], k) => `
        <button class="reg-row" data-sec="${k}">
          <span class="no" style="font-family:Mono;font-size:12px;color:var(--soft);width:26px">${toAr(k + 1)}</span>
          <span class="grow"><span style="display:block;font-family:Kufi;font-weight:600">${t}</span>
            <span class="hint">${s}</span></span>
          ${done ? `<span class="tag" style="background:transparent;border:1px solid var(--line)">${icon('check', 'ic-sm')} تمّ</span>` : ''}
          ${icon('next', 'ic-sm')}
        </button>`).join('')}</div>`, 'card-flush')}
    </div>

    <div class="sec">
      ${secHead('معاينة')}
      ${card(`<p class="kicker-ar" style="text-align:center">وثيقة وصيّة</p>
        <div class="rule" style="margin-block:14px"></div>
        <p class="matn" style="font-size:15px">بسم الله الرحمن الرحيم. أنا الموقّع أدناه، ${esc(demo.name)}، بكامل قواي العقليّة، أوصي بما يلي، وأسأل من يقرأ هذه الوثيقة أن ينفّذ ما فيها بالمعروف…</p>
        <div class="article"><span class="no">١</span><div><b class="label">الديون والحقوق</b>
          <p class="hint" style="margin-top:4px">عليّ لفلان مبلغٌ قدره… ولي عند فلان…</p></div></div>
        <div class="article"><span class="no">٢</span><div><b class="label">الحقوق الشرعيّة</b>
          <p class="hint" style="margin-top:4px">في ذمّتي خمسُ سنةٍ واحدة…</p></div></div>
        <div class="article" style="border:0"><span class="no">٣</span><div><b class="label">قضاء العبادات</b>
          <p class="hint" style="margin-top:4px">يقضي عنّي ولدي الأكبر…</p></div></div>
        <button class="btn btn-ghost btn-block btn-sm" style="margin-top:16px">${icon('doc', 'ic-sm')} معاينة الوثيقة كاملة</button>`)}
    </div>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  root.querySelectorAll('[data-sec]').forEach((b) => b.onclick = () => {
    const k = +b.dataset.sec;
    if (k === 5) return recipients(root, go);
    if (k === 6) return messages(root, go);
    section(root, go, k);
  });
}

/** One section's questions. GOV.UK / NHS: one thing per page under stress, and
 *  a will is written at night by someone who does not want to be doing it.     */
export function section(root, go, k = 0) {
  setGround('doc');
  const [title, sub] = SEC[k];
  root.innerHTML = `
  ${head({ kicker: `القسم ${toAr(k + 1)} من ٧`, title, sub, back: true, rosette: false, kufic: false })}
  <div class="wrap lift stack">
    <div class="steps" style="margin-bottom:6px">${SEC.map((_, n) => `<i ${n <= k ? 'data-on' : ''}></i>`).join('')}</div>
    ${card(`<div class="stack">
      <div class="field"><label class="label">هل عليك دَينٌ لأحد؟</label>
        <div class="row" style="gap:8px;margin-top:4px">
          <button class="choice" style="flex:1;justify-content:center" aria-pressed="true">نعم</button>
          <button class="choice" style="flex:1;justify-content:center" aria-pressed="false">لا</button></div></div>
      <div class="field"><label class="label" for="d1">لمن، وكم؟</label>
        <input class="input" id="d1" placeholder="الاسم">
        <input class="input" placeholder="المبلغ والعملة" style="margin-top:8px">
        <p class="hint">إن لم تكن للدَّين بيّنة، فإخبارُك به واجب — وهذا أحد المواضع التي تصير فيها الوصيّة واجبة لا مستحبّة.</p></div>
      <button class="btn btn-quiet btn-block btn-sm">${icon('plus', 'ic-sm')} أضف دَيناً آخر</button>
    </div>`)}
    ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('lock')}
      <div><b class="label">يُحفظ وأنت تكتب</b>
      <p class="hint" style="margin-top:4px">كلّ حقل يُحفظ فور خروجك منه، ويعمل بلا إنترنت ويُزامَن حين يعود. لن تفقد ما كتبته لأنّ الشبكة انقطعت.</p></div></div>`)}
    <div class="row" style="gap:10px">
      <button class="btn btn-ghost" data-back style="flex:1">السابق</button>
      <button class="btn" data-nextsec style="flex:2">التالي</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  root.querySelector('[data-nextsec]').onclick = () => (k < 6 ? section(root, go, k + 1) : will(root, go));
}

export function recipients(root, go) {
  setGround('doc');
  root.innerHTML = `
  ${head({ kicker: 'القسم ٦ من ٧', title: 'الأوصياء والشهود', back: true, rosette: false, kufic: false,
    sub: 'من ينفّذ، ومن يشهد، وكيف نتحقّق أنّه هو.' })}
  <div class="wrap lift stack">
    ${[['سامر ح.', 'وصيّ · أخ', 'تمّ'], ['ليلى م.', 'شاهدة · زوجة', 'تمّ'], ['—', 'شاهد ثانٍ', 'ناقص']]
      .map(([n, r, s]) => card(`<div class="row" style="gap:12px">
        <span style="width:44px;height:44px;border-radius:50%;background:var(--card2);display:grid;place-items:center;color:var(--soft);flex:none">${icon('account')}</span>
        <span class="grow"><b class="label">${n}</b><span class="hint" style="display:block">${r}</span></span>
        <span class="tag">${s}</span></div>`)).join('')}
    <button class="btn btn-quiet btn-block">${icon('plus', 'ic-sm')} أضف شخصاً</button>
    ${card(`<span class="kicker-ar">سؤال التحقّق</span>
      <p class="hint" style="margin-top:6px">لكلّ شخص سؤالٌ لا يعرف جوابه سواه. يُخزَّن الجواب مُعمّى، لا نصّاً — نحن أنفسنا لا نستطيع قراءته.</p>
      <div class="field" style="margin-top:12px"><label class="label" for="q1">السؤال</label>
        <input class="input" id="q1" value="في أيّ مدينة وُلد جدّنا؟"></div>`)}
    ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('shield')}
      <div><b class="label">لا توجد شارة «موثّق»</b>
      <p class="hint" style="margin-top:4px">أُزيلت من النسخة السابقة عن قصد. التطبيق لا يتحقّق من الهويّة، ولا يصحّ أن يدّعي تحقّقاً لا يفعله — خاصّةً على وثيقةٍ كهذه.</p></div></div>`)}
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
}

export function messages(root, go) {
  setGround('doc');
  root.innerHTML = `
  ${head({ kicker: 'القسم ٧ من ٧', title: 'رسائل الوداع', back: true, rosette: false, kufic: false,
    sub: 'ما تحبّ أن يسمعوه منك، بصوتك.' })}
  <div class="wrap lift stack">
    ${[['إلى أمّي', '٢:٤١', 'video'], ['إلى ولدي', '٤:٠٨', 'video'], ['إلى سامر', '١:١٢', 'mic']]
      .map(([t, d, ic]) => card(`<div class="row" style="gap:12px">
        <span style="width:52px;height:52px;border-radius:12px;background:var(--card2);display:grid;place-items:center;color:var(--acc);flex:none">${icon(ic)}</span>
        <span class="grow"><b class="label">${t}</b><span class="hint" style="display:block">${d} · محفوظة في السحابة</span></span>
        <button class="icon-btn">${icon('play', 'ic-sm')}</button></div>`)).join('')}
    <button class="btn btn-block" data-rec>${icon('plus', 'ic-sm')} سجّل رسالة</button>
    ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('offline')}
      <div><b class="label">تُحفظ في السحابة، لا في هذا الهاتف</b>
      <p class="hint" style="margin-top:4px">هاتف يُفقد أو يُكسر لا يأخذ معه رسالتك. الرفع يُستكمَل إن انقطع، وهناك حدّ لكلّ شخص حتّى تبقى الكلفة معقولةً ويبقى التطبيق مجّانيّاً.</p></div></div>`)}
    <div style="height:20px"></div>
  </div>`;
  animateIn(root);
  root.querySelector('[data-rec]').onclick = () => record(root, go);
}

/** Recording. Black ground here is a CAMERA ground, not a mourning ground — the
 *  viewfinder convention, and the one place a dark surface is not a statement. */
export function record(root, go) {
  setGround('doc');
  root.innerHTML = `
  <section style="min-height:100dvh;background:#111315;color:#F2F5F3;display:flex;flex-direction:column;position:relative">
    <div class="row" style="padding:calc(env(safe-area-inset-top) + 14px) 16px;gap:12px">
      <button class="icon-btn" data-back style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff">${icon('close')}</button>
      <span class="grow"></span>
      <span class="tag" style="background:rgba(255,255,255,.14);color:#fff;font-family:Mono">٠٠:١٨</span>
    </div>
    <div class="grow" style="display:grid;place-items:center;padding:20px">
      <div style="width:min(78vw,300px);aspect-ratio:1;border-radius:50%;background:#1C2024;display:grid;place-items:center;
        border:1px solid rgba(255,255,255,.1)">
        <span style="opacity:.3">${icon('video', 'ic-lg')}</span></div>
    </div>
    <div style="padding:0 16px 8px;text-align:center">
      <p style="opacity:.75;font-size:15px;max-width:30ch;margin:0 auto">إلى أمّي — تُحفظ ولا تُفتح إلّا بعد تأكيد الوفاة.</p>
    </div>
    <div class="row" style="justify-content:center;gap:34px;padding-block:26px calc(34px + env(safe-area-inset-bottom))">
      <button class="icon-btn" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff">${icon('mic')}</button>
      <button aria-label="إيقاف" style="width:78px;height:78px;border-radius:50%;border:4px solid rgba(255,255,255,.85);
        background:transparent;display:grid;place-items:center;cursor:pointer">
        <span style="width:30px;height:30px;border-radius:7px;background:#F2F5F3"></span></button>
      <button class="icon-btn" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff">${icon('sync')}</button>
    </div>
  </section>`;
  animateIn(root);
}
