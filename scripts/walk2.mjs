#!/usr/bin/env node
/**
 * walk2.mjs — staff-in-the-app and the floating-card iḥtiḍār, walked at 390px.
 *
 * The database is mocked at the network layer; nothing touches the live
 * project. Each step opens a screen (and, where it matters, taps through it)
 * and checks: no console error, nothing sent to the error inbox, no sideways
 * scroll — plus the specific thing the step exists to prove.
 *
 *   node scripts/walk2.mjs   → evidence/walk2/*.png + results.json
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const MOCK_PW = 'mock-only-password';   // the database is mocked here; never a real password
const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const OUT = join(ROOT, 'evidence/walk2'); rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const PORT = { app: 8201, desk: 8202, console: 8203 };
const servers = Object.entries(PORT).map(([d, p]) => spawn('python3', ['-m', 'http.server', String(p), '-d', join(ROOT, 'dist', d)], { stdio: 'ignore' }));
await new Promise((r) => setTimeout(r, 900));

const day = new Date().toISOString();
const person = (id, email) => ({ id, email, aud: 'authenticated', role: 'authenticated', email_confirmed_at: day, app_metadata: {}, user_metadata: {}, created_at: day });
const HADI = person('11111111-1111-4111-8111-111111111111', 'hadi@example.com');
const SAMER = person('22222222-2222-4222-8222-222222222222', 'samer@staff.invalid');
const SCHOLAR = person('33333333-3333-4333-8333-333333333333', 'scholar@example.com');
const session = (u) => ({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ3YWxrIn0.x', refresh_token: 'r', token_type: 'bearer',
  expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: u });

const PUBLISHED = { id: 'p1', slug: 'wasiyya-hukm', section: 'will', status: 'published', title: 'الوصيّة: واجبة أم مستحبّة؟',
  summary: 'متى تصير الوصيّة واجبة على الإنسان', author: SAMER.id, author_label: SAMER.email, updated_at: day, published_at: day, sort: 0,
  blocks: [
    { t: 'p', text: 'الوصيّة مستحبّة في نفسها، وتصير واجبة إذا كان على الإنسان حقٌّ لا يُعرف إلّا بإخباره — كدَينٍ لا بيّنة عليه، أو أمانةٍ عنده، أو حقوقٍ شرعيّة في ذمّته.' },
    { t: 'verse', text: 'كُتِبَ عَلَيْكُمْ إِذَا حَضَرَ أَحَدَكُمُ ٱلْمَوْتُ إِن تَرَكَ خَيْرًا ٱلْوَصِيَّةُ لِلْوَٰلِدَيْنِ وَٱلْأَقْرَبِينَ بِٱلْمَعْرُوفِ', ref: 'البقرة · ١٨٠' },
    { t: 'h', text: 'ما الذي يُكتب فيها' },
    { t: 'p', text: 'ما في الذمّة من صلاةٍ وصيام، والديون والأمانات، ومن يتولّى التنفيذ.' },
    { t: 'note', text: 'صفحة نموذجيّة لأغراض العرض.' }] };
const PENDING = { id: 'p2', slug: 'qada-tartib', section: 'qada', status: 'pending', title: 'ترتيب القضاء: الأقدم أوّلاً؟',
  summary: null, author: SCHOLAR.id, author_label: SCHOLAR.email, updated_at: day, published_at: null, sort: 0,
  blocks: [{ t: 'p', text: 'لا يجب الترتيب في قضاء الفوائت إلّا في الظهرين والعشاءين من يومٍ واحد.' }] };
const RETURNED = { ...PENDING, id: 'p3', slug: 'ghusl-mayyit', section: 'death', status: 'returned', title: 'غسل الميّت', review_note: 'أضِف المصدر لكلّ غسلة.' };
const NOTES = [
  { id: 'n1', route: '#/ihtidar', target_key: 'ihtidar.c.shah.0', target_text: 'تلقينه الشهادتين، والإقرار بالأئمة الاثني عشر عليهم السلام.',
    note: 'أقترح ذكر الصيغة كاملة.', suggestion: 'تلقينه الشهادتين، والإقرار بالنبيّ والأئمة الاثني عشر عليهم السلام.', has_audio: true, has_drawing: false,
    status: 'open', author: SCHOLAR.id, author_label: SCHOLAR.email, created_at: day },
  { id: 'n2', route: '#/home', target_key: null, target_text: null, note: 'هذه البطاقة تحتاج مسافة أكبر.', suggestion: null,
    has_audio: false, has_drawing: true, scroll_y: 120, view_w: 390, status: 'open', author: SAMER.id, author_label: SAMER.email, created_at: day },
];
const DRAW = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="390" height="300"><ellipse cx="195" cy="150" rx="160" ry="70" fill="none" stroke="#0B6144" stroke-width="4"/></svg>').toString('base64');

function mock(state) {
  return async (route) => {
    const req = route.request(); const u = new URL(req.url()); const p = u.pathname; const m = req.method();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    const single = (req.headers().accept || '').includes('vnd.pgrst.object');
    const one = (rows) => json(single ? rows[0] ?? null : rows);
    if (p.startsWith('/auth/v1/token')) {
      const b = JSON.parse(req.postData() || '{}');
      if (b.email === 'samer@staff.invalid' && b.password === MOCK_PW) return json({ ...session(SAMER) });
      return json({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }, 400);
    }
    if (p.startsWith('/auth/v1/user')) return state.user ? json(state.user) : json({}, 401);
    if (p.startsWith('/auth/v1/logout')) return route.fulfill({ status: 204 });
    if (p.endsWith('/rest/v1/app_error') && m === 'POST') { state.sink.push(req.postData()); return route.fulfill({ status: 201 }); }
    const rpc = p.split('/rpc/')[1];
    if (rpc === 'claim_invites' || rpc === 'my_roles') return json(state.roles);
    if (rpc === 'qada_load') return json([]);
    if (rpc === 'admin_people') return json([{ user_id: HADI.id, email: HADI.email, joined: day, last_seen: day, roles: ['owner'], onboarded: true },
      { user_id: SAMER.id, email: SAMER.email, joined: day, last_seen: day, roles: ['admin'], onboarded: false },
      { user_id: SCHOLAR.id, email: SCHOLAR.email, joined: day, last_seen: null, roles: ['writer'], onboarded: false }]);
    if (rpc === 'ui_set_text') { state.saved.push(JSON.parse(req.postData())); return json(null); }
    if (rpc) return json(null);
    const table = p.split('/rest/v1/')[1];
    if (table === 'content_published') return json([{ key: 'ui.home.1ka35d9', value: 'صلواتك اليوم' }]);
    if (table === 'profile') return one([]);
    if (table === 'prayer_day') return json([]);
    if (table === 'page') {
      if (m !== 'GET') { const b = JSON.parse(req.postData() || '{}'); return json({ ...PENDING, ...b, id: 'p9', author: state.user?.id }); }
      let rows = state.pages;
      if (u.searchParams.get('status') === 'eq.published') rows = rows.filter((r) => r.status === 'published');
      const id = u.searchParams.get('id'); if (id) rows = rows.filter((r) => 'eq.' + r.id === id);
      return one(rows);
    }
    if (table === 'page_revision') return json([]);
    if (table === 'annotation') {
      if (m === 'POST') { const b = JSON.parse(req.postData() || '{}'); state.notesSaved.push(b); return json({ ...b, id: 'n9', status: 'open', author: state.user.id, author_label: state.user.email, created_at: day, has_audio: !!b.audio, has_drawing: !!b.drawing }); }
      if (u.searchParams.get('select')?.startsWith('id,drawing')) return json([{ id: 'n2', drawing: DRAW, scroll_y: 120, view_w: 390 }]);
      let rows = NOTES.filter((n) => !u.searchParams.get('status') || 'eq.' + n.status === u.searchParams.get('status'));
      const r = u.searchParams.get('route'); if (r) rows = rows.filter((n) => 'eq.' + n.route === r);
      return one(rows);
    }
    if (table === 'content_string') return one([{ key: 'ui.home.1ka35d9', label: 'صلوات اليوم', hint: 'in-app: home', published_value: 'صلواتك اليوم', status: 'published', updated_at: day }]);
    if (table === 'content_audit') return json([{ action: 'edited', actor_label: SAMER.email, old_value: 'صلوات اليوم', new_value: 'صلواتك اليوم', at: day }]);
    if (table === 'role_invite' || table === 'app_error') return json([]);
    return json([]);
  };
}

const tap = (sel, n = 0) => async (page) => { await page.locator(sel).nth(n).click(); await page.waitForTimeout(500); };
const tapText = (txt) => async (page) => { await page.getByText(txt, { exact: false }).first().click(); await page.waitForTimeout(500); };
const swipe = (sel, dx) => async (page) => {
  const b = await page.locator(sel).first().boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let k = 1; k <= 8; k++) await page.mouse.move(x + (dx * k) / 8, y, { steps: 2 });
  await page.mouse.up(); await page.waitForTimeout(700);
};
/** A deliberate drag: `dx` px over ~`ms`, then a hold before letting go (no flick). */
const drag = (sel, dx, { ms = 360, hold = 160 } = {}) => async (page) => {
  const b = await page.locator(sel).first().boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2, n = 12;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let k = 1; k <= n; k++) { await page.mouse.move(x + (dx * k) / n, y); await page.waitForTimeout(ms / n); }
  await page.waitForTimeout(hold); await page.mouse.up(); await page.waitForTimeout(900);
};
const tapFront = async (page) => {
  const b = await page.locator('.ih-card[data-front]').boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.25); await page.waitForTimeout(500);
};
const flick = (sel, dx) => async (page) => {
  const b = await page.locator(sel).first().boundingBox();
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let k = 1; k <= 8; k++) { await page.mouse.move(x + (dx * k) / 8, y); await page.waitForTimeout(10); }
  await page.mouse.up(); await page.waitForTimeout(1100);
};
const expectText = (txt) => async (page) => ({ ok: (await page.locator('body').innerText()).includes(txt), what: `shows «${txt}»` });
const expectNoText = (txt) => async (page) => ({ ok: !(await page.locator('body').innerText()).includes(txt), what: `does not show «${txt}»` });

