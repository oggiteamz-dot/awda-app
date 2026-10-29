/**
 * staff/recorder.js — record a voice note, or attach a recording.
 *
 * ⛔ STAFF CODE. Notes are short (3 minutes); requests can be long (a sheikh
 * reading a whole page aloud: up to 30 minutes, recorded at a low bitrate so it
 * still fits). The result is handed back as a data: URL.
 */
import { icon } from '../core/ui.js';
import { toAr } from '../core/num.js';

const LIMIT = { note: { secs: 180, bytes: 4000000 }, request: { secs: 1800, bytes: 15500000 } };

/** Wire the [data-rec] block inside root. done(dataUrl|null) is called on every change. */
export function recorder(root, done, kind = 'note') {
  const box = root.querySelector('[data-rec]'); if (!box) return;
  const btn = box.querySelector('[data-rec-btn]'), state = box.querySelector('[data-rec-state]');
  const file = box.querySelector('[data-rec-file]');
  const lim = LIMIT[kind] || LIMIT.note;
  const show = (url) => {
    done(url);
    state.innerHTML = url ? `<audio controls src="${url}" style="height:36px;max-width:220px"></audio>` : '';
  };
  const tooBig = () => { state.textContent = kind === 'note' ? 'التسجيل طويل جدّاً. سجّل أقصر.' : 'التسجيل أكبر من المسموح (نحو ٣٠ دقيقة). قسّمه إلى جزأين.'; done(null); };
  if (file) file.onchange = () => {
    const f = file.files?.[0]; if (!f) return;
    if (!/^audio\//.test(f.type)) { state.textContent = 'اختر ملفّاً صوتيّاً.'; return; }
    const fr = new FileReader();
    fr.onload = () => (fr.result.length > lim.bytes ? tooBig() : show(fr.result));
    fr.readAsDataURL(f);
  };
  if (!btn) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { btn.hidden = true; return; }
  let rec = null, chunks = [], timer = 0, tick = 0, t0 = 0;
  btn.onclick = async () => {
    if (rec?.state === 'recording') { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
      rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: kind === 'note' ? 32000 : 24000 } : undefined);
      chunks = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
      rec.onstop = () => {
        clearTimeout(timer); clearInterval(tick); stream.getTracks().forEach((t) => t.stop());
        const fr = new FileReader();
        fr.onload = () => {
          if (fr.result.length > lim.bytes) return tooBig();
          show(fr.result);
          btn.innerHTML = `${icon('mic', 'ic-sm')} أعد التسجيل`;
        };
        fr.readAsDataURL(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      rec.start(1000);
      t0 = Date.now();
      btn.innerHTML = `${icon('close', 'ic-sm')} أوقف التسجيل`;
      const clock = () => { const s = Math.round((Date.now() - t0) / 1000); state.textContent = `يُسجَّل… ${toAr(Math.floor(s / 60))}:${toAr(String(s % 60).padStart(2, '0'))}`; };
      clock(); tick = setInterval(clock, 1000);
      timer = setTimeout(() => rec.state === 'recording' && rec.stop(), lim.secs * 1000);
    } catch { state.textContent = 'لا إذن للميكروفون.'; }
  };
}

/** The markup the recorder wires. */
export const recBlock = (kind = 'note') => `<div class="srec" data-rec>
  <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
    <button class="btn btn-ghost btn-sm" data-rec-btn type="button">${icon('mic', 'ic-sm')} ${kind === 'note' ? 'سجّل ملاحظة صوتيّة' : 'سجّل صوتاً'}</button>
    ${kind === 'note' ? '' : `<label class="btn btn-quiet btn-sm" style="cursor:pointer">أرفق تسجيلاً<input type="file" accept="audio/*" data-rec-file hidden></label>`}
  </div>
  <div class="hint" data-rec-state style="margin-top:6px"></div></div>`;
