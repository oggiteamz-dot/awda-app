/**
 * shell.js — the app's router and frame, shared by every door.
 *
 * The user app calls startApp() and nothing else. The scholars' desk and the
 * admin console call the SAME startApp() — so staff see exactly the screens a
 * person sees — and pass in their own extra routes and an `after` hook that
 * lays the staff tools over each screen. Nothing staff-related lives in this
 * file; the user app's bundle still contains no staff code at all.
 *
 * Hash routing, no framework, no build step (D-001). A route may carry one
 * argument: '#/page/<slug>' calls ROUTES['#/page'](view, go, '<slug>').
 */
import { apply } from './theme.js';
import { icon } from './icons.js';
import { me, onAuth } from './cloud.js';
import { refreshText } from './text.js';
import { startPwa } from './pwa.js';
import { signIn } from './signin.js';
import { demo, load } from './store.js';
import { watch as watchOverrides, setPersonal } from './overrides.js';
import { refreshPages } from './pages.js';
import * as OB from '../screens/onboarding.js';
import * as M from '../screens/main.js';
import * as MO from '../screens/more.js';
import * as W from '../screens/will.js';
import * as I from '../screens/ihtidar.js';
import * as A from '../screens/account.js';
import * as AR from '../screens/areas.js';
import * as L from '../screens/library.js';
import { stylesSheet } from '../screens/account.js';

const SIGNIN = { kicker: 'عَوْدة', title: 'الدخول', sub: 'نرسل إلى بريدك رمزاً من أرقام. لا كلمة مرور تُنسى.', back: true };

/* FOUR tabs. A tab is a place you RETURN to; a card is a place you GO to. */
const TABS = [
  ['#/home', 'الرئيسيّة', 'home'], ['#/prayers', 'الصلاة', 'prayer'],
  ['#/index', 'الأقسام', 'grid'], ['#/account', 'حسابي', 'account'],
];

const BASE_ROUTES = {
  '#/welcome': (r, go) => OB.mount(r, go),
  '#/signin': (r, go) => signIn(r, { copy: SIGNIN, onDone: async () => { await load(); go(demo.onboarded ? '#/home' : '#/onboarding/1'); } }),
  '#/onboarding': (r, go) => OB.mount(r, go, { from: demo.signedIn ? 1 : 0 }),
  '#/onboarding/1': (r, go) => OB.mount(r, go, { from: 1 }),
  '#/home': M.home, '#/prayers': M.prayers, '#/qada': M.qada,
  '#/calendar': MO.calendar, '#/knowledge': MO.knowledge,
  '#/section': L.section, '#/page': L.page,
  '#/will': W.will, '#/will/section': W.section, '#/will/recipients': W.recipients,
  '#/messages': W.messages, '#/messages/record': W.record,
  '#/ihtidar': I.ihtidar,
  '#/index': AR.index, '#/history': AR.history, '#/stories': AR.stories, '#/daily': AR.daily,
  '#/account': A.account,
};
// Readable without an account: the door, the guidance for the dying (a relative
// in a corridor who never installed anything), and published knowledge pages.
const OPEN = new Set(['#/welcome', '#/signin', '#/ihtidar', '#/page', '#/section']);
const BARE = new Set(['#/welcome', '#/signin', '#/onboarding', '#/onboarding/1']);

export const go = (hash) => { location.hash = hash; };

/** Split '#/page/abc' into ['#/page', 'abc'] when '#/page' is a route taking an argument. */
function resolve(routes, raw) {
  if (routes[raw]) return [raw, ''];
  const m = raw.match(/^(#\/[^/]+(?:\/[^/]+)?)\/(.+)$/);
  if (m && routes[m[1]]) return [m[1], decodeURIComponent(m[2])];
  return [null, ''];
}

/**
 * Start the app.
 *   extraRoutes  more routes (staff doors only)
 *   after(hash)  called after every render — the staff layer hooks in here
 */
export function startApp({ extraRoutes = {}, after = () => {} } = {}) {
  const ROUTES = { ...BASE_ROUTES, ...extraRoutes };
  const view = document.getElementById('view');
  const trail = [];

  function tabs(active) {
    const bar = document.getElementById('tabs');
    bar.hidden = BARE.has(active) || !demo.signedIn;
    if (bar.hidden) return;
    bar.innerHTML = TABS.map(([h, t, ic]) => `
      <button class="tab" data-tab="${h}" ${h === active ? 'aria-current="page"' : ''}>
        ${icon(ic)}<span>${t}</span><span class="tab-dot"></span></button>`).join('');
    bar.querySelectorAll('[data-tab]').forEach((b) => b.onclick = () => go(b.dataset.tab));
  }

  function route() {
    const raw = location.hash.split('?')[0] || '';
    let [hash, arg] = resolve(ROUTES, raw);
    if (!hash) { hash = demo.signedIn ? '#/home' : '#/welcome'; arg = ''; }
    if (!demo.signedIn && !OPEN.has(hash)) { hash = '#/welcome'; arg = ''; }
    if (demo.signedIn && (hash === '#/welcome' || hash === '#/signin')) { hash = '#/home'; arg = ''; }
    const full = arg ? `${hash}/${encodeURIComponent(arg)}` : hash;
    if (trail[trail.length - 1] !== full) trail.push(full);
    window.scrollTo(0, 0);
    try {
      const out = ROUTES[hash](view, go, arg);
      if (out && typeof out.then === 'function') out.then(() => wire(hash)).catch((err) => window.reportError?.(err, 'rendering ' + hash, 'ROUTE_RENDER_FAILED'));
    } catch (err) { window.reportError?.(err, 'rendering ' + hash, 'ROUTE_RENDER_FAILED'); }
    tabs(hash);
    wire(hash);
  }

  function wire(hash) {
    view.querySelectorAll('[data-go]').forEach((el) => el.onclick = (e) => { e.stopPropagation(); go(el.dataset.go); });
    view.querySelectorAll('[data-back]').forEach((el) => el.onclick = () => {
      trail.pop(); go(trail.pop() || '#/home');
    });
    view.querySelectorAll('[data-styles]').forEach((el) => el.onclick = () => stylesSheet(view, go));
    try { after(hash); } catch (err) { window.reportError?.(err, 'after-render hook', 'AFTER_HOOK_FAILED'); }
  }

  (async function boot() {
    apply();
    setPersonal(() => [demo.name, demo.email]);
    watchOverrides();
    // First paint from the device's own copy, never waiting on the network.
    demo.signedIn = !!(await me());
    addEventListener('hashchange', route);
    route();
    // Then the real rows, and redraw once — unless the person is mid-form.
    const busy = () => ['#/welcome', '#/signin', '#/onboarding', '#/onboarding/1'].includes(location.hash)
      || document.activeElement?.matches?.('input,textarea');
    await load(); if (!busy()) route();
    Promise.all([refreshText(), refreshPages()]).then(([a, b]) => { if ((a || b) && !busy()) route(); });
    onAuth((user) => { if (!!user !== demo.signedIn) load().then(() => { if (!busy()) route(); }); });
    startPwa();
  })();

  return { refresh: route, view };
}
