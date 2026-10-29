/**
 * staff/common.js — what the scholars' desk and the console share.
 *
 * ⛔ STAFF CODE. Nothing under src/staff/ is ever copied into the user app's
 * folder; scripts/gates.mjs fails the build if it is.
 */
import { esc, icon } from '../core/ui.js';
import { toAr } from '../core/num.js';

export const ROLE_AR = {
  owner: 'المالك', admin: 'مدير', qc: 'عالِم مراجِع', writer: 'عالِم', copywriter: 'كاتب', viewer: 'مُطّلع',
};
export const ROLE_SUB = {
  writer: 'يكتب صفحات جديدة ويترك ملاحظات. لا ينشر: صفحاته تنتظر موافقة المدير.',
  qc: 'يكتب صفحات جديدة ويترك ملاحظات. لا ينشر.',
  admin: 'يعدّل كلّ نصّ في التطبيق مباشرةً، ويكتب الصفحات وينشرها، ويوافق على صفحات العلماء.',
  owner: 'كلّ ما للمدير، ومنح صلاحيّة المدير.',
};
/* Each screen by the name a person knows it by. */
const SCREEN_AR = {
  home: 'الرئيسيّة', prayers: 'الصلاة', qada: 'القضاء', calendar: 'التقويم', knowledge: 'المعرفة',
  section: 'باب من المعرفة', page: 'صفحة من المعرفة', will: 'الوصيّة', messages: 'رسائل الوداع',
  ihtidar: 'الاحتضار', index: 'الأقسام', account: 'حسابي', onboarding: 'المعايرة', welcome: 'الترحيب',
  signin: 'الدخول', tabs: 'شريط التنقّل', history: 'التاريخ', stories: 'القصص', daily: 'العمل اليوميّ', staff: 'أدوات الفريق',
};
export const screenAr = (routeOrKey) => {
  const k = String(routeOrKey || '').replace(/^#\/?/, '').split(/[/.]/)[0] || 'home';
  return SCREEN_AR[k] || k;
};
export const PAGE_STATUS = {
  draft: ['مسوّدة', ''], pending: ['بانتظار الموافقة', 'tag-acc'], published: ['منشورة', ''], returned: ['أُعيدت', 'tag-warn'],
};
export const pageTag = (st) => { const [t, c] = PAGE_STATUS[st] || [st, '']; return `<span class="tag ${c}">${t}</span>`; };

/** A short message at the bottom of the screen that leaves by itself. */
export function toast(msg) {
  document.querySelector('.s-toast')?.remove();
  const el = document.createElement('div');
  el.className = 's-toast'; el.setAttribute('role', 'status'); el.dataset.staff = '';
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2600);
}

/** "منذ ٣ ساعات" — relative time, in Arabic, with Eastern numerals. */
export function ago(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${toAr(Math.round(s / 60))} دقيقة`;
  if (s < 86400) return `منذ ${toAr(Math.round(s / 3600))} ساعة`;
  if (s < 86400 * 30) return `منذ ${toAr(Math.round(s / 86400))} يوم`;
  return new Date(iso).toLocaleDateString('ar-LB');
}

/**
 * Word-level difference between the published line and the proposed one, so
 * the owner sees exactly which words changed instead of re-reading two blocks.
 * Removed words are struck through; added words are marked. No colour carries
 * meaning on its own (and no red, anywhere, by the design rule).
 */
export function diff(a = '', b = '') {
  const A = String(a || '').split(/(\s+)/), B = String(b || '').split(/(\s+)/);
  if (A.length * B.length > 400000) return `<del>${esc(a)}</del> <ins>${esc(b)}</ins>`;
  const L = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
    L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = '';
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { out += esc(A[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out += `<del>${esc(A[i])}</del>`; i++; }
    else { out += `<ins>${esc(B[j])}</ins>`; j++; }
  }
  while (i < A.length) out += `<del>${esc(A[i++])}</del>`;
  while (j < B.length) out += `<ins>${esc(B[j++])}</ins>`;
  return out;
}

/** A small inline notice under a form, replacing any previous one. */
export function note(root, msg, where = '[data-note-slot]') {
  const slot = root.querySelector(where); if (!slot) return;
  slot.innerHTML = msg ? `<p class="hint" role="status">${icon('info', 'ic-sm')} ${esc(msg)}</p>` : '';
}

/** Re-wire links after a staff screen redraws itself (the shell wires only its own renders). */
export function wireNav(root, go) {
  root.querySelectorAll('[data-go]').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); go(el.dataset.go); }; });
  root.querySelectorAll('[data-back]').forEach((el) => { el.onclick = () => history.back(); });
}