const SCENES = [
  { door: 'app', name: 'app-signed-out', user: null, steps: [
    { hash: '#/ihtidar', shot: 'ihtidar-ring', wait: 1600, check: expectText('وضعيّة المحتضَر') },
    { act: drag('[data-stage]', 150), shot: 'ihtidar-after-swipe', check: async (p) => ({ ok: (await p.locator('[data-now-title]').innerText()) === 'تلقين الشهادتين', what: 'a slow drag moves exactly one card' }) },
    { act: async (p) => {
        await p.evaluate(() => { window.__a = []; const r = document.querySelector('[data-ring]');
          const f = () => { const m = r.style.transform.match(/rotateY\(([-\d.]+)deg/); if (m) window.__a.push(+m[1]); if (window.__a.length < 400) requestAnimationFrame(f); }; f(); });
        await drag('[data-stage]', 150, { ms: 600 })(p); },
      shot: 'ihtidar-no-jitter', check: async (p) => {
        const a = await p.evaluate(() => window.__a);
        let rev = 0, maxJump = 0, dir = 0;
        for (let i = 1; i < a.length; i++) { const d = a[i] - a[i - 1]; maxJump = Math.max(maxJump, Math.abs(d)); if (Math.abs(d) > 0.01) { const s = Math.sign(d); if (dir && s !== dir) rev++; dir = s; } }
        return { ok: rev <= 1 && maxJump < 12 && (await p.locator('[data-now-title]').innerText()) === 'كلمات الفَرَج', what: `smooth: ${a.length} frames, ${rev} reversal(s), biggest step ${maxJump.toFixed(1)}°` }; } },
    { act: async (p) => { await flick('[data-stage]', 220)(p); },
      shot: 'ihtidar-flick', check: async (p) => ({ ok: !['كلمات الفَرَج', 'تلقين التوبة والدعاء'].includes(await p.locator('[data-now-title]').innerText()), what: 'a quick flick carries past the next card' }) },
    { act: async (p) => { await drag('[data-stage]', -600, { ms: 900 })(p); await p.waitForTimeout(300); for (let k = 0; k < 8 && (await p.locator('[data-now-title]').innerText()) !== 'تلقين الشهادتين'; k++) await drag('[data-stage]', (await p.evaluate(() => [...document.querySelectorAll('.ih-card')].findIndex((c) => c.hasAttribute('data-front')))) > 1 ? -150 : 150)(p);
        await tapFront(p); }, shot: 'ihtidar-card-open', viewport: true, check: expectText('صلى الله عليه وآله') },
    { act: swipe('.ih-body', 140), shot: 'ihtidar-card-swiped', viewport: true, check: expectText('كلمات الفَرَج') },
    { act: async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.locator('[data-toggle-list]').click(); await p.waitForTimeout(400); }, shot: 'ihtidar-list', check: expectText('ما يُستحبّ') },
    { hash: '#/page/wasiyya-hukm', shot: 'page-signed-out', check: expectText('واجبة أم مستحبّة') },
  ] },
  { door: 'app', name: 'app-user', user: HADI, steps: [
    { hash: '#/home', shot: 'home-with-live-edit', check: expectText('صلواتك اليوم') },
    { hash: '#/knowledge', shot: 'knowledge', check: expectText('١ صفحة منشورة') },
    { hash: '#/section/will', shot: 'section', check: expectText('الوصيّة: واجبة') },
    { hash: '#/page/wasiyya-hukm', shot: 'page', check: expectText('البقرة · ١٨٠') },
    { hash: '#/home', shot: 'no-staff-bar', check: async (p) => ({ ok: !(await p.locator('.sbar').count()), what: 'no staff bar in the user app' }) },
  ] },
  { door: 'desk', name: 'desk-signin', user: null, roles: [], steps: [
    { hash: '#/', shot: 'signin', check: expectText('اسم المستخدم') },
  ] },
  { door: 'desk', name: 'desk-scholar', user: SCHOLAR, roles: ['writer'], steps: [
    { hash: '#/home', shot: 'home-view', check: async (p) => ({ ok: (await p.locator('.sbar [data-m]').count()) === 2, what: 'scholar has view + note only (no edit)' }) },
    { act: tap('.sbar [data-m="note"]'), hash: null, shot: 'home-note-mode', viewport: true, check: expectText('وضع الملاحظات') },
    { hash: '#/ihtidar', wait: 1600, shot: 'ihtidar-note-mode', check: async (p) => ({ ok: (await p.locator('[data-ed]').count()) > 5, what: 'lines are marked tappable' }) },
    { act: async (p) => { await p.locator('.sbar [data-m="view"]').click(); await drag('[data-stage]', 150)(p);
        await p.locator('.sbar [data-m="note"]').click(); await p.locator('.ih-card[data-front] .ih-t').click(); await p.waitForTimeout(500); },
      shot: 'note-sheet', viewport: true, check: expectText('صياغة مقترحة') },
    { act: async (p) => { await p.locator('#nt').fill('أقترح ذكر النبيّ صلى الله عليه وآله.'); await p.locator('[data-save-note]').click(); await p.waitForTimeout(600); },
      shot: 'note-saved', viewport: true, check: async (p, st) => ({ ok: st.notesSaved.length === 1 && st.notesSaved[0].target_key === 'ihtidar.c.shah.t', what: 'note saved against the card title key' }) },
    { act: tap('.sbar [data-draw]'), shot: 'draw', viewport: true, check: expectText('ارسم حول') },
    { act: async (p) => { const b = await p.locator('.sdraw canvas').boundingBox(); await p.mouse.move(b.x + 80, b.y + 300); await p.mouse.down();
        for (let a = 0; a <= 24; a++) await p.mouse.move(b.x + 195 + 110 * Math.cos(a / 24 * 6.3), b.y + 300 + 60 * Math.sin(a / 24 * 6.3));
        await p.mouse.up(); await p.locator('.sdraw [data-ok]').click(); await p.waitForTimeout(500); }, shot: 'draw-note', viewport: true, check: expectText('ملاحظتك') },
    { act: async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.locator('.sbar [data-m="view"]').click(); await p.locator('.sbar [data-panel]').click(); await p.waitForTimeout(500); },
      shot: 'panel', viewport: true, check: expectText('صفحاتي') },
    { hash: '#/staff/pages', shot: 'my-pages', check: expectText('غسل الميّت') },
    { hash: '#/staff/page/p3', shot: 'returned-page', check: expectText('أضِف المصدر') },
    { hash: '#/staff/page/new', shot: 'new-page', check: async (p) => ({ ok: (await p.locator('[data-save="pending"]').count()) === 1 && !(await p.locator('[data-save="published"]').count()), what: 'scholar can send, cannot publish' }) },
    { hash: '#/staff/page/p1', shot: 'published-page-locked', check: expectText('هذه الصفحة منشورة') },
    { hash: '#/staff/notes', shot: 'notes', check: async (p) => ({ ok: !(await p.locator('[data-apply]').count()), what: 'scholar cannot apply wording' }) },
  ] },
  { door: 'console', name: 'console-refused-scholar', user: SCHOLAR, roles: ['writer'], steps: [
    { hash: '#/', shot: 'refused', check: expectText('لا يمكن الدخول') },
  ] },
  { door: 'console', name: 'console-samer', user: null, roles: ['admin'], login: ['SAMER', MOCK_PW], steps: [
    { hash: '#/', shot: 'signin-wrong', act: async (p) => { await p.locator('#uid').fill('SAMER'); await p.locator('#pw').fill('000'); await p.locator('[data-go-pw]').click(); await p.waitForTimeout(700); },
      check: expectText('غير صحيحة') },
    { act: async (p, st) => { await p.locator('#uid').fill('SAMER'); await p.locator('#pw').fill(MOCK_PW); st.user = SAMER; await p.locator('[data-go-pw]').click(); await p.waitForTimeout(1600); },
      shot: 'home', check: async (p) => ({ ok: (await p.locator('.sbar [data-m]').count()) === 3, what: 'admin has view + edit + note' }) },
    { act: tap('.sbar [data-m="edit"]'), shot: 'home-edit-mode', viewport: true, check: expectText('وضع التعديل') },
    { act: tapText('صلواتك اليوم'), shot: 'edit-sheet', viewport: true, check: expectText('النصّ كما كُتب في التطبيق') },
    { act: async (p) => { await p.locator('#ed').fill('صلوات يومك'); await p.locator('.sheet [data-save]').click(); await p.waitForTimeout(700); },
      shot: 'edited-live', viewport: true, check: async (p, st) => ({ ok: st.saved.some((s) => s.p_key === 'ui.home.1ka35d9' && s.p_value === 'صلوات يومك') && (await p.locator('body').innerText()).includes('صلوات يومك'), what: 'saved and shown at once' }) },
    { hash: '#/ihtidar', wait: 1600, act: async (p) => { await p.locator('.sbar [data-m="view"]').click(); await tapFront(p);
        await p.locator('.sbar [data-m="edit"]').click(); await p.waitForTimeout(300); }, shot: 'ihtidar-edit-card', viewport: true, check: expectText('يُوضَع على ظهره') },
    { act: async (p) => { await p.locator('.ih-sheet .ih-item').first().click(); await p.waitForTimeout(500); }, shot: 'ihtidar-edit-line', viewport: true, check: async (p) => ({ ok: (await p.locator('#ed').inputValue()).startsWith('يُوضَع'), what: 'card line opens in the editor' }) },
    { act: async (p) => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.locator('.sbar [data-m="view"]').click(); }, hash: '#/staff/pages', shot: 'approvals', check: expectText('ترتيب القضاء') },
    { hash: '#/staff/page/p2', shot: 'approve-page', check: async (p) => ({ ok: (await p.locator('[data-save="published"]').count()) === 1 && (await p.locator('[data-return]').count()) === 1, what: 'approve and return offered' }) },
    { hash: '#/staff/notes', shot: 'notes-admin', check: async (p) => ({ ok: (await p.locator('[data-apply]').count()) === 1, what: 'admin can apply a suggested wording' }) },
    { hash: '#/staff/people', shot: 'people', check: expectText('SAMER') },
    { hash: '#/page/wasiyya-hukm', act: tap('.sbar [data-m="edit"]'), shot: 'page-edit-mode', viewport: true, check: async (p) => ({ ok: (await p.locator('[data-pk][data-ed]').count()) >= 4, what: 'page blocks editable in place' }) },
  ] },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const results = [];
