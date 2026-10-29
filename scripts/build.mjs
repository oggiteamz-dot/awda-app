#!/usr/bin/env node
/**
 * build.mjs — one source tree, THREE separate apps.
 *
 *   node scripts/build.mjs            → dist/app · dist/desk · dist/console
 *
 * Each door's folder receives ONLY the modules reachable from its own entry,
 * found by following the import statements — never by copying src/ wholesale.
 * That is what keeps the scholars' and admins' screens out of the public
 * folder: not a flag, not a role check, but the files physically not being
 * there. scripts/gates.mjs then proves it on the output.
 *
 * Each folder is a complete, installable PWA on its own: index.html, its own
 * manifest (name, icon, colour, scope), its own service worker with its own
 * precache list and cache name, robots rules, security headers, and a
 * wrangler.toml whose worker name comes from deploy.local.json — a file that is
 * never committed, so the staff addresses are not written in the repository.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DOORS = JSON.parse(readFileSync(join(ROOT, 'doors.json'), 'utf8'));
const LOCAL = existsSync(join(ROOT, 'deploy.local.json')) ? JSON.parse(readFileSync(join(ROOT, 'deploy.local.json'), 'utf8')) : {};
const SUPABASE = 'https://upgfyvdnuniccgkwyacd.supabase.co';
const STAMP = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);

/** Every module reachable from `entry`, following static and dynamic imports. */
function reach(entry) {
  const seen = new Set();
  const walk = (abs) => {
    if (seen.has(abs)) return;
    if (!existsSync(abs)) throw new Error(`missing import: ${relative(ROOT, abs)}`);
    seen.add(abs);
    const src = readFileSync(abs, 'utf8');
    if (abs.endsWith('supabase.esm.js')) return;          // vendored, self-contained
    const re = /(?:import|export)\s[^'"`;]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|^\s*import\s*['"](\.{1,2}\/[^'"]+)['"]/gm;
    for (const m of src.matchAll(re)) walk(resolve(dirname(abs), m[1] || m[2] || m[3]));
  };
  walk(join(ROOT, entry));
  return [...seen].map((a) => relative(ROOT, a)).sort();
}

const listFiles = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f); return statSync(p).isDirectory() ? listFiles(p) : [p];
});

