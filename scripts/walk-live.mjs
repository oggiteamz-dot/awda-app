// walk-live.mjs — the three doors walked at 390px against the LIVE database, with real logins.
// Creates test rows, then they must be removed (see the handoff note). Passwords come from env:
//   SAMER_PW, HADI_PW, SCHOLAR_PW.   node scripts/walk-live.mjs <folder holding dist/ and shots/>
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ROOT = process.argv[2], OUT = ROOT + '/shots';
const PW = { samer: process.env.SAMER_PW, hadi: process.env.HADI_PW, scholar: process.env.SCHOLAR_PW };
const PORT = { app: 8301, desk: 8302, console: 8303 };
const srv = Object.entries(PORT).map(([d, p]) => spawn('python3', ['-m', 'http.server', String(p), '-d', `${ROOT}/dist/${d}`], { stdio: 'ignore' }));
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch();
const log = []; let n = 0; const fails = [];
const ok = (name, cond) => { log.push(`${cond ? 'PASS' : 'FAIL'} ${name}`); if (!cond) fails.push(name); console.log(log.at(-1)); };
async function ctx(door) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ar' });
  const p = await c.newPage(); p.errs = [];
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts|Failed to load resource/i.test(m.text())) p.errs.push(m.text()); });
  p.on('pageerror', (e) => p.errs.push(String(e)));
  p.base = `http://localhost:${PORT[door]}/`;
  return p;
}
const wait = (p, ms = 900) => p.waitForTimeout(ms);
async function shot(p, name) { await wait(p, 700); n++; await p.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-${name}.png` }); }
async function go(p, hash) { await p.evaluate((h) => { location.hash = h; }, hash); await wait(p, 1400); }
async function signin(p, user) {
  await p.goto(p.base); await p.waitForSelector('#uid', { timeout: 15000 });
  await p.fill('#uid', user.toUpperCase()); await p.fill('#pw', PW[user]); await p.click('[data-go-pw]');
  await p.waitForSelector('.sbar', { timeout: 20000 }); await wait(p, 2500);
}
const toastText = (p) => p.evaluate(() => document.querySelector('.s-toast')?.textContent || '');
const sheetTop = (p) => p.locator('.sheet').last();
const T = Date.now().toString().slice(-5);
try {
  /* ── scholar ─────────────────────────────────────────────── */
  const S = await ctx('desk');
  await S.goto(S.base); await S.waitForSelector('#uid', { timeout: 15000 }); await shot(S, 'scholar-signin');
  await signin(S, 'scholar'); await shot(S, 'scholar-home');
  ok('scholar sees the staff bar with edit mode', await S.locator('.sbar [data-m="edit"]').count() === 1);
  await S.click('.sbar [data-panel]'); await shot(S, 'scholar-panel');
  ok('scholar panel has no approvals/people', await S.locator('[data-go-to="#/staff/approvals"],[data-go-to="#/staff/people"]').count() === 0);
  await S.keyboard.press('Escape'); await S.reload(); await S.waitForSelector('.sbar'); await wait(S, 1500);
  // a request: wall of text
  await S.click('.sbar [data-newpage]'); await wait(S, 500); await shot(S, 'scholar-new-choice');
  await S.click('[data-new="req"]'); await wait(S, 1200);
  await S.click('[data-kind="media"]');
  await S.fill('#rt', `فيديو قصير عن آداب الاحتضار ${T}`);
  await S.fill('#rb', 'يُستحبّ توجيه المحتضر إلى القبلة، بأن يُلقى على ظهره ويُجعل باطن قدميه إليها.\n\nويُستحبّ تلقينه الشهادتين والإقرار بالأئمّة عليهم السلام، وتكرار كلمات الفرج، وقراءة سورة يس والصافّات عنده.\n\nأرجو أن يُصنع منه فيديو قصير بالرسوم المتحرّكة، دقيقة إلى دقيقتين.');
  await shot(S, 'scholar-request-form');
  await S.click('[data-send]'); await S.waitForSelector('[data-screen="staff-request"]', { timeout: 15000 }); await shot(S, 'scholar-request-sent');
  ok('scholar request waits for admin', (await S.textContent('.tag')).includes('بانتظار موافقة المدير'));
  const reqId = S.url().split('/').pop();
  // a new page sent for approval
  await go(S, '#/staff/page/new');
  await S.click('[data-sec="death"]'); await wait(S, 400);
  await S.fill('#pt', `ما يُقرأ عند المحتضر ${T}`);
  await S.fill('[data-b="0"] textarea', 'يُستحبّ أن يُقرأ عنده سورة يس والصافّات، وآية الكرسيّ، وآخر سورة البقرة.');
  await S.click('[data-save="pending"]'); await wait(S, 2000); await shot(S, 'scholar-page-sent');
  ok('scholar page is pending, not published', (await S.textContent('.head, header, body')).includes('بانتظار الموافقة'));
  const pageId = S.url().split('/').pop();
  // suggest wording on a line of the app
  await go(S, '#/home'); await S.click('.sbar [data-m="edit"]'); await wait(S, 600); await shot(S, 'scholar-edit-mode');
  const line = S.locator('#view [data-ed]').first(); await line.click(); await wait(S, 800);
  const isWording = await S.locator('#sg').count();
  ok('scholar edit-mode tap opens a wording proposal', isWording === 1 && (await sheetTop(S).textContent()).includes('لا يتغيّر النصّ'));
  if (isWording) { await S.fill('#sg', (await S.inputValue('#sg')) + ' (اقتراح)'); await S.fill('#nt', 'تجربة اقتراح صياغة'); await shot(S, 'scholar-wording-sheet');
    await S.click('[data-save-note]'); await wait(S, 1500); ok('wording proposal saved', (await toastText(S)).includes('لا يتغيّر شيء')); }
  await S.click('.sbar [data-m="view"]');
  ok('scholar: no console errors', S.errs.length === 0); if (S.errs.length) console.log(S.errs);

  /* ── admin (Samer) ───────────────────────────────────────── */
  const A = await ctx('console');
  await signin(A, 'samer'); await shot(A, 'admin-home-badge');
  ok('admin badge counts waiting items', Number((await A.textContent('.sbar-badge')).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) >= 3);
  await A.click('.sbar [data-panel]'); await shot(A, 'admin-panel'); await A.keyboard.press('Escape');
  await go(A, '#/staff/approvals'); await shot(A, 'admin-approvals');
  ok('approvals shows request, page and wording', await A.locator('[data-req-yes]').count() >= 1 && (await A.textContent('[data-screen="staff-approvals"]')).includes('صفحات جديدة') && (await A.textContent('[data-screen="staff-approvals"]')).includes('صياغات مقترحة'));
  await A.locator(`[data-req-yes="${reqId}"]`).click(); await wait(A, 2000);
  ok('admin approved the request (step 1)', (await toastText(A)).includes('وُفق'));
  // approve the page
  await go(A, `#/staff/page/${pageId}`); await shot(A, 'admin-page-review');
  await A.click('[data-save="published"]'); await wait(A, 2000);
  ok('admin published the scholar page', (await A.textContent('body')).includes('منشورة'));
  // resolve the test wording note (do NOT apply it: it would go live for everyone)
  await go(A, '#/staff/approvals'); const res = A.locator('[data-resolve]').first(); if (await res.count()) { await res.click(); await wait(A, 1500); }
  // build: start, then deliver back to the scholar
  await go(A, `#/staff/request/${reqId}`); await A.click('[data-start]'); await wait(A, 1800);
  await A.fill('#rn', 'صُنع فيديو تجريبيّ من النصّ، وهو في شاشة الاحتضار. راجِعه ثمّ وافق.');
  await A.fill('#rr', '#/ihtidar'); await shot(A, 'admin-deliver-form');
  await A.click('[data-deliver]'); await wait(A, 2000); await shot(A, 'admin-request-delivered');
  ok('delivered → waiting for final approval', (await A.textContent('body')).includes('بانتظار الموافقة النهائيّة'));

  /* ── scholar: propose an edit to the now-published page, then sign off ── */
  await go(S, `#/staff/page/${pageId}`); await shot(S, 'scholar-proposing');
  ok('published page opens in proposal mode', await S.locator('[data-propose]').count() === 1);
  await S.fill('[data-b="0"] textarea', 'يُستحبّ أن يُقرأ عنده سورة يس والصافّات، وآية الكرسيّ، وآية السخرة، وآخر سورة البقرة.');
  await S.fill('#pn', 'إضافة آية السخرة.'); await S.click('[data-propose]'); await wait(S, 2000);
  ok('proposal sent', (await S.textContent('body')).includes('بانتظار الموافقة'));
  // nothing live yet
  const U = await ctx('app'); await U.goto(U.base); await wait(U, 2500);
  const live1 = await U.evaluate(async (id) => { const r = await fetch(`https://upgfyvdnuniccgkwyacd.supabase.co/rest/v1/page?id=eq.${id}&select=blocks`, { headers: { apikey: 'sb_publishable_ByGZqRZFF4yNLl5V3HHeQQ_1bxrZBOs' } }); return JSON.stringify(await r.json()); }, pageId);
  ok('proposal not live before approval', !live1.includes('السخرة'));
  await go(A, '#/staff/approvals'); await wait(A, 1500); await shot(A, 'admin-approvals-proposal-diff');
  await A.locator('[data-prop-yes]').first().click(); await wait(A, 2000);
  const live2 = await U.evaluate(async (id) => { const r = await fetch(`https://upgfyvdnuniccgkwyacd.supabase.co/rest/v1/page?id=eq.${id}&select=blocks`, { headers: { apikey: 'sb_publishable_ByGZqRZFF4yNLl5V3HHeQQ_1bxrZBOs' } }); return JSON.stringify(await r.json()); }, pageId);
  ok('proposal live after admin approval', live2.includes('السخرة'));
  await go(S, '#/staff/requests'); await wait(S, 800); await S.click('[data-f="review"]'); await wait(S, 1000); await shot(S, 'scholar-requests-review');
  await go(S, `#/staff/request/${reqId}`); await shot(S, 'scholar-final-approval');
  ok('scholar sees final-approval controls', await S.locator('[data-sign="yes"]').count() === 1);
  await S.click('[data-sign="yes"]'); await wait(S, 2000); await shot(S, 'scholar-request-done');
  ok('request done after scholar sign-off', (await S.textContent('body')).includes('اعتُمد ونُشر'));
  ok('admin: no console errors', A.errs.length === 0); if (A.errs.length) console.log(A.errs);

  /* ── owner (Hadi) and the public app ─────────────────────── */
  const H = await ctx('console'); await signin(H, 'hadi');
  await go(H, '#/staff/people'); await shot(H, 'owner-people');
  ok('owner sees the team', (await H.textContent('body')).includes('SAMER'));
  await go(H, '#/staff/requests'); await H.click('[data-f="closed"]'); await wait(H, 900); await shot(H, 'owner-requests-closed');
  await go(U, `#/page/x`); await wait(U, 500); await U.goto(U.base + '#/ihtidar'); await wait(U, 2500); await shot(U, 'public-ihtidar');
  ok('public app has no staff bar', await U.locator('.sbar').count() === 0);
  ok('public: no console errors', U.errs.length === 0); if (U.errs.length) console.log(U.errs);
  writeFileSync(`${OUT}/ids.json`, JSON.stringify({ reqId, pageId }));
} catch (e) { console.log('ERROR', e.message); fails.push('crash: ' + e.message.split('\n')[0]); }
await browser.close(); srv.forEach((s) => s.kill());
writeFileSync(`${OUT}/results.txt`, log.join('\n') + `\n\n${log.length - fails.length} passed, ${fails.length} failed`);
console.log(`\n${log.length - fails.length} passed, ${fails.length} failed`, fails);