for (const sc of SCENES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar' });
  const state = { user: sc.user, roles: sc.roles || [], pages: [PUBLISHED, PENDING, RETURNED], sink: [], saved: [], notesSaved: [] };
  await ctx.route('https://upgfyvdnuniccgkwyacd.supabase.co/**', mock(state));
  if (sc.user) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [`awda.${sc.door}.auth`, JSON.stringify(session(sc.user))]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|serviceWorker|Failed to load resource|401/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  let k = 0;
  for (const st of sc.steps) {
    const before = errs.length, sinkBefore = state.sink.length;
    try {
      if (st.hash) { await page.goto(`http://localhost:${PORT[sc.door]}/${st.hash}`); await page.waitForTimeout(st.wait || 1300); }
      if (st.act) await st.act(page, state);
      const c = st.check ? await st.check(page, state) : { ok: true, what: '' };
      const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      const shot = `${sc.name}__${String(++k).padStart(2, '0')}-${st.shot}.png`;
      await page.screenshot({ path: join(OUT, shot), fullPage: !st.viewport });
      const e = errs.slice(before), sink = state.sink.slice(sinkBefore);
      const ok = c.ok && !e.length && !sink.length && !over;
      results.push({ scene: sc.name, step: st.shot, ok, what: c.what, errors: e, sink: sink.map((s) => s.slice(0, 200)), over, shot });
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${sc.name.padEnd(24)} ${st.shot.padEnd(22)} ${c.what || ''}${over ? ' H-SCROLL' : ''}${e.length ? ' ERR:' + e.join('|').slice(0, 220) : ''}${sink.length ? ' SINK:' + sink[0].slice(0, 200) : ''}${c.ok ? '' : ' CHECK-FAILED'}`);
    } catch (err) {
      results.push({ scene: sc.name, step: st.shot, ok: false, errors: [String(err)] });
      console.log(`FAIL  ${sc.name.padEnd(24)} ${st.shot.padEnd(22)} THREW ${String(err).slice(0, 240)}`);
      await page.screenshot({ path: join(OUT, `${sc.name}__${String(++k).padStart(2, '0')}-${st.shot}-THREW.png`) }).catch(() => {});
    }
  }
  await ctx.close();
}
await browser.close();
servers.forEach((s) => s.kill());
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} steps pass`);
process.exitCode = failed ? 1 : 0;
