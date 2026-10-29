/**
 * staff/api.js — the backend calls every staff door makes (scholar and admin).
 *
 * ⛔ STAFF CODE — never copied into the user app. Admin-only calls live in a
 * separate file that only the admin console imports. None of this is a lock:
 * the database checks the role on every call.
 */
import { sb, must } from '../core/cloud.js';

/* ── who is signing in ─────────────────────────────────────────────────── */
/** Roles, after claiming any invite waiting for this address. */
export async function myRoles() {
  const claimed = await sb.rpc('claim_invites');
  if (!claimed.error) return claimed.data || [];
  return must(await sb.rpc('my_roles')) || [];
}
export const mayEnter = (roles, allow) => roles.some((r) => allow.includes(r));

/** A staff username (e.g. SAMER) is an address in a domain that cannot receive mail. */
export const staffEmail = (id) => (id.includes('@') ? id : `${id}@staff.invalid`).trim().toLowerCase();
export async function signInPassword(id, password) {
  return must(await sb.auth.signInWithPassword({ email: staffEmail(id), password })).user;
}

/* ── notes on the app: text, suggested wording, voice, drawing ─────────── */
const LIGHT = 'id,route,target_key,target_text,note,suggestion,has_drawing,has_audio,scroll_y,view_w,view_h,status,author,author_label,created_at,resolved_at';
export async function notes({ status = 'open', route } = {}) {
  let q = sb.from('annotation').select(LIGHT).order('created_at', { ascending: false }).limit(400);
  if (status) q = q.eq('status', status);
  if (route) q = q.eq('route', route);
  return must(await q);
}
export async function drawingsFor(route) {
  return must(await sb.from('annotation').select('id,drawing,scroll_y,view_w').eq('route', route)
    .eq('status', 'open').eq('has_drawing', true).limit(20));
}
export async function noteMedia(id, what) {
  return must(await sb.from('annotation').select(what).eq('id', id).single())[what];
}
export async function addNote(n) {
  return must(await sb.from('annotation').insert(n).select(LIGHT).single());
}
export async function setNoteStatus(id, status) { must(await sb.from('annotation').update({ status }).eq('id', id)); }
export async function deleteNote(id) { must(await sb.from('annotation').delete().eq('id', id)); }

/* ── pages ─────────────────────────────────────────────────────────────── */
const PAGE_LIST = 'id,slug,section,title,summary,status,review_note,author,author_label,updated_at,published_at';
export async function teamPages() {
  return must(await sb.from('page').select(PAGE_LIST).order('updated_at', { ascending: false }).limit(500));
}
export async function getPage(id) { return must(await sb.from('page').select('*').eq('id', id).maybeSingle()); }
/** Insert or update. A scholar's row comes back as draft or pending whatever was sent. */
export async function savePage(p) {
  const row = { section: p.section, title: p.title, summary: p.summary || null, blocks: p.blocks, status: p.status };
  if (p.review_note !== undefined) row.review_note = p.review_note;
  if (p.id) return must(await sb.from('page').update(row).eq('id', p.id).select('*').single());
  return must(await sb.from('page').insert(row).select('*').single());
}
export async function deletePage(id) { must(await sb.from('page').delete().eq('id', id)); }
export async function pageRevisions(id) {
  return must(await sb.from('page_revision').select('id,title,summary,blocks,status,actor_label,at')
    .eq('page_id', id).order('at', { ascending: false }).limit(30));
}

/* ── what is waiting for me: the badge on the bar ──────────────────────── */
export async function inbox() { const r = await sb.rpc('staff_inbox'); return r.error ? null : r.data; }

/* ── a proposed edit to an existing page (scholars; nothing live until approved) ── */
const PROP = 'id,page_id,author,author_label,title,summary,blocks,note,status,review_note,decided_at,created_at,updated_at';
export async function proposals({ status, page } = {}) {
  let q = sb.from('page_proposal').select(PROP).order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  if (page) q = q.eq('page_id', page);
  return must(await q);
}
export async function propose(p) {
  return must(await sb.from('page_proposal').insert({ page_id: p.page_id, title: p.title, summary: p.summary || null,
    blocks: p.blocks, note: p.note || null }).select(PROP).single());
}
export async function withdrawProposal(id) { must(await sb.from('page_proposal').update({ status: 'withdrawn' }).eq('id', id)); }

/* ── requests: a wall of text, a recording, "make this", "change this" ── */
const REQ = 'id,author,author_label,author_is_admin,kind,title,has_audio,route,page_id,status,decision_note,decided_at,result_note,result_page,result_route,delivered_at,signoff_note,signoff_at,created_at,updated_at';
export async function requests() {
  return must(await sb.from('work_request').select(REQ).order('updated_at', { ascending: false }).limit(300));
}
export async function getRequest(id) { return must(await sb.from('work_request').select(REQ + ',body').eq('id', id).maybeSingle()); }
export async function requestAudio(id) { return must(await sb.from('work_request').select('audio').eq('id', id).single()).audio; }
export async function fileRequest(r) {
  return must(await sb.from('work_request').insert({ kind: r.kind, title: r.title, body: r.body || null, audio: r.audio || null,
    route: r.route || null, page_id: r.page_id || null }).select(REQ).single());
}
export async function withdrawRequest(id) { must(await sb.from('work_request').update({ status: 'withdrawn' }).eq('id', id)); }
/** Step two: the person who asked approves what was made (publishing it), or asks for changes. */
export async function signoff(id, ok, note) { must(await sb.rpc('request_signoff', { p_id: id, p_ok: ok, p_note: note || null })); }
