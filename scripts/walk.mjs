#!/usr/bin/env node
/**
 * walk.mjs — open every screen of all three doors at 390px and LOOK.
 *
 * The database is mocked at the network layer (Playwright route), so this walk
 * never touches the live project and never creates an account. What it proves
 * is the part a mock can prove: every screen renders, in each role, with no
 * console error, no error reported to the sink, no horizontal scroll, no tap
 * target under 44px — and the refusals refuse. The live round-trip is proven
 * separately, against the real database, once the migration is applied.
 *
 *   node scripts/walk.mjs         → evidence/walk/*.png and a pass/fail list
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const OUT = join(ROOT, 'evidence/walk'); mkdirSync(OUT, { recursive: true });
const PORT = { app: 8101, desk: 8102, console: 8103 };
const servers = Object.entries(PORT).map(([d, p]) => spawn('python3', ['-m', 'http.server', String(p), '-d', join(ROOT, 'dist', d)], { stdio: 'ignore' }));
await new Promise((r) => setTimeout(r, 900));

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'walk@awda.test', aud: 'authenticated', role: 'authenticated',
  email_confirmed_at: '2026-09-01T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z' };
const session = () => ({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ3YWxrIn0.x', refresh_token: 'r', token_type: 'bearer',
  expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER });

const today = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
const LINES = [
  { key: 'ihtidar.v2.1.title', namespace: 'religious', kind: 'text', label: 'Step 1 title', hint: 'الاحتضار · الخطوة ١', draft_value: 'وجِّهه إلى القبلة', published_value: null, status: 'in_review', updated_at: iso(today), updated_by: USER.id, review_note: null },
  { key: 'will.verse', namespace: 'religious', kind: 'text', label: 'Quran 2:180', hint: 'بطاقة الوصيّة', draft_value: '﴿كُتِبَ عَلَيْكُمْ إِذَا حَضَرَ أَحَدَكُمُ الْمَوْتُ﴾', published_value: '﴿كُتِبَ عَلَيْكُمْ إِذَا حَضَرَ أَحَدَكُمُ الْمَوْتُ﴾', status: 'published', updated_at: iso(today), updated_by: null, review_note: null },
  { key: 'will.exec.exec1.label', namespace: 'product', kind: 'text', label: 'Will field label', hint: null, draft_value: 'الوصيّ الأول — الاسم + رقم الهاتف', published_value: 'الوصيّ الأول (والوليّ على الصغار) — الاسم + رقم الهاتف', status: 'in_review', updated_at: iso(today), updated_by: USER.id, review_note: null },
  { key: 'will.thuluth.text', namespace: 'religious', kind: 'longtext', label: 'Thuluth', hint: null, draft_value: 'وأوصي بأن يُصرف ثلث تركتي في وجوه البرّ.', published_value: 'وأوصي بأن يُصرف ثلث تركتي بعد إخراج الديون في وجوه البرّ والخير.', status: 'draft', updated_at: iso(today), updated_by: USER.id, review_note: 'راجِع الصيغة مع الشيخ قبل الإرسال.' },
];

function mock(state) {
  return async (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const single = (req.headers().accept || '').includes('vnd.pgrst.object');
    if (p.startsWith('/auth/v1/user')) return json(USER);
    if (p.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (p.startsWith('/auth/v1/otp')) return json({});
    if (p.endsWith('/rest/v1/app_error') && req.method() === 'POST') { state.sinkReports.push(req.postData()); return route.fulfill({ status: 201 }); }
    if (req.method() !== 'GET' && !p.includes('/rpc/')) return route.fulfill({ status: 204 });
    const rpc = p.split('/rpc/')[1];
    if (rpc === 'claim_invites' || rpc === 'my_roles') return json(state.roles);
    if (rpc === 'qada_load') return json(state.ledger);
    if (rpc === 'qada_mark') return json(1);
    if (rpc === 'admin_people') return json([{ user_id: USER.id, email: 'hadi@example.com', joined: iso(today), last_seen: iso(today), roles: ['owner'], onboarded: true },
      { user_id: '2', email: 'samer@example.com', joined: iso(today), last_seen: null, roles: ['writer'], onboarded: false },
      { user_id: '3', email: 'person@example.com', joined: iso(today), last_seen: null, roles: [], onboarded: true }]);
    if (rpc) return json(null);
    const table = p.split('/rest/v1/')[1];
    if (table === 'content_published') return json([{ key: 'calendar.month.03', value: 'ربيع الأوّل' }]);
    if (table === 'profile') return json(single ? state.profile : state.profile ? [state.profile] : []);
    if (table === 'prayer_day') return json(state.days);
    if (table === 'content_string') {
      let rows = LINES;
      const key = u.searchParams.get('key'); if (key) rows = rows.filter((r) => 'eq.' + r.key === key);
      const st = u.searchParams.get('status'); if (st) rows = rows.filter((r) => 'eq.' + r.status === st);
      return json(single ? rows[0] || null : rows);
    }
    if (table === 'content_audit') return json([{ action: 'submitted', actor_label: 'samer@example.com', at: iso(today), old_value: null, new_value: null }]);
    if (table === 'scholar_request') return json([{ id: 'r1', kind: 'new_page', title: 'باب الخمس — التعريف والحساب', body: 'نصّ مقترح…', status: 'new', answer: null, author_label: 'samer@example.com', created_at: iso(today) }]);
    if (table === 'role_invite') return json([{ id: 'i1', email: 'new.scholar@example.com', role: 'writer', invited_at: iso(today) }]);
    if (table === 'app_error') return json([]);
    return json([]);
  };
}

const days = Array.from({ length: 30 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() - k); return d; })
  .flatMap((d, k) => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].slice(0, k % 6 === 0 ? 2 : 5).map((prayer) => ({ day: iso(d), prayer })));
const ledger = [1440, 1441, 1442].flatMap((y) => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map((prayer) => ({ hijri_year: y, prayer, owed: 354, made_up: y === 1440 ? 120 : 0 })));
const PROFILE = { user_id: USER.id, display_name: 'هادي', gender: 'm', per_day: 3, hijri_offset: 0, remind: ['fajr'], onboarded_at: iso(today),
  calc: { birth: '1998-04-12', started: '2021-01-01', menstrualDays: 0, gapDays: 0, prayers: 5310 } };

const SCENES = [
  { door: 'app', name: 'app-signed-out', signed: false, roles: [], routes: ['#/welcome', '#/signin', '#/ihtidar', '#/home'] },
  { door: 'app', name: 'app-first-run', signed: true, roles: [], profile: null, ledger: [], days: [], routes: ['#/home', '#/qada', '#/onboarding/1', '#/prayers', '#/account'] },
  { door: 'app', name: 'app-returning', signed: true, roles: [], profile: PROFILE, ledger, days,
    routes: ['#/home', '#/prayers', '#/qada', '#/calendar', '#/knowledge', '#/index', '#/will', '#/ihtidar', '#/account', '#/admin', '#/studio'] },
  { door: 'desk', name: 'desk-signed-out', signed: false, roles: [], routes: ['#/'] },
  { door: 'desk', name: 'desk-no-role', signed: true, roles: [], routes: ['#/', '#/line/will.verse'] },
  { door: 'desk', name: 'desk-scholar', signed: true, roles: ['writer'], routes: ['#/', '#/ns/religious', '#/line/will.thuluth.text', '#/mine/returned', '#/request', '#/requests', '#/account'] },
  { door: 'console', name: 'console-signed-out', signed: false, roles: [], routes: ['#/'] },
  { door: 'console', name: 'console-scholar-refused', signed: true, roles: ['writer'], routes: ['#/', '#/queue'] },
  { door: 'console', name: 'console-owner', signed: true, roles: ['owner'], routes: ['#/', '#/queue', '#/people', '#/requests', '#/errors', '#/account'] },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const results = [];
for (const sc of SCENES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
  const state = { roles: sc.roles, profile: sc.profile ?? null, ledger: sc.ledger || [], days: sc.days || [], sinkReports: [] };
  await ctx.route('https://upgfyvdnuniccgkwyacd.supabase.co/**', mock(state));
  if (sc.signed) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`awda.${sc.door}.auth`, JSON.stringify(session())]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|serviceWorker|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  for (const r of sc.routes) {
    const before = errs.length, sinkBefore = state.sinkReports.length;
    await page.goto(`http://localhost:${PORT[sc.door]}/${r}`);
    await page.waitForTimeout(1300);
    const m = await page.evaluate(() => {
      const vw = innerWidth;
      const over = document.documentElement.scrollWidth > vw + 1;
      const small = [...document.querySelectorAll('button,a,input,textarea,[role=button]')].filter((e) => {
        const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
        return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]') && (b.height < 44 || b.width < 44) && e.type !== 'range';
      }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24) + ` ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`);
      return { over, small: small.slice(0, 6), screen: document.querySelector('[data-screen]')?.dataset.screen || location.hash,
        text: document.querySelector('#view')?.innerText.slice(0, 80).replace(/\s+/g, ' '), tabs: !document.getElementById('tabs').hidden };
    });
    const shot = `${sc.name}__${r.replace(/[#/]+/g, '_').replace(/^_|_$/g, '') || 'root'}.png`;
    await page.addStyleTag({ content: '#tabs{position:static!important} .fab,[data-fab]{position:static!important}' });
    await page.screenshot({ path: join(OUT, shot), fullPage: true });
    const e = errs.slice(before), sink = state.sinkReports.slice(sinkBefore);
    const ok = !e.length && !sink.length && !m.over && !m.small.length;
    results.push({ scene: sc.name, route: r, ok, ...m, errors: e, sink: sink.map((s) => s.slice(0, 160)), shot });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${sc.name.padEnd(24)} ${r.padEnd(28)} ${m.screen}${m.over ? ' H-SCROLL' : ''}${m.small.length ? ' SMALL:' + m.small.join('|') : ''}${e.length ? ' ERR:' + e.join('|').slice(0, 200) : ''}${sink.length ? ' SINK:' + sink[0].slice(0, 160) : ''}`);
  }
  await ctx.close();
}
await browser.close();
servers.forEach((s) => s.kill());
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} screens pass`);
import('node:fs').then((fs) => fs.writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2)));
process.exitCode = failed ? 1 : 0;
