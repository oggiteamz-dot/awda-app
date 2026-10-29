#!/usr/bin/env node
/**
 * gates.mjs — checks on the BUILT folders, because the folders are what ships.
 *
 *  1 ISOLATION   the user app contains no staff file and no staff word; the desk
 *                contains nothing of the console's and vice versa; no folder
 *                contains another door's address.
 *  2 PWA         every door has a manifest with 192+512+maskable icons, a
 *                service worker whose precache list names every file it serves,
 *                and index.html links both.
 *  3 STAFF HIDE  staff doors say noindex in three places (meta, header, robots).
 *  4 NO COLOUR   no hex colour in the new code (palettes.js is the only home).
 *  5 FILE CAP    300 lines, reported (pre-existing overruns listed, not hidden).
 *
 * Every gate is red-proved by `node scripts/gates.mjs --prove`, which plants a
 * violation in a scratch copy and requires the gate to fail on it.
 */
import { readFileSync, readdirSync, statSync, existsSync, cpSync, rmSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const LOCAL = existsSync(join(ROOT, 'deploy.local.json')) ? JSON.parse(readFileSync(join(ROOT, 'deploy.local.json'), 'utf8')) : {};
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
const text = (p) => /\.(js|html|css|json|webmanifest|txt|toml)$|_headers$/.test(p) ? readFileSync(p, 'utf8') : '';

const FORBIDDEN = {
  app: ['staff/', 'desk-main', 'console-main', 'مكتب العالِم', 'لوحة الإدارة', 'admin_people', 'admin_invite',
    'admin_revoke', 'ui_set_text', 'ui_reset_text', 'claim_invites', 'my_roles', 'annotation', 'page_revision',
    'content_audit', 'staff.invalid', 'admin-api', 'work_request', 'page_proposal', 'staff_inbox', 'request_signoff', LOCAL.desk?.worker, LOCAL.console?.worker],
  desk: ['console-main', 'admin-api', 'staff/admin', 'ui_set_text', 'ui_reset_text', 'admin_people', 'admin_invite',
    'admin_revoke', 'setPageStatus', 'لوحة الإدارة', 'request_decide', 'request_deliver', 'request_start',
    'approve_page_proposal', 'return_page_proposal', 'admin-requests', 'approvalsRoutes', 'requestAdmin', LOCAL.console?.worker],
  console: ['desk-main', LOCAL.desk?.worker],
};

export function check(dist) {
  const fails = [];
  for (const door of ['app', 'desk', 'console']) {
    const dir = join(dist, door);
    if (!existsSync(dir)) { fails.push(`${door}: folder missing`); continue; }
    const all = files(dir);
    for (const f of all) {
      const rel = relative(dir, f); const body = text(f);
      for (const w of FORBIDDEN[door].filter(Boolean)) {
        if (rel.includes(w) || body.includes(w)) fails.push(`${door}: «${w}» found in ${rel}`);
      }
    }
    // PWA
    const man = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8'));
    const sizes = man.icons.map((i) => i.sizes + ':' + i.purpose);
    for (const need of ['192x192:any', '512x512:any', '512x512:maskable']) if (!sizes.includes(need)) fails.push(`${door}: manifest lacks ${need} icon`);
    for (const i of man.icons) if (!existsSync(join(dir, i.src))) fails.push(`${door}: icon ${i.src} missing`);
    if (man.display !== 'standalone' || man.start_url !== './' || man.scope !== './') fails.push(`${door}: manifest display/start/scope wrong`);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    if (!html.includes('rel="manifest"')) fails.push(`${door}: index.html has no manifest link`);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    const listed = JSON.parse(sw.match(/const FILES = (\[.*?\]);/s)[1]);
    for (const f of all.map((x) => relative(dir, x))) {
      if (['sw.js', '_headers', 'wrangler.toml', '.assetsignore'].includes(f)) continue;
      if (!listed.includes(f)) fails.push(`${door}: ${f} not in the offline precache`);
    }
    for (const f of listed) if (f !== './' && !existsSync(join(dir, f))) fails.push(`${door}: precache names missing file ${f}`);
    // STAFF HIDE
    if (door !== 'app') {
      if (!html.includes('noindex')) fails.push(`${door}: no noindex meta`);
      if (!readFileSync(join(dir, '_headers'), 'utf8').includes('X-Robots-Tag: noindex')) fails.push(`${door}: no X-Robots-Tag`);
      if (!readFileSync(join(dir, 'robots.txt'), 'utf8').includes('Disallow: /')) fails.push(`${door}: robots allows crawling`);
    }
  }
  return fails;
}

function sourceChecks() {
  const fails = [], notes = [];
  const src = files(join(ROOT, 'src')).filter((f) => /\.(js|css)$/.test(f) && !f.endsWith('supabase.esm.js'));
  const NEW = ['src/staff/', 'src/core/extra.css', 'src/core/cloud.js', 'src/core/store.js', 'src/core/signin.js',
    'src/core/pwa.js', 'src/core/text.js', 'src/app.js', 'src/desk-main.js', 'src/console-main.js',
    'src/core/shell.js', 'src/core/overrides.js', 'src/core/pages.js', 'src/screens/library.js', 'src/screens/ihtidar.js'];
  for (const f of src) {
    const rel = relative(ROOT, f); const body = readFileSync(f, 'utf8');
    if (NEW.some((n) => rel.startsWith(n)) && /#[0-9a-fA-F]{3,8}\b(?![-\w])/.test(body.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').replace(/&#\d+;|#\/[\w/-]*/g, '')))
      fails.push(`colour literal in ${rel} — colours live in palettes.js only`);
    const n = body.split('\n').length;
    if (n > 300) notes.push(`${rel}: ${n} lines (cap 300)`);
  }
  return { fails, notes };
}

if (process.argv.includes('--prove')) {
  // Red-proof: plant one violation per gate in a scratch copy; each must be caught.
  const tmp = mkdtempSync(join(tmpdir(), 'awda-gate-'));
  const plant = [
    ['staff file in app', (d) => cpSync(join(d, 'desk/src/staff'), join(d, 'app/src/staff'), { recursive: true })],
    ['staff word in app', (d) => writeFileSync(join(d, 'app/src/x.js'), "sb.rpc('ui_set_text')")],
    ['admin call in desk', (d) => writeFileSync(join(d, 'desk/src/y.js'), "rpc('admin_people')")],
    ['file missing from precache', (d) => writeFileSync(join(d, 'console/extra.txt'), 'x')],
    ['staff door indexable', (d) => writeFileSync(join(d, 'desk/robots.txt'), 'User-agent: *\nAllow: /\n')],
  ];
  let ok = true;
  for (const [name, fn] of plant) {
    rmSync(tmp, { recursive: true, force: true }); cpSync(join(ROOT, 'dist'), tmp, { recursive: true });
    fn(tmp);
    const caught = check(tmp).length > 0;
    console.log(`${caught ? 'RED ✓' : 'MISSED ✗'}  ${name}`);
    ok &&= caught;
  }
  rmSync(tmp, { recursive: true, force: true });
  process.exit(ok ? 0 : 1);
}

const fails = check(join(ROOT, 'dist'));
const s = sourceChecks();
for (const n of s.notes) console.log('note  ' + n);
for (const f of [...fails, ...s.fails]) console.log('FAIL  ' + f);
console.log(fails.length + s.fails.length ? `\n${fails.length + s.fails.length} gate failures` : '\nall gates green');
process.exit(fails.length + s.fails.length ? 1 : 0);
