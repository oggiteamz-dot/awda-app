/**
 * staff/admin-api.js — calls only the admin console makes.
 *
 * ⛔ ADMIN CODE — imported by console-main.js and nothing else, so neither the
 * user app nor the scholars' desk carries these names. Every one of them is
 * refused by the database for anyone who is not an owner or admin.
 */
import { sb, must } from '../core/cloud.js';

/* ── rewriting any line in place ───────────────────────────────────────── */
export async function setText(key, value, original, where) {
  must(await sb.rpc('ui_set_text', { p_key: key, p_value: value, p_original: original || null, p_where: where || null }));
}
export async function resetText(key) { must(await sb.rpc('ui_reset_text', { p_key: key })); }
export async function textRow(key) {
  return must(await sb.from('content_string').select('key,label,hint,published_value,status,updated_at').eq('key', key).maybeSingle());
}
export async function textHistory(key) {
  const r = await sb.from('content_audit').select('action,actor_label,old_value,new_value,at')
    .eq('key', key).order('at', { ascending: false }).limit(25);
  return r.error ? [] : r.data;
}

/* ── pages ─────────────────────────────────────────────────────────────── */
export async function setPageStatus(id, status, review_note = null) {
  const row = { status }; if (status === 'returned') row.review_note = review_note;
  return must(await sb.from('page').update(row).eq('id', id).select('*').single());
}

/* ── people and errors ─────────────────────────────────────────────────── */
export async function people() { return must(await sb.rpc('admin_people')) || []; }
export async function invites() {
  return must(await sb.from('role_invite').select('*').is('claimed_at', null).is('revoked_at', null).order('invited_at', { ascending: false }));
}
export async function invite(email, role, note) {
  return must(await sb.rpc('admin_invite', { p_email: email, p_role: role, p_note: note || null }));
}
export async function revoke(userId, role) { must(await sb.rpc('admin_revoke', { p_user: userId, p_role: role })); }
export async function cancelInvite(id) { must(await sb.rpc('admin_cancel_invite', { p_id: id })); }
export async function errors() {
  return must(await sb.from('app_error').select('*').order('at', { ascending: false }).limit(100));
}

/* ── approvals ─────────────────────────────────────────────────────────── */
export async function approveProposal(id) { return must(await sb.rpc('approve_page_proposal', { p_id: id, p_publish: true })); }
export async function returnProposal(id, why) { must(await sb.rpc('return_page_proposal', { p_id: id, p_reason: why })); }

/* ── requests: step one (decide), the build, and sending it back ───────── */
export async function decide(id, ok, note) { must(await sb.rpc('request_decide', { p_id: id, p_approve: ok, p_note: note || null })); }
export async function startRequest(id) { must(await sb.rpc('request_start', { p_id: id })); }
export async function deliver(id, note, page, route) {
  must(await sb.rpc('request_deliver', { p_id: id, p_note: note, p_page: page || null, p_route: route || null }));
}
export async function removeRequest(id) { must(await sb.from('work_request').delete().eq('id', id)); }
