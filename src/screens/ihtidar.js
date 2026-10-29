/**
 * ihtidar.js — عند الاحتضار, as floating cards.
 *
 * Eight topics, each a card on a ring that floats in front of the person.
 * Swipe the ring with a finger and the next card comes to the front — no
 * buttons; tap the front card and it opens full height; swipe inside it to
 * move to the next topic. This is the shape Hadi chose and the old app had —
 * and the text is the text Samer reviewed in July 2026, including his own
 * correction of the salutation (ﷺ → «صلى الله عليه وآله»).
 *
 * Still true from the design doctrine, because the person opening this may be
 * in a hospital corridor with shaking hands:
 *   · white ground (the kafan), no red anywhere, no photograph of a body;
 *   · it works with no signal and without an account;
 *   · large text and large targets inside the open card;
 *   · "show as a list" is always one tap away, for anyone the ring slows down;
 *   · with reduced motion switched on, nothing spins or flies — cards still swipe.
 *
 * Every line has its own key (ihtidar.c.<id>.t / .i / .<n>), so an admin can
 * correct any line in place, and the change reaches every phone.
 */
import { head, icon, esc } from '../core/ui.js';
import { toAr } from '../core/num.js';
import { jarida } from '../core/ornament.js';
import { setGround } from '../core/theme.js';
import { reduced } from '../core/motion.js';
import { t } from '../core/text.js';