function indexHtml(key, d, build) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="awda-door" content="${key}">
<meta name="awda-palette" content="${d.palette}">
<meta name="awda-build" content="${build}">
<meta name="theme-color" content="${d.theme}">
<meta name="description" content="${d.description}">
${d.index ? '' : '<meta name="robots" content="noindex,nofollow,noarchive">\n<meta name="referrer" content="no-referrer">\n'}<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${d.short}">
<title>${d.title}</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="stylesheet" href="src/core/style.css">
<link rel="stylesheet" href="src/core/layout.css">
<link rel="stylesheet" href="src/core/extra.css">
${(d.css || []).map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}
<style>
  @media (min-width:900px){
    body{display:grid;place-items:center;min-height:100dvh;padding:28px;background:${d.theme}}
    #frame{width:390px;height:844px;border-radius:44px;overflow:hidden;position:relative;transform:translateZ(0);
      box-shadow:0 0 0 11px #1B2025,0 0 0 13px #2A3138,0 34px 90px rgba(0,0,0,.6)}
    #frame>#view-scroll{height:100%;overflow-y:auto;overflow-x:hidden;background:var(--bg)}
    #tabs{position:absolute!important}
  }
  @media (max-width:899px){ #frame{min-height:100dvh} }
</style>
<script src="error-sink.js"></script>
</head>
<body data-door="${key}">
<div id="frame">
  <div id="view-scroll">
    <main id="app"><div id="view"></div></main>
  </div>
  <nav id="tabs" class="tabs" aria-label="التنقّل" hidden></nav>
</div>
<noscript><p style="padding:24px;font-family:sans-serif">هذا التطبيق يحتاج JavaScript.</p></noscript>
<script type="module" src="${d.entry}"></script>
</body>
</html>
`;
}

function manifest(key, d) {
  return JSON.stringify({
    id: `./?door=${key}`, name: d.title, short_name: d.short, description: d.description,
    lang: 'ar', dir: 'rtl', start_url: './', scope: './', display: 'standalone',
    orientation: 'portrait', background_color: d.background, theme_color: d.theme,
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2);
}

function sw(key, files, build) {
  return `/* sw.js — ${key}. Generated by scripts/build.mjs; do not edit by hand.
 * Precache the whole app so it opens with no signal. The cache name carries the
 * build, so a new build never serves an old file under a new name. Requests to
 * the database are NEVER cached here — only the app's own files are. */
const CACHE = 'awda-${key}-${build}';
const FILES = ${JSON.stringify(['./', ...files.filter((f) => f !== 'sw.js')], null, 0)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.endsWith('/__version.json')) return;               // always live
  const nav = e.request.mode === 'navigate';
  e.respondWith(caches.match(nav ? './' : e.request, { ignoreSearch: true }).then((hit) =>
    hit || fetch(e.request).then((res) => {
      if (res.ok && u.pathname.startsWith(new URL('./', location).pathname)) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./'))));
});
`;
}

function headers(d) {
  const csp = [
    "default-src 'self'", `connect-src 'self' ${SUPABASE} ${SUPABASE.replace('https', 'wss')}`,
    "img-src 'self' data: blob:", "style-src 'self' 'unsafe-inline'", "font-src 'self'",
    "script-src 'self'", "media-src 'self' blob:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'none'",
  ].join('; ');
  return `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: ${d.index ? 'strict-origin-when-cross-origin' : 'no-referrer'}
  Permissions-Policy: geolocation=(), camera=(), microphone=(self)
  X-Frame-Options: DENY
${d.index ? '' : '  X-Robots-Tag: noindex, nofollow, noarchive\n'}
/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache

/__version.json
  Cache-Control: no-store
`;
}

rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
for (const [key, d] of Object.entries(DOORS)) {
  const out = join(ROOT, 'dist', key);
  mkdirSync(out, { recursive: true });
  const mods = reach(d.entry);
  for (const f of mods) { mkdirSync(join(out, dirname(f)), { recursive: true }); cpSync(join(ROOT, f), join(out, f)); }
  for (const css of ['style.css', 'layout.css', 'extra.css']) cpSync(join(ROOT, 'src/core', css), join(out, 'src/core', css));
  for (const css of d.css || []) { mkdirSync(join(out, dirname(css)), { recursive: true }); cpSync(join(ROOT, css), join(out, css)); }
  cpSync(join(ROOT, 'assets/fonts'), join(out, 'assets/fonts'), { recursive: true });
  cpSync(join(ROOT, 'src/error-sink.js'), join(out, 'error-sink.js'));
  const icons = join(ROOT, 'build/icons', key);
  if (!existsSync(icons)) throw new Error(`no icons for ${key} — run: node scripts/icons.mjs`);
  cpSync(icons, join(out, 'icons'), { recursive: true });

  const hash = createHash('sha256');
  for (const f of listFiles(out).sort()) hash.update(relative(out, f)).update(readFileSync(f));
  const build = `${STAMP}-${hash.digest('hex').slice(0, 8)}`;

  writeFileSync(join(out, 'index.html'), indexHtml(key, d, build));
  writeFileSync(join(out, 'manifest.webmanifest'), manifest(key, d));
  writeFileSync(join(out, '__version.json'), JSON.stringify({ door: key, build, modules: mods.length }, null, 2));
  writeFileSync(join(out, 'robots.txt'), d.index ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n');
  writeFileSync(join(out, '_headers'), headers(d));
  const files = listFiles(out).map((f) => relative(out, f)).filter((f) => !['_headers', 'wrangler.toml', '.assetsignore'].includes(f)).sort();
  writeFileSync(join(out, 'sw.js'), sw(key, files, build));
  const worker = LOCAL[key]?.worker || (key === 'app' ? 'awda' : `awda-${key}-SET-IN-deploy.local.json`);
  writeFileSync(join(out, 'wrangler.toml'), `# ${d.title} — deploy with: npx wrangler deploy (from this folder)\n# workers.dev only: pages.dev does not load on the owner's network.\nname = "${worker}"\ncompatibility_date = "2026-09-01"\n\n[assets]\ndirectory = "./"\nnot_found_handling = "single-page-application"\n`);
  writeFileSync(join(out, '.assetsignore'), 'wrangler.toml\n.assetsignore\n');
  console.log(`${key.padEnd(8)} ${String(mods.length).padStart(3)} modules  ${String(files.length).padStart(3)} files  build ${build}  → ${worker}`);
}
