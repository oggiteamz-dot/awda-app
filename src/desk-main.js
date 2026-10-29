/**
 * desk-main.js — مكتب العالِم, the scholars' door. ⛔ STAFF — its own private address.
 *
 * A scholar signs in and sees the real app, exactly as a person sees it, with a
 * staff bar on top: leave notes (typed, suggested wording, voice, drawing) on
 * any line, propose new wording or page edits, write new pages, and file
 * requests. Nothing is live until an admin approves it; what is made from a
 * request comes back to the scholar for the final approval.
 * No admin code is in this bundle.
 */
import { gate } from './staff/gate.js';
import { startApp } from './core/shell.js';
import { startLayer } from './staff/layer.js';
import { notesRoutes } from './staff/notes.js';
import { pageRoutes } from './staff/pages.js';
import { requestRoutes } from './staff/requests.js';

const who = await gate({
  allow: ['writer', 'qc'],
  copy: { kicker: 'مكتب العالِم', sub: 'بالدعوة فقط. ترى التطبيق كما يراه الناس، وتقترح وتكتب وتطلب. لا يُنشر شيء قبل موافقة المدير.' },
});
const layer = startLayer({ who });
startApp({
  extraRoutes: { ...notesRoutes(layer), ...pageRoutes({ who }), ...requestRoutes({ who }) },
  after: (hash) => layer.after(hash),
});
