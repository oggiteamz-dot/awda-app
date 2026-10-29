/**
 * cloud.js — THE ONLY FILE THAT KNOWS THERE IS A DATABASE.
 *
 * Every door (the app, the scholars' desk, the console) talks to the backend
 * through this file and nothing else. No screen imports the Supabase client and
 * no screen names a table. Swapping the backend later means rewriting this file.
 *
 * WHAT IS AND IS NOT A SECURITY BOUNDARY HERE. Nothing in this file protects
 * anything — a reader can edit JavaScript. Every rule that matters is enforced
 * by the database (row-level security + the role checks inside each function).
 * This file only asks politely; the database is the one that says no.
 */
import { createClient } from './supabase.esm.js';

const URL = 'https://upgfyvdnuniccgkwyacd.supabase.co';
const KEY = 'sb_publishable_ByGZqRZFF4yNLl5V3HHeQQ_1bxrZBOs';

/** Which door this page is: 'app' | 'desk' | 'console'. Set in index.html. */
export const DOOR = document.querySelector('meta[name="awda-door"]')?.content || 'app';

export const sb = createClient(URL, KEY, {
  auth: {
    // One storage key per door, so that even two doors served from one origin
    // (local testing) can never share a session.
    storageKey: 'awda.' + DOOR + '.auth',
    persistSession: true, autoRefreshToken: true,
    detectSessionInUrl: true, flowType: 'pkce',
  },
});

/** Turn a backend error into one Arabic sentence a person can act on. */
export function human(err) {
  const m = String(err?.message || err || '');
  if (/fetch|network|Failed to/i.test(m)) return 'لا يوجد اتّصال الآن. جرّب بعد قليل.';
  if (/rate|too many|security purposes/i.test(m)) return 'طلبات كثيرة متتالية. انتظر دقيقة ثمّ أعد المحاولة.';
  if (/expired|invalid.*(otp|token)|Token has expired/i.test(m)) return 'الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزاً جديداً.';
  if (/not allowed|permission|42501|cannot/i.test(m)) return 'ليست لديك صلاحيّة لهذا.';
  if (/not authorized|Email address/i.test(m)) return 'لا يمكن إرسال بريد إلى هذا العنوان بعد. أخبر الإدارة.';
  return 'حدث خطأ وسُجّل. جرّب مرّة أخرى.';
}
export const must = ({ data, error }) => { if (error) throw error; return data; };

/* ── identity ──────────────────────────────────────────────────────────── */
export async function me() {
  const { data } = await sb.auth.getSession();
  return data.session?.user || null;
}
export const onAuth = (fn) => sb.auth.onAuthStateChange((_e, s) => fn(s?.user || null));

/** Sends a 6-digit code (and a link) to the address. New addresses get an account. */
export async function sendCode(email) {
  const back = location.origin + location.pathname;
  must(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back, shouldCreateUser: true } }));
}
export async function verifyCode(email, token) {
  return must(await sb.auth.verifyOtp({ email, token, type: 'email' })).user;
}
export async function signOut() { await sb.auth.signOut(); }

/* ── published text (anyone may read it) ──────────────────────────────── */
export async function publishedText() {
  const rows = must(await sb.from('content_published').select('key,value'));
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/* ── published knowledge pages (anyone may read them) ─────────────────── */
export async function publishedPages() {
  return must(await sb.from('page').select('id,slug,section,title,summary,blocks,published_at,sort')
    .eq('status', 'published').order('sort').order('published_at', { ascending: false }).limit(500));
}

/* ── the person's own data (row-level security: only their own rows) ──── */
export async function loadProfile() {
  return must(await sb.from('profile').select('*').maybeSingle());
}
export async function saveProfile(patch) {
  const user = await me(); if (!user) throw new Error('not signed in');
  return must(await sb.from('profile').upsert({ user_id: user.id, ...patch, updated_at: new Date().toISOString() }).select().single());
}
export async function prayersSince(isoDay) {
  return must(await sb.from('prayer_day').select('day,prayer').gte('day', isoDay));
}
export async function setPrayed(isoDay, prayer, on) {
  const user = await me(); if (!user) throw new Error('not signed in');
  if (on) must(await sb.from('prayer_day').upsert({ user_id: user.id, day: isoDay, prayer }, { ignoreDuplicates: true }));
  else must(await sb.from('prayer_day').delete().match({ day: isoDay, prayer }));
}
export async function qadaLoad() { return must(await sb.rpc('qada_load')) || []; }
export async function qadaSetOwed(year, prayer, owed) {
  must(await sb.rpc('qada_set_owed', { p_year: year, p_prayer: prayer, p_owed: owed }));
}
export async function qadaMark(year, prayer, delta) {
  return must(await sb.rpc('qada_mark', { p_year: year, p_prayer: prayer, p_delta: delta }));
}
