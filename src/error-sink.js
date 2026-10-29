/* =============================================================================
 * error-sink.js — nothing fails silently. Loaded FIRST, before any app code.
 * Adapted from the toolkit for Supabase: posts straight to the app_error table,
 * which the `error_insert_public_ok` policy allows anyone to write and only
 * staff to read.
 *
 * THE FAILURE THIS EXISTS TO PREVENT, in this product specifically:
 * a will fails to save, the person sees a spinner, and nobody ever finds out.
 * SPEC R-10. Anything touching a will is also pushed to Hadi's phone, which
 * happens server-side off the notification outbox — this file's job is only to
 * make sure the failure is RECORDED.
 *
 * Not a module on purpose: it must be running before the first import resolves,
 * so an error while loading the app is still caught.
 * ========================================================================== */
(function () {
  'use strict';

  var URL = 'https://upgfyvdnuniccgkwyacd.supabase.co/rest/v1/app_error';
  var KEY = 'sb_publishable_ByGZqRZFF4yNLl5V3HHeQQ_1bxrZBOs';

  var MAX_PER_MINUTE = 20;     // a render loop must not flood the table
  var sent = 0;
  setInterval(function () { sent = 0; }, 60000);

  /** Turn whatever went wrong into a stable UPPER_SNAKE code the inbox can group. */
  function deriveCode(err, ctx) {
    var s = (typeof ctx === 'string' ? ctx : '') || (err && err.message) || 'UNKNOWN';
    return s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48)
        || 'UNKNOWN_ERROR';
  }

  /**
   * Call this in EVERY catch block. The silent_catch gate fails the build on a
   * catch that does not.
   * @param {Error|string} err  what went wrong
   * @param {string|object} ctx what the person was doing — "saving the will" beats "error"
   * @param {string} code       optional stable code
   */
  window.reportError = function reportError(err, ctx, code) {
    try {
      if (sent++ > MAX_PER_MINUTE) return;
      var body = {
        code: code || deriveCode(err, ctx),
        message: (err && err.message) ? err.message : String(err),
        severity: 'error',
        url: location.href,
        user_agent: navigator.userAgent,
        context: {
          doing: typeof ctx === 'string' ? ctx : (ctx || {}),
          stack: (err && err.stack) ? String(err.stack).slice(0, 2000) : null,
          at: new Date().toISOString()
        }
      };
      // keepalive so the report survives the person navigating away mid-failure
      fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () { /* reporting must never itself throw — see below */ });
    } catch (e) {
      // Deliberately swallowed, and this is the ONE place that is correct.
      // An error reporter that can fail loudly turns one broken thing into two,
      // and the second one hides the first.
    }
  };

  window.addEventListener('error', function (e) {
    window.reportError(e.error || e.message, 'uncaught error on ' + location.hash, 'UNCAUGHT_ERROR');
  });

  window.addEventListener('unhandledrejection', function (e) {
    window.reportError(e.reason, 'unhandled promise on ' + location.hash, 'UNHANDLED_REJECTION');
  });
})();
