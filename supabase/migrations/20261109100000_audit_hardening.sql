-- 20261109100000_audit_hardening.sql — fixes from the 9 Nov 2026 audit (approved by Hadi in chat).
--
-- 1. The frozen old app's open door. salah_load / salah_save let ANYONE read or overwrite a
--    tester's row (including their will) knowing only "name|phone". The old app has saved
--    nothing since 9 Sep 2026. Closing it stops the old app; the 12 rows stay in salah_users.
-- 2. Monitoring views ran as their owner, so the public could read error messages,
--    notification recipients and job state past row-level security. Now they run as the caller.
-- 3. Staff functions were callable by signed-out visitors. They already refused inside, but they
--    should not be reachable at all. Trigger functions don't need EXECUTE for anyone.
--    NOT touched on purpose: has_role / is_staff / is_team / can_content — row-level policies that
--    anon evaluates (published pages, published text) call them, so anon must keep EXECUTE.
-- Undo any line with the matching GRANT.

begin;

-- 1 ─ old app
revoke execute on function public.salah_load(text) from public, anon, authenticated;
revoke execute on function public.salah_save(text, text, text, text, text, integer, boolean, jsonb) from public, anon, authenticated;

-- 2 ─ views run as the caller
alter view public.error_inbox               set (security_invoker = true);
alter view public.undelivered_notifications set (security_invoker = true);
alter view public.stale_jobs                set (security_invoker = true);
alter view public.content_published         set (security_invoker = true);

-- 3 ─ staff functions: signed-in only (each still checks the role inside)
do $$
declare f text;
begin
  foreach f in array array[
    'public.approve_page_proposal(uuid, boolean)',
    'public.return_page_proposal(uuid, text)',
    'public.request_decide(uuid, boolean, text)',
    'public.request_start(uuid)',
    'public.request_deliver(uuid, text, uuid, text)',
    'public.request_signoff(uuid, boolean, text)',
    'public.staff_inbox()',
    'public.ui_set_text(text, text, text, text)',
    'public.ui_reset_text(text)',
    'public.publish_content(text)',
    'public.submit_content(text)',
    'public.reject_content(text, text)',
    'public.my_permissions()',
    'public.my_top_role()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- trigger functions and the heartbeat writer: nobody calls these over the API
  foreach f in array array[
    'public.annotation_stamp()', 'public.page_guard()', 'public.page_keep_revision()',
    'public.page_proposal_guard()', 'public.work_request_guard()', 'public.log_content_change()',
    'public.beat(text, boolean, text, interval)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

commit;
