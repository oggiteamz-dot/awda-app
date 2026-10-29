/**
 * pwa.js — install and offline, the same for all three doors.
 *
 * Each door is its own installable app: its own manifest, its own icon, its own
 * service worker scoped to its own address. Installing the scholars' desk does
 * not install the user app, and nothing in one can see the other's cache.
 *
 * The worker registers AFTER the first paint. A service worker that delays the
 * first render has made the app worse at the thing it was added to improve.
 * An update is OFFERED, never forced — swapping code under someone half-way
 * through their will is not something this app does.
 */
import { h } from './ui.js';

let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

export const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

let started = false;
export function startPwa() {
  if (started) return; started = true;
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = (w) => {
      if (document.querySelector('.upd')) return;
      const bar = h(`<div class="upd" role="status"><p>نسخةٌ أحدث جاهزة.</p>
        <div class="row" style="gap:8px"><button class="btn btn-sm" data-now>حدِّث الآن</button>
        <button class="btn btn-sm btn-quiet" data-later>لاحقاً</button></div></div>`);
      document.body.append(bar);
      bar.querySelector('[data-now]').onclick = () => { w.postMessage('skip'); };
      bar.querySelector('[data-later]').onclick = () => bar.remove();
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w);
      });
    });
  }).catch((err) => window.reportError?.(err, 'registering the service worker', 'SW_REGISTER_FAILED'));
  // Reload only when an UPDATE takes over. On a first visit the new worker
  // claims the page too, and reloading then would throw away whatever the
  // person was typing — the walk caught exactly that on the sign-in screen.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return; reloading = true; location.reload();
  });
}

/**
 * The install card, with three honest states: installable now (Android/Chrome),
 * needs the Share menu (iPhone Safari), or already installed (render nothing).
 */
export function installCard(name) {
  if (standalone()) return '';
  if (isIOS()) {
    return `<div class="card install" data-install>
      <b class="label">ثبّت ${name} على شاشتك</b>
      <p class="hint" style="margin-top:6px">في Safari: اضغط زرّ المشاركة ثمّ «إضافة إلى الشاشة الرئيسيّة». يعمل بعدها بلا متصفّح وبلا شبكة.</p></div>`;
  }
  return `<div class="card install" data-install>
    <div class="between"><div><b class="label">ثبّت ${name} على شاشتك</b>
      <p class="hint" style="margin-top:4px">يفتح كتطبيق، ويعمل بلا شبكة.</p></div>
    <button class="btn btn-sm" data-install-go>تثبيت</button></div></div>`;
}
export function wireInstall(root) {
  const b = root.querySelector('[data-install-go]');
  if (!b) return;
  const card = b.closest('[data-install]');
  // Chrome fires the prompt event when IT decides; until then there is nothing
  // to press, so the card waits hidden rather than offering a dead button.
  card.hidden = !deferred;
  addEventListener('beforeinstallprompt', () => { card.hidden = false; }, { once: true });
  b.onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; card.remove(); };
}
