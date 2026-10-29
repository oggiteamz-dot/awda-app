/**
 * onboarding.js — المعايرة / Calibration.
 *
 * ─── WHY IT IS CALLED CALIBRATION ───────────────────────────────────────────
 * The product is an instrument, and an instrument is calibrated to the thing it
 * measures before it is trusted. That framing does real work: it tells the
 * person why they are being asked fourteen questions, and it sets up step 10,
 * where the app shows its arithmetic instead of announcing a verdict.
 *
 * ─── THE STEP THIS WHOLE FLOW EXISTS FOR ────────────────────────────────────
 * Step 10, الحساب. Noom's onboarding has a famous beat where labelled bars fill
 * in one by one under "Cross-checking with User Database… based on millions of
 * data points". It is theatre: nothing is being computed.
 *
 * Here the same beat is REAL. The qaḍāʾ estimate genuinely is an arithmetic
 * problem — obligation age in lunar years, days elapsed, days already prayed,
 * the menstruation subtraction, travel and illness — and every line shows its
 * own input. That is the difference between looking scientific and being
 * scientific, and it is the single most important screen in this design.
 *
 * It also makes the number ARGUABLE. A person who is told "you owe 62,000
 * prayers" either believes it or closes the app. A person who can see that the
 * figure rests on a date they typed can correct the date. Every line is editable
 * afterwards, and the result is labelled تقدير — an estimate, not a ruling.
 *
 * ─── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
 * No paywall, no trial countdown, no "your plan expires in 14:59", no social
 * proof, no testimonials, no streak promise. Half the onboardings measured on
 * Mobbin end in a subscription screen; this product has NO PAYMENT PATH AT ALL
 * (NO-GO 6) and the onboarding must not imply one is coming.
 */
import { h, head, card, secHead, icon, animateIn, esc } from '../core/ui.js';
import { toAr, num, computeQada, projectFinish, fmtHijri, toHijri } from '../core/num.js';
import { countTo, rise, pulse } from '../core/motion.js';
import { setGround } from '../core/theme.js';
import { demo, saveOnboarding } from '../core/store.js';
import { human } from '../core/cloud.js';

export const answers = {
  lang: 'ar', phone: '', name: '', birth: null, gender: null,
  started: null, menstrualDays: 6, gapDays: 0, perDay: 3,
  remind: ['fajr', 'maghrib'], result: null,
};

const STEPS = ['welcome', 'lang', 'name', 'gender', 'started', 'menses', 'gaps', 'compute', 'result', 'pace', 'remind', 'privacy', 'done'];
let i = 0;

const progress = () => `<div class="steps" style="margin-bottom:22px">${STEPS.slice(1, -1).map((_, k) => `<i ${k < i ? 'data-on' : ''}></i>`).join('')}</div>`;

const frame = (inner, { kicker = 'المعايرة', title = '', sub = '', next = 'التالي', can = true, back = true } = {}) => `
  <section class="ob wrap" style="padding-top:calc(env(safe-area-inset-top) + 20px);min-height:100dvh;display:flex;flex-direction:column">
    <div class="row" style="margin-bottom:18px;min-height:48px">
      ${back && i > 1 ? `<button class="icon-btn" data-prev aria-label="رجوع">${icon('prev')}</button>` : '<span style="width:48px"></span>'}
      <span class="grow"></span>
      <span class="kicker-ar">الخطوة ${toAr(i)} من ${toAr(STEPS.length - 2)}</span>
    </div>
    ${progress()}
    ${kicker ? `<span class="kicker-ar">${kicker}</span>` : ''}
    ${title ? `<h1 class="h1" style="margin-top:6px">${title}</h1>` : ''}
    ${sub ? `<p class="body soft" style="margin-top:10px">${sub}</p>` : ''}
    <div class="grow" style="margin-top:26px">${inner}</div>
    <div style="padding-block:20px calc(24px + env(safe-area-inset-bottom))">
      <button class="btn btn-block" data-next ${can ? '' : 'disabled'}>${next}</button>
    </div>
  </section>`;

