/**
 * motion.js — the named motion system.
 *
 * Nine movements, each with one job. They are named in Arabic because a named
 * movement is one a team can argue about: "الطلوع is too slow" is a conversation,
 * "the animation is too slow" is not.
 *
 * ─── THE RULE THAT OVERRIDES ALL THE OTHERS ─────────────────────────────────
 * السكون / Stillness. On الاحتضار — the guidance at the time of dying — every
 * movement in this file is disabled except opacity. Someone opens that screen at
 * the worst moment of their life, on a phone, with shaking hands. Motion there is
 * not delight; it is an obstacle between a person and an instruction they need
 * now. Every skin may restyle that tab. None may animate it.
 *
 * `prefers-reduced-motion` disables everything except opacity, globally.
 *
 * ─── WHY NOT A LIBRARY ──────────────────────────────────────────────────────
 * D-001: no framework, no build step, no npm. The cost of that decision is that
 * animation has to be written rather than imported. This file is that cost, paid
 * once: about 120 lines, no dependency, and it composes with CSS rather than
 * fighting it.
 */

export const EASE = {
  rise: 'cubic-bezier(.22,1,.36,1)',   // decelerate hard — arrives, does not bounce
  fold: 'cubic-bezier(.32,1.2,.4,1)',  // one slight overshoot, for sheets only
  calm: 'cubic-bezier(.4,0,.2,1)',
};

export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** الطلوع · Rise — a screen arrives: 12px up, fade in. The default transition. */
export function rise(el, { delay = 0, dy = 12, ms = 260 } = {}) {
  if (!el) return;
  if (reduced()) { el.style.opacity = '1'; return; }
  el.animate(
    [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }],
    { duration: ms, delay, easing: EASE.rise, fill: 'both' },
  );
}

/** الطلوع المتتابع · staggered rise, for a list that paints in. */
export function riseAll(els, { step = 42, dy = 10 } = {}) {
  [...els].forEach((el, i) => rise(el, { delay: i * step, dy }));
}

/**
 * القوس · Arc — any ring or graduated arc draws itself rather than appearing.
 * Used for the qaḍāʾ remaining and the prayer window. It reads as an instrument
 * taking a reading, which is the whole point.
 */
export function drawArc(path, { ms = 900, delay = 120 } = {}) {
  if (!path) return;
  const len = path.getTotalLength?.() ?? 0;
  if (!len) return;
  path.style.strokeDasharray = len;
  if (reduced()) { path.style.strokeDashoffset = 0; return; }
  path.style.strokeDashoffset = len;
  path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    { duration: ms, delay, easing: EASE.rise, fill: 'both' });
}

/**
 * العدّ · Count — a numeral ticks from its old value to its new one.
 * Only ever used with tabular figures, so nothing under it moves while it runs.
 * `fmt` receives a number and returns the string to paint — that is where the
 * Eastern Arabic digits and the ٬ grouping come from.
 */
export function countTo(el, to, { from = 0, ms = 640, fmt = (n) => String(Math.round(n)) } = {}) {
  if (!el) return;
  if (reduced()) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * المدّ · Extend — a heading's hairline rule grows FROM THE RIGHT.
 * It is the kashida gesture: in Arabic the line extends along the baseline, and
 * it extends in the direction the script runs. A rule that grows from the left in
 * an RTL interface is a Latin animation wearing Arabic clothes.
 */
export function extend(el, { ms = 420, delay = 80 } = {}) {
  if (!el || reduced()) return;
  el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
    { duration: ms, delay, easing: EASE.rise, fill: 'both' });
}

/** الطيّ · Fold — a bottom sheet rises, with one slight overshoot. */
export function fold(el, { ms = 340 } = {}) {
  if (!el) return;
  if (reduced()) { el.style.transform = 'none'; return; }
  el.animate([{ transform: 'translateY(100%)' }, { transform: 'none' }],
    { duration: ms, easing: EASE.fold, fill: 'both' });
}

/**
 * الوميض · Glint — a single specular sweep across a faceted panel.
 * Āyina-kārī: a shrine interior is faced in thousands of mirror shards, so the
 * surface catches the light as you move past it. Once, on tap, 700ms, never
 * looping — a loop would be decoration, and this is a material behaving.
 */
export function glint(el, { ms = 700 } = {}) {
  if (!el || reduced()) return;
  el.animate(
    [{ backgroundPosition: '200% 0' }, { backgroundPosition: '-60% 0' }],
    { duration: ms, easing: EASE.calm },
  );
}

/**
 * الدوران · Rotation — the rosette behind a header block turns once every two
 * minutes. It must be barely perceptible: you should not catch it moving, only
 * notice later that it is not where it was. The instrument is running.
 */
export function rotate(el, { period = 120000 } = {}) {
  if (!el || reduced()) return null;
  return el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: period, iterations: Infinity, easing: 'linear' });
}

/**
 * النبض · Pulse — the ONE permitted attention movement, on the "now" marker of
 * the prayer rail only. Two beats then stop. It never marks a failure and never
 * turns anything red: NO-GO 2 and 3 forbid a streak, a broken chain, or anything
 * that implies you have fallen short.
 */
export function pulse(el, { ms = 1400 } = {}) {
  if (!el || reduced()) return;
  el.animate([{ opacity: 1 }, { opacity: .45 }, { opacity: 1 }],
    { duration: ms, iterations: 2, easing: EASE.calm });
}

/** السكون · Stillness — strip every movement from a subtree. الاحتضار calls this. */
export function stillness(root) {
  root?.querySelectorAll('*').forEach((el) => el.getAnimations?.().forEach((a) => a.cancel()));
  root?.setAttribute('data-motion', 'still');
}