/* Small line drawings, one per topic. Drawn, never a photograph. */
const G = {
  qibla: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="M4 7l8 4 8-4M12 11v10"/><path d="M8 9.2 16 5.2" opacity=".55"/>',
  shahada: '<path d="M7 17c2.5 1.5 7.5 1.5 10 0"/><path d="M8 4h8a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-3l-3 3v-3H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"/>',
  faraj: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="5" r="1.4"/><circle cx="17" cy="7" r="1.4"/><circle cx="19" cy="12" r="1.4"/><circle cx="17" cy="17" r="1.4"/><circle cx="12" cy="19" r="1.4"/><circle cx="7" cy="17" r="1.4"/><circle cx="5" cy="12" r="1.4"/><circle cx="7" cy="7" r="1.4"/>',
  tawba: '<path d="M8 20v-6l-3-4a1.6 1.6 0 0 1 2.6-1.8L10 11V5a1.5 1.5 0 0 1 3 0v6"/><path d="M16 20v-6l3-4a1.6 1.6 0 0 0-2.6-1.8L14 11"/>',
  musalla: '<path d="M6 21V10a6 6 0 0 1 12 0v11z"/><path d="M9 21v-8a3 3 0 0 1 6 0v8"/><path d="M4 21h16"/>',
  quran: '<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5C17 4 14 4.5 12 6z"/><path d="M12 6v14.5"/>',
  yukrah: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5 17.5 6.5"/>',
  yustahab: '<path d="M12 21c0-6 0-11 4-16"/><path d="M12 13c-3 0-5-2-5.5-5 3 0 5 2 5.5 5zM13.4 9.5c2.4-.3 4-2 4.3-4.3-2.4.3-4 2-4.3 4.3z"/>',
};
const glyph = (k, s = 30) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${G[k]}</svg>`;

/* The eight topics. id → content keys; text is the reviewed fallback. */
const TOPICS = [
  { id: 'wad', g: 'qibla', title: 'وضعيّة المحتضَر', intro: '', items: [
    'يُوضَع على ظهره، ويُجعَل باطن قدميه باتجاه القبلة.'] },
  { id: 'shah', g: 'shahada', title: 'تلقين الشهادتين', intro: 'قال صلى الله عليه وآله: «لقّنوا موتاكم لا إله إلا الله فإنّها تهدم الذنوب».', items: [
    'تلقينه الشهادتين، والإقرار بالأئمة الاثني عشر عليهم السلام.'] },
  { id: 'faraj', g: 'faraj', title: 'كلمات الفَرَج', intro: 'يُلقَّن كلمات الفَرَج:', items: [
    'لا إله إلا الله الحليم الكريم، لا إله إلا الله العليّ العظيم، سبحان الله ربّ السماوات السبع وربّ الأرضين السبع وما فيهنّ وما بينهنّ وربّ العرش العظيم، والحمد لله ربّ العالمين.'] },
  { id: 'tawba', g: 'tawba', title: 'تلقين التوبة والدعاء', intro: 'تلقينه التوبة — فرصته الأخيرة قبل إقفال باب العمل، والدعاء:', items: [
    '«أعوذ بالله العظيم ربّ العرش الكريم من كلّ عِرقٍ نقّار ومن شرّ حرّ النار» (سبع مرّات).',
    '«لا إله إلا الله يا من يقبل اليسير ويعفو عن الكثير، اقبل منّي اليسير واعفُ عنّي الكثير، إنّك أنت العفوّ الغفور. اللهم اغفر لي الكثير من معاصيك، واقبل منّي اليسير من طاعتك».'] },
  { id: 'musalla', g: 'musalla', title: 'أخذه إلى مُصلّاه', intro: '', items: [
    'يُؤخَذ إلى المكان الذي كان يُصلّي فيه (مُصلّاه).'] },
  { id: 'quran', g: 'quran', title: 'قراءة القرآن عنده', intro: 'يُقرأ القرآن عنده، وخصوصاً:', items: [
    'سورة الصافّات، وسورة يس.',
    'آية الكرسي (البقرة ٢٥٥)، وآية السُّخرة (الأعراف ٥٤–٥٦).',
    'آخر ثلاث آيات من سورة البقرة (٢٨٤–٢٨٦).',
    'سورة الأحزاب.',
    'وأمْره بحُسن الظنّ بالله، وتبشيره بلقاء ربّه.'] },
  { id: 'yukrah', g: 'yukrah', title: 'ما يُكرَه عنده', intro: '', items: [
    'البكاء عنده.', 'حضور الجُنُب والحائض عنده.', 'كثرة الكلام.', 'صُراخ النساء عنده.'] },
  { id: 'yustahab', g: 'yustahab', title: 'ما يُستحبّ', intro: '', items: [
    'إغماض عينيه وإطباق فمه.', 'مدّ يديه إلى جنبيه، ومدّ رجليه.', 'تغطيته بثوب.',
    'إعلام المؤمنين ليحضروا جنازته.', 'التعجيل في دفنه.'] },
];
const N = TOPICS.length;
const STEP = 360 / N;
const R = 205;                               // ring radius, px

/** A line of text that an admin can rewrite in place. */
const line = (tag, key, fb, attrs = '') => `<${tag} data-k="${key}" ${attrs}>${esc(t(key, fb))}</${tag}>`;
const titleOf = (tp) => t(`ihtidar.c.${tp.id}.t`, tp.title);

let at = 0;                                  // the card at the front
let listMode = false;

const mod = (n) => ((n % N) + N) % N;

export function ihtidar(root, go) {
  setGround('shroud');
  at = mod(at);
  const still = reduced();
  root.innerHTML = `
  ${head({ kicker: 'الاحتضار', title: `<span data-k="ihtidar.title">${esc(t('ihtidar.title', 'عند الاحتضار'))}</span>`,
    back: true, rosette: false, kufic: false,
    sub: `<span data-k="ihtidar.sub2">${esc(t('ihtidar.sub2', 'ماذا تفعل قرب مُحتضَر'))}</span>` })}
  <div class="wrap lift ih" data-screen="ihtidar">

    <section class="ih-hero">
      <figure class="ih-verse">
        ${line('p', 'ihtidar.verse', '﴿كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ﴾', 'class="verse"')}
        <figcaption class="verse-ref">آل عمران · ١٨٥</figcaption>
      </figure>

      <div class="ih-calm">
        <span class="ih-calm-ic" aria-hidden="true">${jarida({ size: 34 })}</span>
        <div class="ih-calm-txt">
          ${line('b', 'ihtidar.calm.t', 'أعانك الله.', 'class="ih-calm-t"')}
          ${line('p', 'ihtidar.calm', 'خُذ نفساً. كلّ ما يلي مستحبّاتٌ وآداب، وما تعذّر منها فلا إثم فيه.')}
        </div>
      </div>

      ${line('h2', 'legacy.iht_lead_t', 'إذا كنتَ قرب مريضٍ أو مصابٍ يحتضر — ماذا تفعل؟', 'class="ih-q"')}

      <ul class="ih-facts">
        <li>${glyph('quran', 16)}${line('span', 'ihtidar.fact.cards', 'ثماني بطاقات')}</li>
        <li>${icon('offline', 'ic-sm')}${line('span', 'ihtidar.fact.offline', 'بلا إنترنت')}</li>
        <li>${icon('lock', 'ic-sm')}${line('span', 'ihtidar.fact.noacc', 'بلا حساب')}</li>
      </ul>
    </section>

    <div data-ring-view ${listMode ? 'hidden' : ''}>
      <div class="ih-stage ${still ? 'is-still' : ''}" data-stage tabindex="0" role="listbox"
        aria-label="ثماني بطاقات. اسحب أو استعمل الأسهم في لوحة المفاتيح، واضغط Enter للفتح.">
        <div class="ih-orbit" data-orbit>
          <div class="ih-ring" data-ring>
            ${TOPICS.map((tp, i) => `
            <div class="ih-card" data-i="${i}" role="option" style="transform:rotateY(${-i * STEP}deg) translateZ(${R}px)">
              <span class="ih-num n">${toAr(i + 1)}</span>
              <span class="ih-ic">${glyph(tp.g)}</span>
              ${line('span', `ihtidar.c.${tp.id}.t`, tp.title, 'class="ih-t"')}
              <span class="ih-tap">اضغط للفتح</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="ih-now">
        <b class="h3" data-now-title></b>
        <div class="ih-dots" aria-hidden="true">${TOPICS.map((_, i) => `<i data-dot="${i}"></i>`).join('')}</div>
        <div class="ih-how" aria-hidden="true">
          <span class="ih-swipe"><i></i></span>
          ${line('span', 'ihtidar.ring.how', 'اسحب البطاقات بإصبعك، واضغط البطاقة الأماميّة لتفتحها.')}
        </div>
      </div>
    </div>

    <div data-list-view ${listMode ? '' : 'hidden'} class="stack" style="margin-top:18px">
      ${TOPICS.map((tp, i) => `
      <button class="ih-row" data-row="${i}">
        <span class="ih-ic">${glyph(tp.g, 26)}</span>
        <span class="grow"><b class="h3">${esc(titleOf(tp))}</b></span>
        <span class="hint n">${toAr(i + 1)}</span>${icon('next', 'ic-sm')}</button>`).join('')}
    </div>

    <button class="btn btn-quiet btn-block" data-toggle-list style="margin-top:18px">${listMode ? 'عرضها كبطاقات' : 'عرضها كقائمة'}</button>
    ${line('p', 'ihtidar.offline', 'هذه الصفحة محفوظة على جهازك وتُفتح بلا إنترنت.', 'class="hint" style="margin-top:18px;text-align:center"')}
    <div style="height:28px"></div>
  </div>`;

  root.querySelectorAll('[data-row]').forEach((b) => b.onclick = () => openTopic(+b.dataset.row, () => {}));
  root.querySelector('[data-toggle-list]').onclick = () => { listMode = !listMode; ihtidar(root, go); };
  if (!listMode) ring(root, still);
}

/* ══ the ring ══════════════════════════════════════════════════════════════
   Why it no longer jitters (the old one did):
   · ONE animation loop owns the angle. No CSS transition is ever running while
     a finger moves, so a new touch never fights an old animation — the ring
     picks up from exactly where it is, mid-turn.
   · Every move is drawn on the next frame (requestAnimationFrame), never more
     often than the screen refreshes.
   · The finger is captured, so sliding off the stage does not end the swipe.
   · A quick flick carries on by its speed, like a real wheel; a slow drag lands
     on the nearest card. Release always eases in, never snaps.
   · The gentle floating pauses while a finger is down.
   No buttons: swipe to turn, tap the front card to open it, tap a side card
   to bring it forward. Keyboard: arrows turn, Enter opens. */
function ring(root, still) {
  const stage = root.querySelector('[data-stage]');
  const ringEl = root.querySelector('[data-ring]');
  const orbit = root.querySelector('[data-orbit]');
  const cards = [...root.querySelectorAll('.ih-card')];
  const K = 0.3;                              // degrees per pixel of finger travel
  let angle = at * STEP, target = angle, dragAngle = null, raf = 0, last = 0, front = -1;

  const draw = () => {
    ringEl.style.transform = `translateZ(-${R}px) rotateY(${angle}deg)`;
    const f = mod(Math.round(angle / STEP));
    if (f !== front) {
      front = f;
      cards.forEach((c, i) => { c.toggleAttribute('data-front', i === f); c.setAttribute('aria-selected', String(i === f)); });
      root.querySelector('[data-now-title]').textContent = titleOf(TOPICS[f]);
      root.querySelectorAll('[data-dot]').forEach((d) => d.toggleAttribute('data-on', +d.dataset.dot === f));
    }
  };
  const tick = (now) => {
    const dt = Math.min(48, now - (last || now)); last = now;
    if (dragAngle != null) angle = dragAngle;
    else {
      const d = target - angle;
      angle += still ? d : d * (1 - Math.exp(-dt / 85));
      if (Math.abs(d) < 0.04) angle = target;
    }
    draw();
    raf = (dragAngle != null || angle !== target) && stage.isConnected ? requestAnimationFrame(tick) : 0;
    if (!raf) last = 0;
  };
  const run = () => { if (!raf) raf = requestAnimationFrame(tick); };
  /** Turn to card i by the shortest way round. */
  const goTo = (i) => {
    const k = Math.round(target / STEP);
    let d = mod(i) - mod(k); if (d > N / 2) d -= N; if (d < -N / 2) d += N;
    target = (k + d) * STEP; at = mod(i); run();
  };
  const jump = (i) => { goTo(i); angle = target; draw(); };

  // Entrance: the cards rise, turn once, and settle on the current one.
  if (!still) {
    orbit.style.transform = 'translateY(140px) scale(.65)'; orbit.style.opacity = '0';
    angle = target - 280; draw();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      orbit.style.transition = 'transform 900ms cubic-bezier(.16,.84,.24,1), opacity 500ms ease';
      orbit.style.transform = 'none'; orbit.style.opacity = '1';
      run();
    }));
  } else draw();

  // Finger.
  let x0 = 0, y0 = 0, a0 = 0, dragging = false, down = false, samples = [];
  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    down = true; dragging = false; x0 = e.clientX; y0 = e.clientY; a0 = angle; samples = [[e.timeStamp, e.clientX]];
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!dragging) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      dragging = true; stage.classList.add('is-drag'); x0 = e.clientX; a0 = angle;
    }
    dragAngle = a0 + (e.clientX - x0) * K;
    samples.push([e.timeStamp, e.clientX]); if (samples.length > 12) samples.shift();
    run();
  });
  const release = (e, cancelled) => {
    if (!down) return;
    down = false; stage.classList.remove('is-drag');
    if (dragging) {
      dragging = false;
      // Speed over the last tenth of a second only: a pause before letting go kills the flick.
      const [t2, x2] = samples[samples.length - 1];
      const recent = samples.filter(([t]) => t2 - t <= 100);
      const [t1, x1] = recent[0];
      const v = t2 > t1 && e.timeStamp - t2 < 80 ? (x2 - x1) / (t2 - t1) : 0;   // px per ms
      const throwTo = angle + v * 220 * K;                    // where a flick would carry it
      dragAngle = null;
      goTo(Math.round(throwTo / STEP));
      return;
    }
    dragAngle = null;
    if (cancelled) return;
    // A tap: open the front card, or bring a side card forward.
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ih-card');
    if (!hit) return;
    const i = +hit.dataset.i;
    if (i === front) openTopic(i, jump); else goTo(i);
  };
  stage.addEventListener('pointerup', (e) => release(e, false));
  stage.addEventListener('pointercancel', (e) => release(e, true));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(front + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(front - 1); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTopic(front, jump); }
  });
}