function render(root, go) {
  const step = STEPS[i];
  let html = '';

  if (step === 'welcome') {
    html = `<section class="ob" style="min-height:100dvh;display:flex;flex-direction:column;background:var(--head);color:var(--head-ink)">
      <div class="grow" style="display:grid;place-items:center;padding:40px 30px;text-align:center">
        <div>
          <div id="ob-mark" style="width:190px;height:190px;margin:0 auto 30px;color:var(--head-ink)"></div>
          <h1 class="display" style="font-size:64px;color:var(--head-ink)">عَوْدة</h1>
          <p class="body" style="color:var(--head-soft);margin-top:16px;max-width:30ch;margin-inline:auto">
            حساب ما فات، ووصيّة تُكتَب على المهل، وما يُقال عند الاحتضار.</p>
          <p class="kicker-ar" style="color:var(--head-soft);margin-top:26px">تطبيق مجّاني · بلا إعلانات · بلا اشتراك</p>
        </div>
      </div>
      <div class="wrap" style="padding-block:20px calc(26px + env(safe-area-inset-bottom))">
        <button class="btn btn-block btn-on-head" data-next>لنبدأ</button>
        <button class="btn btn-block" data-signin style="background:transparent;color:var(--head-soft);margin-top:6px">لديّ حساب</button>
      </div></section>`;
  }

  if (step === 'lang') {
    html = frame(`<div class="stack">
      ${[['ar', 'العربيّة', 'اللغة الأساسيّة للتطبيق'], ['en', 'English', 'Full translation'], ['fr', 'Français', 'Traduction complète']]
        .map(([k, t, s]) => `<button class="choice" data-lang="${k}" aria-pressed="${answers.lang === k}">
          ${icon('language')}<span class="grow"><b style="font-family:Kufi">${t}</b><span class="hint" style="display:block">${s}</span></span>
          <span class="tick">${icon('check', 'ic-sm')}</span></button>`).join('')}
      </div>`, { title: 'بأيّ لغة تريد التطبيق؟', sub: 'يمكنك تغييرها في أيّ وقت من حسابك.' });
  }

  if (step === 'name') {
    html = frame(`<div class="stack">
      <div class="field"><label class="label" for="nm">الاسم</label>
        <input class="input" id="nm" value="${esc(answers.name)}" placeholder="كما تحبّ أن يُنادى">
        <p class="hint">يظهر لك وحدك، وفي الوصيّة إن اخترت ذلك.</p></div>
      <div class="field"><label class="label" for="bd">تاريخ الميلاد</label>
        <input class="input" id="bd" type="date" dir="ltr" value="${answers.birth ? isoOf(answers.birth) : ''}">
        <p class="hint" id="hj">يُحسب الهجريّ تلقائيّاً من الميلاديّ.</p></div>
      ${card(`<span class="kicker-ar">لماذا نسأل</span>
        <p class="hint" style="margin-top:6px">سنّ التكليف يُحسب بالسنة القمريّة لا الشمسيّة، والفرق بينهما أحد عشر يوماً في السنة. من دون تاريخ الميلاد لا يوجد حساب، بل تخمين.</p>`)}
      </div>`, { title: 'من أنت؟', sub: 'سطران، ثمّ ننتقل إلى الحساب.' });
  }

  if (step === 'gender') {
    html = frame(`<div class="stack">
      ${[['f', 'أنثى', 'سنّ التكليف تسع سنوات قمريّة'], ['m', 'ذكر', 'سنّ التكليف خمس عشرة سنة قمريّة']]
        .map(([k, t, s]) => `<button class="choice" data-g="${k}" aria-pressed="${answers.gender === k}" style="min-height:76px">
          <span class="grow"><b style="font-family:Kufi;font-size:19px">${t}</b><span class="hint" style="display:block;margin-top:2px">${s}</span></span>
          <span class="tick">${icon('check')}</span></button>`).join('')}
      ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('scale')}
        <div><b class="label">هذا رقم فقهيّ، لا رأي للتطبيق فيه</b>
        <p class="hint" style="margin-top:4px">سنّ التكليف، وما يُحسب فائتاً، وطرح أيّام الحيض — كلّها في الشيفرة لا في المحتوى، ولا يملك أحد تعديلها من خارجها. نصٌّ خاطئ يُرى؛ رقمٌ خاطئ لا يُرى.</p></div></div>`)}
      </div>`, { title: 'أنثى أم ذكر؟', sub: 'يحدّد هذا سنّ التكليف، ولا شيء غيره.', can: !!answers.gender });
  }

  if (step === 'started') {
    html = frame(`<div class="stack">
      <div class="field"><label class="label" for="st">متى بدأت تواظب على الصلاة؟</label>
        <input class="input" id="st" type="date" dir="ltr" value="${answers.started ? isoOf(answers.started) : ''}"></div>
      <button class="choice" data-never aria-pressed="${answers.started === 'never'}">
        <span class="grow">لم أبدأ بعد بانتظام</span><span class="tick">${icon('check', 'ic-sm')}</span></button>
      <button class="choice" data-always aria-pressed="${answers.started === 'always'}">
        <span class="grow">أواظب منذ التكليف</span><span class="tick">${icon('check', 'ic-sm')}</span></button>
      ${card(`<p class="hint">تقريبٌ يكفي. الشهر أو السنة أهمّ من اليوم، ويمكنك تعديل التاريخ لاحقاً فيُعاد الحساب كلّه.</p>`)}
      </div>`, { title: 'من أيّ تاريخ نبدأ العدّ؟', sub: 'كلّ ما قبل هذا التاريخ يدخل في الحساب.' });
  }

  if (step === 'menses') {
    if (answers.gender !== 'f') { i++; return render(root, go); }
    html = frame(`<div class="stack-lg">
      <div style="text-align:center">
        <div class="n-hero" id="mv">${toAr(answers.menstrualDays)}</div>
        <span class="kicker-ar" style="margin-top:6px">يوماً في الشهر القمريّ</span>
      </div>
      <input class="slider" type="range" min="0" max="10" value="${answers.menstrualDays}" data-menses>
      <button class="choice" data-skip aria-pressed="false"><span class="grow">أفضّل عدم التحديد</span>
        <span class="hint">يُحسب بلا طرح</span></button>
      ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('info')}
        <div><b class="label">هذا الرقم يُنقص ما عليك، لا يزيده</b>
        <p class="hint" style="margin-top:4px">أيّام الحيض لا قضاء لصلاتها. من دون هذا الرقم يخرج الحساب أكبر ممّا هو في الحقيقة. لا يغادر هذا الرقم هاتفك إلّا كعددٍ مجرّد، بلا تواريخ.</p></div></div>`)}
      </div>`, { title: 'كم يوماً، في المتوسّط؟', sub: 'سؤال حسابيّ بحت، وجوابه يقلّل الرقم النهائيّ.' });
  }

  if (step === 'gaps') {
    html = frame(`<div class="stack-lg">
      <div style="text-align:center">
        <div class="n-hero" id="gv">${toAr(answers.gapDays)}</div>
        <span class="kicker-ar" style="margin-top:6px">يوماً تقديريّاً</span>
      </div>
      <input class="slider" type="range" min="0" max="365" step="5" value="${answers.gapDays}" data-gaps>
      ${card(`<p class="hint">السفر يقصّر الصلاة ولا يُسقطها، والمرض الذي يمنع الصلاة بالكلّيّة نادر. اترك الرقم صفراً إن لم تكن متأكّداً — الأدقّ أن يكون الرقم أكبر قليلاً لا أصغر.</p>`)}
      </div>`, { title: 'سفرٌ أو مرضٌ طويل؟', sub: 'اختياريّ تماماً. يمكنك تخطّيه.', next: answers.gapDays ? 'التالي' : 'تخطّي' });
  }

  if (step === 'compute') {
    answers.result = computeQada({
      birth: answers.birth, gender: answers.gender,
      startedPraying: answers.started === 'never' ? null : (answers.started === 'always' ? new Date(1900, 0, 1) : answers.started),
      menstrualDays: answers.menstrualDays, gapDays: answers.gapDays,
    });
    html = frame(`<div class="stack" id="calc">
      ${answers.result.steps.map((s, k) => `<div class="reg-row" data-static data-calc="${k}" style="opacity:.18;transition:opacity 340ms">
          <span class="grow"><span style="display:block;${s.hero ? 'font-family:Kufi;font-weight:600' : ''}">${s.ar}</span>
          <span class="hint">${s.basis}</span></span>
          <span class="fig n" style="${s.hero ? 'font-size:23px' : ''}">${s.value}</span>
        </div>`).join('')}
      </div>
      <p class="hint" style="margin-top:20px;text-align:center">لا يُرسَل شيء من هذا إلى أيّ خادم أثناء الحساب.</p>`,
      { title: 'الحساب', sub: 'كلّ سطر يُظهر ما بُني عليه.', next: 'أرِني النتيجة', can: false, back: false });
  }

  if (step === 'result') {
    const r = answers.result;
    html = frame(`<div class="stack-lg">
      <div style="text-align:center;padding-block:10px">
        <span class="kicker-ar">الصلوات الفائتة، تقديراً</span>
        <div class="n-hero" id="res" style="margin-top:10px;color:var(--acc)">٠</div>
        <span class="kicker-ar" style="margin-top:10px">صلاة</span>
      </div>
      ${card(`<div class="row" style="align-items:flex-start;gap:12px">${icon('info')}
        <div><b class="label">هذا تقدير، وليس حُكماً</b>
        <p class="hint" style="margin-top:4px">بُني على ما أدخلتَه أنت. كلّ سطر من الحساب قابل للتعديل في أيّ لحظة، ويُعاد الرقم فوراً. إن كنت في شكّ فاسأل أهل العلم — التطبيق يحسب، ولا يفتي.</p></div></div>`)}
      ${card(`<span class="kicker-ar">بلغتَ التكليف في</span>
        <p class="h3" style="margin-top:6px">${fmtHijri(r.obligationHijri)}</p>`)}
      </div>`, { title: '', kicker: '', next: 'كيف أقضيها؟' });
  }

  if (step === 'pace') {
    const p = projectFinish(answers.result.prayers, answers.perDay);
    html = frame(`<div class="stack-lg">
      <div style="text-align:center">
        <div class="n-hero" id="pv">${toAr(answers.perDay)}</div>
        <span class="kicker-ar" style="margin-top:6px">صلوات قضاء في اليوم</span>
      </div>
      <input class="slider" type="range" min="1" max="15" value="${answers.perDay}" data-pace>
      ${card(`<div class="between"><span class="label">تنتهي في</span>
        <span class="n-md" id="fin">${p ? fmtHijri(p.hijri) : '—'}</span></div>
        <div class="rule" style="margin-block:12px"></div>
        <div class="between"><span class="hint">أي بعد</span><span class="hint n" id="fin2">${p ? toAr(Math.round(p.years * 10) / 10) : '—'} سنة</span></div>`)}
      ${card(`<p class="hint">اختر رقماً تستطيع الوفاء به في أسوأ أسابيعك، لا في أفضلها. الوتيرة التي تُكسَر مرّتين تُهجَر، والرقم قابل للتغيير كلّ يوم.</p>`)}
      </div>`, { title: 'كم تستطيع في اليوم؟', sub: 'مع الفريضة اليوميّة، لا بدلاً عنها.' });
  }

  if (step === 'remind') {
    const opts = [['fajr', 'الصبح'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
    html = frame(`<div class="stack">
      ${opts.map(([k, t]) => `<button class="choice" data-rem="${k}" aria-pressed="${answers.remind.includes(k)}">
        ${icon('bell')}<span class="grow">${t}</span><span class="tick">${icon('check', 'ic-sm')}</span></button>`).join('')}
      ${card(`<span class="kicker-ar">ماذا يقول التذكير بالضبط</span>
        <p class="hint" style="margin-top:6px">«حان وقت المغرب». هذا كلّ شيء. لا عدد متتالٍ، ولا لومٌ إن فاتت، ولا رقمٌ أحمر. الصلاة عبادة، وليست سلسلةً تُكسَر.</p>`)}
      </div>`, { title: 'متى نذكّرك؟', sub: 'اختر ما تشاء، أو لا شيء.', next: answers.remind.length ? 'التالي' : 'بلا تذكير' });
  }

  /**
   * الخصوصيّة — a real screen, not a checkbox.
   * The two worst failures in this category are a prayer app that sold user
   * location data and the ads that half of them run. This product does neither,
   * and says so in specifics rather than in a policy nobody opens. The line
   * about NOT keeping a timestamped log of every time الاحتضار was opened is
   * the one that matters most: the server has no business holding a record of
   * the exact nights someone read the death guidance.
   */
  if (step === 'privacy') {
    const rows = [
      ['shield', 'ما لا نفعله أبداً', 'لا إعلانات. لا بيع بيانات. لا تتبّع موقع. لا مدفوعات — لا يوجد في التطبيق مسار دفع أصلاً.'],
      ['lock', 'الوصيّة', 'لا يفتحها أحد سواك. لا نحن، ولا موظّف، ولا مَن تختاره — حتّى يؤكّد إنسانٌ الوفاة.'],
      ['offline', 'الاحتضار', 'يعمل بلا إنترنت، ولا نحتفظ بسجلّ للأوقات التي فتحتَه فيها. عدّاد فتحٍ مجرّد فقط.'],
      ['doc', 'ما نحفظه', 'اسمك، بريدك، تاريخ ميلادك، سجلّ صلاتك وحساب القضاء. ولا حقل نحفظه ولا يقرأه شيء.'],
    ];
    html = frame(`<div class="stack">${rows.map(([ic, t, s]) => card(
      `<div class="row" style="align-items:flex-start;gap:12px">${icon(ic)}<div><b class="label">${t}</b><p class="hint" style="margin-top:4px">${s}</p></div></div>`)).join('')}
      </div>`, { title: 'قبل أن ندخل', sub: 'أربعة أسطر، وليست صفحة شروط.', next: 'فهمت' });
  }

  if (step === 'done') {
    html = `<section class="ob" style="min-height:100dvh;display:flex;flex-direction:column;background:var(--head);color:var(--head-ink)">
      <div class="grow" style="display:grid;place-items:center;padding:40px 30px;text-align:center">
        <div><div id="ob-mark2" style="width:150px;height:150px;margin:0 auto 26px;color:var(--head-ink)"></div>
        <h1 class="display" style="font-size:38px;color:var(--head-ink)">تمّت المعايرة</h1>
        <p class="body" style="color:var(--head-soft);margin-top:14px;max-width:32ch;margin-inline:auto">
          ${answers.name ? esc(answers.name) + '، ' : ''}كلّ ما أدخلتَه قابل للتعديل من حسابك، ويُعاد الحساب فوراً.</p></div>
      </div>
      <div class="wrap" style="padding-block:20px calc(26px + env(safe-area-inset-bottom))">
        <button class="btn btn-block btn-on-head" data-next>ادخل</button></div></section>`;
  }

  root.innerHTML = html;
  const el = root.firstElementChild;
  animateIn(el);
  wire(root, go);
}

const isoOf = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : '');

