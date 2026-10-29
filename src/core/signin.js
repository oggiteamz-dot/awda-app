/**
 * signin.js — the sign-in screen, one per door.
 *
 * The same mechanism on every door (an email code), but each door passes in
 * its own words. This file names no door, so the user app's bundle contains no
 * trace that any other door exists.
 *
 * WHY EMAIL, NOT PHONE, TODAY. Phone sign-in is switched off on the database, and
 * Lebanon's A2P SMS is unreliable on both carriers. Email works now; phone lights
 * up when WhatsApp Business is wired. The code is typed INTO the app rather than
 * clicked in the mail, because on an iPhone a link in Mail opens Safari, not the
 * installed app — and the person ends up signed in to the wrong window.
 */
import { head, card, icon, animateIn, esc } from './ui.js';
import { sendCode, verifyCode, human } from './cloud.js';
import { setGround } from './theme.js';


/** `copy` is passed in by each door's entry, so this shared file never names another door. */
export function signIn(root, { onDone, email: preset = '', copy }) {
  setGround(null);
  const c = copy;
  let email = preset;
  const paint = (stage, note = '') => {
    root.innerHTML = `
    ${head({ kicker: c.kicker, title: c.title, sub: c.sub, back: !!c.back })}
    <div class="wrap lift stack" data-screen="signin">
      ${stage === 'email' ? card(`
        <label class="label" for="em">البريد الإلكترونيّ</label>
        <input class="input" id="em" type="email" inputmode="email" autocomplete="email" dir="ltr"
          placeholder="name@example.com" value="${esc(email)}" style="margin-top:8px">
        <button class="btn btn-block" data-send style="margin-top:14px">أرسل الرمز</button>`) : card(`
        <p class="hint">أرسلنا رمزاً إلى <b dir="ltr">${esc(email)}</b>. قد يصل خلال دقيقة، وتفقّد مجلّد الرسائل غير المرغوبة.</p>
        <label class="label" for="cd" style="display:block;margin-top:14px">الرمز</label>
        <input class="input" id="cd" inputmode="numeric" autocomplete="one-time-code" dir="ltr" maxlength="10"
          style="margin-top:8px;font-family:Mono,monospace;font-size:24px;letter-spacing:.3em;text-align:center">
        <button class="btn btn-block" data-verify style="margin-top:14px">دخول</button>
        <button class="btn btn-quiet btn-block" data-back-email style="margin-top:8px">بريد آخر</button>`)}
      ${note ? `<p class="hint" role="alert" data-note style="color:var(--ink)">${icon('info', 'ic-sm')} ${esc(note)}</p>` : ''}
    </div>`;
    animateIn(root);
    wire(stage);
  };
  const wire = (stage) => {
    if (stage === 'email') {
      const input = root.querySelector('#em');
      const go = async () => {
        email = input.value.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return paint('email', 'اكتب بريداً صحيحاً.');
        const b = root.querySelector('[data-send]'); b.disabled = true; b.textContent = 'يُرسَل…';
        try { await sendCode(email); paint('code'); }
        catch (err) { window.reportError?.(err, 'sending a sign-in code', 'SIGNIN_SEND_FAILED'); paint('email', human(err)); }
      };
      root.querySelector('[data-send]').onclick = go;
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      input.focus();
    } else {
      const input = root.querySelector('#cd');
      const go = async () => {
        const code = input.value.replace(/\D/g, '');
        if (code.length < 6) return paint('code', 'الرمز من ستّة أرقام على الأقلّ.');
        const b = root.querySelector('[data-verify]'); b.disabled = true; b.textContent = 'لحظة…';
        try { const user = await verifyCode(email, code); onDone?.(user); }
        catch (err) { paint('code', human(err)); }
      };
      root.querySelector('[data-verify]').onclick = go;
      input.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      root.querySelector('[data-back-email]').onclick = () => paint('email');
      input.focus();
    }
  };
  paint(preset ? 'code' : 'email');
}