/* ══ one card, open ════════════════════════════════════════════════════════
   Full height, big text. Swipe sideways to move to the next topic (the ring
   behind follows), or use the two buttons at the bottom. */
function openTopic(i, focusRing) {
  const still = reduced();
  const scrim = document.createElement('div'); scrim.className = 'scrim';
  const el = document.createElement('div');
  el.className = 'sheet ih-sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.append(scrim, el);
  requestAnimationFrame(() => scrim.setAttribute('data-open', ''));

  const paint = (dir = 0) => {
    const tp = TOPICS[i];
    const body = `
      <div class="sheet-grab"></div>
      <div class="between" style="align-items:flex-start;gap:12px">
        <div class="row" style="gap:12px;align-items:center">
          <span class="ih-ic ih-ic-lg">${glyph(tp.g, 34)}</span>
          <div><span class="kicker-ar n">${toAr(i + 1)} من ${toAr(N)}</span>
            ${line('h2', `ihtidar.c.${tp.id}.t`, tp.title, 'class="h2" style="margin-top:2px"')}</div>
        </div>
        <button class="icon-btn" data-close aria-label="إغلاق">${icon('close')}</button>
      </div>
      <div class="ih-body" data-swipe>
        ${tp.intro || t(`ihtidar.c.${tp.id}.i`, '') ? line('p', `ihtidar.c.${tp.id}.i`, tp.intro, 'class="ih-intro"') : ''}
        ${tp.items.map((it, k) => line('p', `ihtidar.c.${tp.id}.${k}`, it, 'class="ih-item"')).join('')}
      </div>
      <div class="row ih-foot">
        <button class="btn btn-ghost" data-move="-1" ${i === 0 ? 'disabled' : ''} style="flex:1">${icon('prev', 'ic-sm')} السابق</button>
        <button class="btn" data-move="1" style="flex:1.4">${i === N - 1 ? 'تمّ' : 'التالي'} ${icon('next', 'ic-sm')}</button>
      </div>`;
    el.innerHTML = body;
    if (dir && !still) {
      el.querySelector('.ih-body').animate(
        [{ transform: `translateX(${dir > 0 ? -40 : 40}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 260, easing: 'cubic-bezier(.2,.75,.2,1)' });
    }
    el.querySelector('[data-close]').onclick = close;
    el.querySelectorAll('[data-move]').forEach((b) => b.onclick = () => move(+b.dataset.move));
    wireSwipe(el.querySelector('[data-swipe]'));
  };
  const move = (d) => {
    if (i + d < 0) return;
    if (i + d >= N) return close();
    i += d; focusRing(i, 0); paint(d); el.scrollTop = 0;
  };
  // In Arabic, swiping toward the right brings the next topic (it sits to the left).
  const wireSwipe = (zone) => {
    let x0 = null, y0 = 0;
    zone.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
    zone.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx > 0 ? 1 : -1);
    });
  };
  function close() {
    scrim.removeAttribute('data-open');
    if (still) { scrim.remove(); el.remove(); return; }
    el.animate([{ transform: 'none' }, { transform: 'translateY(100%)' }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'both' });
    setTimeout(() => { scrim.remove(); el.remove(); }, 220);
  }
  scrim.onclick = close;
  const esc_ = (e) => { if (e.key === 'Escape') { close(); removeEventListener('keydown', esc_); } };
  addEventListener('keydown', esc_);
  paint();
  if (!still) el.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.75,.2,1)' });
  el.querySelector('[data-close]').focus();
}
