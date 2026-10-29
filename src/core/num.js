/**
 * num.js — numerals, the Hijri calendar, and the qaḍāʾ arithmetic.
 *
 * Numbers are the hero of this design, so they get their own module and their
 * own rules:
 *
 *  1. EASTERN ARABIC DIGITS (٠١٢٣٤٥٦٧٨٩) everywhere in the Arabic interface.
 *     Western digits in an otherwise Arabic UI is the tell of a translated app.
 *  2. TABULAR FIGURES always. A number that changes must not shift the layout
 *     under it — that is the difference between an instrument and a toy.
 *  3. THOUSANDS ARE GROUPED with U+066C, the Arabic thousands separator (٬),
 *     not a Latin comma.
 *  4. EVERY COMPUTED NUMBER CARRIES ITS BASIS. A qaḍāʾ estimate that appears
 *     without saying what it was computed from is a number a person cannot argue
 *     with, and this one they must be able to argue with.
 */

const AR = '٠١٢٣٤٥٦٧٨٩';
export const toAr = (s) => String(s).replace(/[0-9]/g, (d) => AR[+d]);
export const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
/** The canonical way to put a number on screen in Arabic. */
export const num = (n, ar = true) => (ar ? toAr(group(n)) : group(n));

/* ── The Hijri calendar ─────────────────────────────────────────────────────
 * This is the TABULAR (arithmetical) Islamic calendar — the civil reckoning,
 * not an observation. It can differ from the sighting by a day, which is exactly
 * why SPEC R-09 requires a ±1 offset control the user can set. The app states
 * which it is using rather than pretending the two are the same, because a
 * person fixing the date of a fast or a death anniversary needs to know.        */

const HIJRI_EPOCH = 1948439.5; // JD of 1 Muharram 1 AH, civil reckoning

const g2jd = (y, m, d) => {
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100), b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
};
const jd2g = (jd) => {
  const z = Math.floor(jd + 0.5); let a = z;
  if (z >= 2299161) { const al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  return { y: month > 2 ? c - 4716 : c - 4715, m: month, d: day };
};

export const HIJRI_MONTHS = ['محرّم', 'صفر', 'ربيع الأوّل', 'ربيع الآخر', 'جُمادى الأولى', 'جُمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوّال', 'ذو القعدة', 'ذو الحجّة'];
export const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Gregorian Date -> {y,m,d} Hijri. `offset` is the ±1 sighting correction. */
export function toHijri(date, offset = 0) {
  const jd = g2jd(date.getFullYear(), date.getMonth() + 1, date.getDate()) + offset;
  const days = Math.floor(jd - HIJRI_EPOCH) + 1;
  const y = Math.floor((30 * days + 10646) / 10631);
  const prior = hijriToJD(y, 1, 1);
  let m = Math.min(12, Math.ceil((jd - (prior - 0.5)) / 29.5) + 1);
  while (hijriToJD(y, m, 1) > jd) m--;
  const d = Math.floor(jd - hijriToJD(y, m, 1)) + 1;
  return { y, m, d };
}
export function hijriToJD(y, m, d) {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + HIJRI_EPOCH - 1;
}
export function hijriToGregorian(y, m, d, offset = 0) {
  const g = jd2g(hijriToJD(y, m, d) - offset);
  return new Date(g.y, g.m - 1, g.d);
}
export const hijriMonthLength = (y, m) => Math.round(hijriToJD(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - hijriToJD(y, m, 1));
export const fmtHijri = (h) => `${toAr(h.d)} ${HIJRI_MONTHS[h.m - 1]} ${toAr(h.y)}`;

/* ── The qaḍāʾ arithmetic ───────────────────────────────────────────────────
 * D-005: THE FIQH MATHS IS CODE, NEVER CONTENT. Obligation ages, what counts as
 * owed, and the menstruation subtraction stay here and there is no admin screen
 * for them — a wrong edit corrupts every user's debt silently, produces no
 * error, and nobody would ever see it happen. Text being wrong is visible; a
 * number being wrong is not.
 *
 * Returned as STEPS, not just a total, because the onboarding shows the person
 * the whole computation line by line. An estimate you can see the working of is
 * an estimate you can correct; a bare number is one you either believe or
 * abandon.                                                                     */

export const OBLIGATION_AGE = { f: 9, m: 15 }; // lunar years — Imāmī reckoning

export function computeQada({ birth, gender, startedPraying, menstrualDays = 0, gapDays = 0, offset = 0 }) {
  const bh = toHijri(birth, offset);
  const ageY = OBLIGATION_AGE[gender] ?? OBLIGATION_AGE.m;
  const obligationJD = hijriToJD(bh.y + ageY, bh.m, bh.d);
  const todayJD = g2jd(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
  const totalDays = Math.max(0, Math.floor(todayJD - obligationJD));

  const prayedFromJD = startedPraying
    ? Math.max(obligationJD, g2jd(startedPraying.getFullYear(), startedPraying.getMonth() + 1, startedPraying.getDate()))
    : todayJD;
  const prayedDays = Math.max(0, Math.floor(todayJD - prayedFromJD));

  const owedDays = Math.max(0, totalDays - prayedDays);
  const lunarMonths = owedDays / 29.53;
  const menstrual = gender === 'f' ? Math.round(lunarMonths * menstrualDays) : 0;
  const effectiveDays = Math.max(0, owedDays - menstrual - gapDays);
  const prayers = effectiveDays * 5;

  return {
    prayers,
    obligationHijri: toHijri(hijriToGregorian(bh.y + ageY, bh.m, bh.d, offset), offset),
    steps: [
      { key: 'age', ar: 'سنّ التكليف', value: `${toAr(ageY)} سنة قمريّة`, basis: gender === 'f' ? 'للأنثى، بالتقويم القمريّ' : 'للذكر، بالتقويم القمريّ' },
      { key: 'since', ar: 'الأيّام منذ التكليف', value: `${num(totalDays)} يوم`, basis: 'من تاريخ ميلادك الذي أدخلته' },
      { key: 'prayed', ar: 'الأيّام التي صلّيتَها', value: `− ${num(prayedDays)} يوم`, basis: 'من التاريخ الذي بدأتَ عنده' },
      ...(gender === 'f' ? [{ key: 'menses', ar: 'أيّام الحيض المطروحة', value: `− ${num(menstrual)} يوم`, basis: `${toAr(menstrualDays)} يوم في الشهر القمريّ` }] : []),
      ...(gapDays ? [{ key: 'gap', ar: 'السفر والمرض', value: `− ${num(gapDays)} يوم`, basis: 'بتقديرك أنت، وهو قابل للتعديل' }] : []),
      { key: 'days', ar: 'الأيّام الباقية', value: `${num(effectiveDays)} يوم`, basis: 'حاصل ما سبق' },
      { key: 'total', ar: 'الصلوات الواجبة', value: num(prayers), basis: `${num(effectiveDays)} × ٥ صلوات`, hero: true },
    ],
  };
}

/** Days to clear a debt at `perDay` make-ups, and the Hijri date it lands on. */
export function projectFinish(prayers, perDay, offset = 0) {
  if (!perDay) return null;
  const days = Math.ceil(prayers / perDay);
  const d = new Date(); d.setDate(d.getDate() + days);
  return { days, date: d, hijri: toHijri(d, offset), years: days / 354 };
}
