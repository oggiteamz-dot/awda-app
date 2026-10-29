/**
 * staff/gate.js — the door before the app, on a staff address.
 *
 * ⛔ STAFF CODE — never copied into the user app.
 *
 * Sign in (username and password, or a code by email) → claim any invite
 * waiting for this address → read roles → refuse, or let the app start. The
 * refusal names no other door and hints at nothing. This gate is courtesy:
 * the database refuses every staff action from anyone without the role.
 */
import { apply, setGround } from '../core/theme.js';
import { me, signOut, human, sendCode, verifyCode } from '../core/cloud.js';
import { head, card, icon, animateIn, esc } from '../core/ui.js';
import { startPwa } from '../core/pwa.js';
import { myRoles, mayEnter, signInPassword } from './api.js';

/** Resolves with { user, roles } once someone allowed through this door is signed in. */
export function gate({ allow, copy }) {
  apply();
  startPwa();   // the sign-in screen itself must open with no signal
  const view = document.getElementById('view');
  document.getElementById('tabs').hidden = true;
  return new Promise((resolve) => {
    const check = async () => {
      const user = await me();
      if (!user) return signInScreen();
      let roles = [];
      try { roles = await myRoles(); }
      catch (err) { window.reportError?.(err, 'reading roles', 'ROLES_READ_FAILED'); return message(human(err)); }
      if (!mayEnter(roles, allow)) return refused(user.email);
      resolve({ user, roles });
    };

    function message(text) {
      view.innerHTML = `<div class="wrap" style="padding-top:80px">${card(`<p class="body">${esc(text)}</p>
        <button class="btn btn-block" data-retry style="margin-top:14px">أعد المحاولة</button>`)}</div>`;
      view.querySelector('[data-retry]').onclick = check;
    }

    function refused(email) {
      setGround(null);
      view.innerHTML = `
      ${head({ kicker: copy.kicker, title: 'لا يمكن الدخول بهذا الحساب' })}
      <div class="wrap lift stack" data-screen="refused">
        ${card(`<p class="body">الحساب <b dir="ltr">${esc(email || '')}</b> ليست له صلاحيّة هنا.</p>
          <p class="hint" style="margin-top:8px">إن كنتَ تنتظر دعوة، فاطلبها ممّن أرسل إليك هذا الرابط.</p>
          <button class="btn btn-ghost btn-block" data-out style="margin-top:14px">تسجيل الخروج</button>`)}
      </div>`;
      animateIn(view);
      view.querySelector('[data-out]').onclick = async () => { await signOut(); check(); };
    }

    function signInScreen(mode = 'password', note = '', email = '') {
      setGround(null);
      view.innerHTML = `
      ${head({ kicker: copy.kicker, title: 'الدخول', sub: copy.sub })}
      <div class="wrap lift stack" data-screen="signin">
        <div class="seg" role="tablist">
          <button role="tab" aria-selected="${mode === 'password'}" data-mode="password">اسم المستخدم</button>
          <button role="tab" aria-selected="${mode !== 'password'}" data-mode="email">رمز بالبريد</button>
        </div>
        ${mode === 'password' ? card(`
          <label class="label" for="uid">اسم المستخدم أو البريد</label>
          <input class="input" id="uid" dir="ltr" autocomplete="username" autocapitalize="characters" style="margin-top:8px" placeholder="SAMER">
          <label class="label" for="pw" style="display:block;margin-top:14px">كلمة المرور</label>
          <input class="input" id="pw" type="password" dir="ltr" autocomplete="current-password" style="margin-top:8px">
          <button class="btn btn-block" data-go-pw style="margin-top:16px">دخول</button>`)
        : mode === 'email' ? card(`
          <label class="label" for="em">البريد الإلكترونيّ</label>
          <input class="input" id="em" type="email" dir="ltr" autocomplete="email" style="margin-top:8px" value="${esc(email)}">
          <button class="btn btn-block" data-send style="margin-top:16px">أرسل الرمز</button>`)
        : card(`
          <p class="hint">أرسلنا رمزاً إلى <b dir="ltr">${esc(email)}</b>.</p>
          <label class="label" for="cd" style="display:block;margin-top:12px">الرمز</label>
          <input class="input" id="cd" inputmode="numeric" autocomplete="one-time-code" dir="ltr" maxlength="10"
            style="margin-top:8px;font-family:Mono,monospace;font-size:24px;letter-spacing:.3em;text-align:center">
          <button class="btn btn-block" data-verify style="margin-top:16px">دخول</button>`)}
        ${note ? `<p class="hint" role="alert">${icon('info', 'ic-sm')} ${esc(note)}</p>` : ''}
      </div>`;
      animateIn(view);
      view.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => signInScreen(b.dataset.mode));
      const enter = (sel, fn) => { const i = view.querySelector(sel); if (i) i.onkeydown = (e) => { if (e.key === 'Enter') fn(); }; };
      const busy = (btn, label) => { btn.disabled = true; btn.textContent = label; };
      if (mode === 'password') {
        const goPw = async () => {
          const id = view.querySelector('#uid').value.trim(), pw = view.querySelector('#pw').value;
          if (!id || !pw) return signInScreen('password', 'اكتب اسم المستخدم وكلمة المرور.');
          busy(view.querySelector('[data-go-pw]'), 'لحظة…');
          try { await signInPassword(id, pw); check(); }
          catch (err) { signInScreen('password', /invalid/i.test(err.message) ? 'اسم المستخدم أو كلمة المرور غير صحيحة.' : human(err)); }
        };
        view.querySelector('[data-go-pw]').onclick = goPw; enter('#pw', goPw);
        view.querySelector('#uid').focus();
      } else if (mode === 'email') {
        const send = async () => {
          const em = view.querySelector('#em').value.trim().toLowerCase();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return signInScreen('email', 'اكتب بريداً صحيحاً.', em);
          busy(view.querySelector('[data-send]'), 'يُرسَل…');
          try { await sendCode(em); signInScreen('code', '', em); }
          catch (err) { signInScreen('email', human(err), em); }
        };
        view.querySelector('[data-send]').onclick = send; enter('#em', send);
      } else {
        const ver = async () => {
          const code = view.querySelector('#cd').value.replace(/\D/g, '');
          busy(view.querySelector('[data-verify]'), 'لحظة…');
          try { await verifyCode(email, code); check(); }
          catch (err) { signInScreen('code', human(err), email); }
        };
        view.querySelector('[data-verify]').onclick = ver; enter('#cd', ver);
      }
    }

    check();
  });
}
