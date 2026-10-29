/**
 * console-main.js — لوحة الإدارة, the admins' door. ⛔ STAFF — its own private address.
 *
 * An admin signs in and sees the real app with a staff bar on top: rewrite any
 * text in place (live for everyone), write and publish pages, approve or return
 * everything scholars send (الموافقات), decide and deliver requests (الطلبات),
 * leave and resolve notes, manage people, see errors.
 */
import { gate } from './staff/gate.js';
import { startApp } from './core/shell.js';
import { startLayer } from './staff/layer.js';
import { notesRoutes } from './staff/notes.js';
import { pageRoutes } from './staff/pages.js';
import { adminTools } from './staff/admin.js';
import { requestRoutes } from './staff/requests.js';
import { requestAdmin } from './staff/admin-requests.js';
import { approvalsRoutes } from './staff/approvals.js';

const who = await gate({
  allow: ['owner', 'admin'],
  copy: { kicker: 'لوحة الإدارة', sub: 'للمالك والمديرين.' },
});
let app = null;
const tools = adminTools({ who, refresh: () => app?.refresh() });
const layer = startLayer({ who, admin: tools });
app = startApp({
  extraRoutes: {
    ...notesRoutes(layer), ...pageRoutes({ who, tools }), ...tools.routes,
    ...requestRoutes({ who, admin: requestAdmin() }), ...approvalsRoutes({ tools, layer }),
  },
  after: (hash) => layer.after(hash),
});