function wire(root, go) {
  const step = STEPS[i];
  const say = (msg) => {
    let n = root.querySelector('[data-obnote]');
    if (!n) { n = document.createElement('p'); n.className = 'hint'; n.dataset.obnote = ''; n.setAttribute('role', 'alert');
      root.querySelector('[data-next]')?.before(n); }
    n.textContent = msg;
  };
  const next = async () => {
    // The welcome screen's first step is signing in: nothing below is saved to a
    // person who does not exist yet.
    if (step === 'welcome' && !demo.signedIn) return go('#/signin');
    if (step === 'name' && !answers.birth) return say('تاريخ الميلاد مطلوب — من دونه لا حساب، بل تخمين.');
    if (step === 'gender' && !answers.gender) return say('اختر واحداً للمتابعة.');
    if (step === 'done') {
      const b = root.querySelector('[data-next]'); b.disabled = true; b.textContent = 'يُحفَظ…';
      try { await saveOnboarding(answers); return go('#/home'); }
      catch (err) { window.reportError?.(err, 'saving the onboarding', 'ONBOARDING_SAVE_FAILED'); b.disabled = false; b.textContent = 'ادخل'; return say(human(err)); }
    }
    i++; if (i >= STEPS.length) return go('#/home'); render(root, go);
  };
  const prev = () => { i = Math.max(1, i - 1); render(root, go); };
  root.querySelector('[data-next]')?.addEventListener('click', next);
  root.querySelector('[data-prev]')?.addEventListener('click', prev);
  root.querySelector('[data-signin]')?.addEventListener('click', () => go('#/signin'));

  if (step === 'welcome' || step === 'done') {
    import('../core/ornament.js').then((o) => {
      const t = root.querySelector('#ob-mark') || root.querySelector('#ob-mark2');
      if (!t) return;
      t.innerHTML = o.rosette12({ size: step === 'welcome' ? 190 : 150, weight: 1.4 });
      const svg = t.querySelector('svg');
      svg.querySelectorAll('path,circle').forEach((p, k) => {
        const len = p.getTotalLength?.() || 0;
        if (!len) return;
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 1500, delay: k * 170, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      });
      import('../core/motion.js').then((m) => m.rotate(svg, { period: 200000 }));
    });
  }

  root.querySelectorAll('[data-lang]').forEach((b) => b.onclick = () => { answers.lang = b.dataset.lang; render(root, go); });
  root.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { answers.gender = b.dataset.g; render(root, go); });
  root.querySelectorAll('[data-rem]').forEach((b) => b.onclick = () => {
    const k = b.dataset.rem;
    answers.remind = answers.remind.includes(k) ? answers.remind.filter((x) => x !== k) : [...answers.remind, k];
    render(root, go);
  });

  root.querySelector('#ph')?.addEventListener('input', (e) => { answers.phone = e.target.value; });
  root.querySelector('#nm')?.addEventListener('input', (e) => { answers.name = e.target.value; });
  root.querySelector('#bd')?.addEventListener('change', (e) => {
    answers.birth = e.target.value ? new Date(e.target.value) : null;
    const hj = root.querySelector('#hj');
    if (hj && answers.birth) hj.textContent = 'الموافق ' + fmtHijri(toHijri(answers.birth)) + ' — يُحسب تلقائيّاً.';
  });
  root.querySelector('#st')?.addEventListener('change', (e) => { answers.started = e.target.value ? new Date(e.target.value) : null; });
  root.querySelector('[data-never]')?.addEventListener('click', () => { answers.started = 'never'; render(root, go); });
  root.querySelector('[data-always]')?.addEventListener('click', () => { answers.started = 'always'; render(root, go); });
  root.querySelector('[data-skip]')?.addEventListener('click', () => { answers.menstrualDays = 0; next(); });

  const slider = (sel, key, out, fmt) => root.querySelector(sel)?.addEventListener('input', (e) => {
    answers[key] = +e.target.value;
    root.querySelector(out).textContent = toAr(e.target.value);
    fmt?.();
  });
  slider('[data-menses]', 'menstrualDays', '#mv');
  slider('[data-gaps]', 'gapDays', '#gv');
  slider('[data-pace]', 'perDay', '#pv', () => {
    const p = projectFinish(answers.result.prayers, answers.perDay);
    root.querySelector('#fin').textContent = p ? fmtHijri(p.hijri) : '—';
    root.querySelector('#fin2').textContent = p ? toAr(Math.round(p.years * 10) / 10) + ' سنة' : '—';
  });

  // The computation reveal. Each line lands 520ms after the one before it —
  // slow enough to be read, and it is reading them that makes the number
  // arguable instead of merely announced.
  if (step === 'compute') {
    const rows = [...root.querySelectorAll('[data-calc]')];
    const btn = root.querySelector('[data-next]');
    rows.forEach((r, k) => setTimeout(() => {
      r.style.opacity = '1';
      rise(r, { dy: 6, ms: 300 });
      if (k === rows.length - 1) { btn.disabled = false; pulse(btn); }
    }, 480 + k * 520));
  }

  if (step === 'result') {
    const el = root.querySelector('#res');
    setTimeout(() => countTo(el, answers.result.prayers, { ms: 1100, fmt: (n) => num(n) }), 260);
  }

}

export function mount(root, go, { from = 0 } = {}) { i = from; setGround(null); render(root, go); }
export const reset = () => { i = 0; };
