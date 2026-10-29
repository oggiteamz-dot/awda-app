/**
 * store.js — the signed-in person's own state, in the shape the screens read.
 *
 * The design prototype read a hard-coded `demo` object. This file replaces it
 * with the person's real rows, keeping the same field names so the screens did
 * not have to be rewritten to change where the numbers come from.
 *
 * OFFLINE. The last good state is kept on the device, so الصلاة and القضاء open
 * with no signal. A prayer ticked with no signal goes into a small outbox and is
 * sent when the phone is back online. Nothing is lost and nothing is invented.
 */
import * as cloud from './cloud.js';
import { toHijri, hijriToGregorian, OBLIGATION_AGE } from './num.js';

export const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const CACHE = 'awda.state.v1';
const OUTBOX = 'awda.outbox.v1';
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayIso = () => iso(new Date());

export const demo = {
  signedIn: false, email: '', onboarded: false,
  name: '', gender: null, today: [0, 0, 0, 0, 0],
  owed: 0, startOwed: 0, perDay: 3, weekMadeUp: 0, offset: 0,
  ledger: [], hasQada: false, calc: {},
  will: { done: 0, total: 7, missing: [] },
  weeks: Array(49).fill(0),
};

function fromCache() {
  try { Object.assign(demo, JSON.parse(localStorage.getItem(CACHE) || '{}')); } catch { /* none yet */ }
}
function toCache() { try { localStorage.setItem(CACHE, JSON.stringify(demo)); } catch { /* full */ } }
export function forget() { try { localStorage.removeItem(CACHE); localStorage.removeItem(OUTBOX); } catch { /* ok */ } }
fromCache();

function applyLedger(rows) {
  demo.ledger = rows;
  demo.startOwed = rows.reduce((n, r) => n + r.owed, 0);
  demo.owed = rows.reduce((n, r) => n + (r.owed - r.made_up), 0);
  demo.hasQada = demo.startOwed > 0;
}

/** Pull everything this person owns. Falls back to the device copy offline. */
export async function load() {
  const user = await cloud.me();
  demo.signedIn = !!user; demo.email = user?.email || '';
  if (!user) return demo;
  try {
    await flush();
    const since = new Date(); since.setDate(since.getDate() - 48);
    const [p, days, rows] = await Promise.all([cloud.loadProfile(), cloud.prayersSince(iso(since)), cloud.qadaLoad()]);
    demo.name = p?.display_name || ''; demo.gender = p?.gender || null;
    demo.perDay = p?.per_day || 3; demo.offset = p?.hijri_offset || 0;
    demo.calc = p?.calc || {}; demo.onboarded = !!p?.onboarded_at; demo.remind = p?.remind || [];
    const wk = demo.calc.week || {};
    demo.weekMadeUp = wk.start === weekStart() ? wk.n || 0 : 0;
    const byDay = {};
    for (const r of days) (byDay[r.day] ||= new Set()).add(r.prayer);
    demo.today = PRAYER_KEYS.map((k) => (byDay[todayIso()]?.has(k) ? 1 : 0));
    demo.weeks = Array.from({ length: 49 }, (_, k) => {
      const d = new Date(); d.setDate(d.getDate() - (48 - k));
      const n = byDay[iso(d)]?.size || 0;
      return n === 5 ? 1 : n ? 'p' : 0;
    });
    applyLedger(rows);
    toCache();
  } catch (err) {
    window.reportError?.(err, 'loading the person’s state', 'STATE_LOAD_FAILED');
  }
  return demo;
}

/* ── today's prayers, with an outbox for no-signal moments ─────────────── */
function queue(job) {
  let q = []; try { q = JSON.parse(localStorage.getItem(OUTBOX) || '[]'); } catch { q = []; }
  q = q.filter((j) => !(j.day === job.day && j.prayer === job.prayer)); q.push(job);
  try { localStorage.setItem(OUTBOX, JSON.stringify(q)); } catch { /* full */ }
}
export async function flush() {
  let q = []; try { q = JSON.parse(localStorage.getItem(OUTBOX) || '[]'); } catch { return; }
  const left = [];
  for (const j of q) {
    try { await cloud.setPrayed(j.day, j.prayer, j.on); } catch { left.push(j); }
  }
  try { localStorage.setItem(OUTBOX, JSON.stringify(left)); } catch { /* ok */ }
}
addEventListener('online', () => flush());

export async function togglePrayer(n) {
  demo.today[n] = demo.today[n] ? 0 : 1;
  demo.weeks[48] = demo.today.every(Boolean) ? 1 : demo.today.some(Boolean) ? 'p' : 0;
  toCache();
  const job = { day: todayIso(), prayer: PRAYER_KEYS[n], on: !!demo.today[n] };
  try { await cloud.setPrayed(job.day, job.prayer, job.on); } catch { queue(job); }
}

/* ── qaḍāʾ ─────────────────────────────────────────────────────────────── */
function weekStart() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return iso(d); }

/** Record make-ups: counts per prayer, taken from the OLDEST year first. */
export async function logQada(counts) {
  let total = 0;
  for (const [prayer, n0] of Object.entries(counts)) {
    let n = n0;
    const years = demo.ledger.filter((r) => r.prayer === prayer && r.made_up < r.owed).sort((a, b) => a.hijri_year - b.hijri_year);
    for (const r of years) {
      while (n > 0 && r.made_up < r.owed) {
        const step = Math.min(n, 50, r.owed - r.made_up);
        const v = await cloud.qadaMark(r.hijri_year, prayer, step);
        const moved = (v ?? r.made_up) - r.made_up;
        r.made_up = v ?? r.made_up; n -= step; total += moved;
        if (!moved) break;
      }
      if (n <= 0) break;
    }
  }
  applyLedger(demo.ledger);
  demo.weekMadeUp += total;
  demo.calc = { ...demo.calc, week: { start: weekStart(), n: demo.weekMadeUp } };
  await cloud.saveProfile({ calc: demo.calc });
  toCache();
  return total;
}
export async function setPace(perDay) {
  demo.perDay = perDay; toCache();
  await cloud.saveProfile({ per_day: perDay });
}
export async function setOffset(o) {
  demo.offset = o; toCache();
  await cloud.saveProfile({ hijri_offset: o });
}

/**
 * The onboarding result, split into Hijri years. Each year's owed days are the
 * days of that year that fall between the obligation date and the day the
 * person started praying, scaled by the same menstruation and travel
 * subtractions the onboarding showed line by line — so the ledger sums to the
 * exact number the person saw, not to a second estimate.
 */
export function splitByYear({ birth, gender, startedPraying, effectiveDays, offset = 0 }) {
  const bh = toHijri(birth, offset);
  const age = OBLIGATION_AGE[gender] ?? OBLIGATION_AGE.m;
  const from = hijriToGregorian(bh.y + age, bh.m, bh.d, offset);
  const to = startedPraying instanceof Date && startedPraying > from ? startedPraying : new Date();
  const DAY = 86400000;
  const span = Math.max(0, Math.round((to - from) / DAY));
  if (!span || !effectiveDays) return [];
  const years = [];
  for (let y = bh.y + age; ; y++) {
    const a = new Date(Math.max(+from, +hijriToGregorian(y, 1, 1, offset)));
    const b = new Date(Math.min(+to, +hijriToGregorian(y + 1, 1, 1, offset)));
    if (a >= to) break;
    const days = Math.max(0, Math.round((b - a) / DAY));
    if (days) years.push({ year: y, days });
  }
  const scale = Math.min(1, effectiveDays / span);
  let sum = 0;
  const out = years.map((r) => { const owed = Math.min(400, Math.floor(r.days * scale)); sum += owed; return { year: r.year, owed }; });
  let rest = Math.min(effectiveDays, span) - sum;
  for (let k = out.length - 1; rest > 0 && k >= 0; k--) {
    const add = Math.min(rest, 400 - out[k].owed); out[k].owed += add; rest -= add;
  }
  return out.filter((r) => r.owed > 0);
}

/** Save everything the onboarding collected, in one go, at its last step. */
export async function saveOnboarding(a) {
  const calc = {
    birth: a.birth ? iso(a.birth) : null, started: a.started instanceof Date ? iso(a.started) : a.started,
    menstrualDays: a.menstrualDays, gapDays: a.gapDays, prayers: a.result?.prayers || 0,
  };
  await cloud.saveProfile({
    display_name: a.name?.trim() || null, gender: a.gender, per_day: a.perDay,
    remind: a.remind, calc, onboarded_at: new Date().toISOString(),
  });
  if (a.result?.prayers && a.birth) {
    const rows = splitByYear({ birth: a.birth, gender: a.gender, startedPraying: a.started instanceof Date ? a.started : null,
      effectiveDays: a.result.prayers / 5 });
    for (const r of rows) await Promise.all(PRAYER_KEYS.map((p) => cloud.qadaSetOwed(r.year, p, r.owed)));
  }
  await load();
}
