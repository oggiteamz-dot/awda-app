-- =============================================================================
-- 20260928080000_three_doors.sql
-- عَوْدة — three separate doors (users · scholars · admins) on ONE database.
--
-- The doors are separate apps on separate addresses. That keeps the staff
-- screens out of the public bundle, but it is NOT the lock. The lock is here:
-- every staff action below checks the caller's role in the database, so a
-- person who somehow found the scholar or admin address still cannot do
-- anything with it.
--
-- WHAT THIS ADDS
--   1  column-level grants on content_string: a scholar edits the DRAFT only.
--      Before this, the row policy let a writer UPDATE published_value and
--      status directly — i.e. publish their own text without approval.
--   2  profile           — name, calc inputs, pace. Owner-only.
--   3  prayer_day        — today's five, and the dot grid. Owner-only.
--   4  role_invite + claim_invites()  — invite a scholar by email before they
--      have an account; the role lands the first time they sign in.
--   5  my_roles()        — which doors this person may open.
--   6  admin_people / admin_invite / admin_revoke — the admin console's people tab.
--   7  scholar_request   — "I need a new page / this needs changing", one queue.
--
-- Nothing here touches salah_users, review_feedback, module_requests or any
-- function the frozen old app calls (SPEC R-12).
-- =============================================================================


-- 1 ── a scholar may write the draft, never the published column ─────────────
revoke insert, update, delete, truncate on content_string from anon, authenticated;
revoke insert, update, delete, truncate on content_audit  from anon, authenticated;
grant select on content_string to anon, authenticated;
grant update (draft_value) on content_string to authenticated;
grant insert (key, namespace, kind, label, hint, draft_value) on content_string to authenticated;
-- A new row a scholar inserts is a draft, whatever they send (owner and admin publish).
create or replace function content_insert_is_draft() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_staff() then
    new.status := 'draft'; new.published_value := null;
    new.published_by := null; new.published_at := null;
  end if;
  return new;
end $$;
drop trigger if exists content_insert_is_draft_trg on content_string;
create trigger content_insert_is_draft_trg before insert on content_string
  for each row execute function content_insert_is_draft();
-- Editing a line that is waiting for approval pulls it back to draft, so the
-- owner never approves text that changed after it was submitted.
create or replace function content_edit_resets_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.draft_value is distinct from old.draft_value
     and old.status = 'in_review' and new.status = 'in_review' then
    new.status := 'draft';
  end if;
  return new;
end $$;
drop trigger if exists content_edit_resets_review_trg on content_string;
create trigger content_edit_resets_review_trg before update on content_string
  for each row execute function content_edit_resets_review();


-- 2 ── profile ───────────────────────────────────────────────────────────────
create table if not exists profile (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(display_name) <= 60),
  gender      text check (gender in ('m','f')),
  per_day     smallint not null default 3 check (per_day between 1 and 50),
  hijri_offset smallint not null default 0 check (hijri_offset between -2 and 2),
  calc        jsonb not null default '{}'::jsonb,     -- the inputs behind the qaḍāʾ number
  remind      text[] not null default '{}',
  onboarded_at timestamptz,
  updated_at  timestamptz not null default now(),
  constraint calc_small check (pg_column_size(calc) < 4000)
);
alter table profile enable row level security;
revoke all on profile from anon;
grant select, insert, update on profile to authenticated;
drop policy if exists profile_own on profile;
create policy profile_own on profile for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- 3 ── prayer_day ────────────────────────────────────────────────────────────
-- A row means "I prayed it". No row means nothing — not "missed", not a failure.
create table if not exists prayer_day (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  prayer  text not null check (prayer in ('fajr','dhuhr','asr','maghrib','isha')),
  at      timestamptz not null default now(),
  primary key (user_id, day, prayer)
);
alter table prayer_day enable row level security;
revoke all on prayer_day from anon;
grant select, insert, delete on prayer_day to authenticated;
drop policy if exists prayer_day_own on prayer_day;
create policy prayer_day_own on prayer_day for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());


-- 4 ── invites ───────────────────────────────────────────────────────────────
create table if not exists role_invite (
  id         uuid primary key default gen_random_uuid(),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role       app_role not null,
  note       text,
  invited_by uuid references auth.users(id),
  invited_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  revoked_at timestamptz
);
create unique index if not exists role_invite_open_uq
  on role_invite (lower(email), role) where claimed_at is null and revoked_at is null;
alter table role_invite enable row level security;
revoke all on role_invite from anon, authenticated;
grant select on role_invite to authenticated;
drop policy if exists invite_read_staff on role_invite;
create policy invite_read_staff on role_invite for select to authenticated using (is_staff());

create or replace function claim_invites() returns app_role[]
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or v_email = '' then return '{}'; end if;
  -- only a CONFIRMED address may claim: otherwise typing someone else's email
  -- into a sign-up would steal their invite
  if not exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null) then
    return (select coalesce(array_agg(role), '{}') from user_roles where user_id = auth.uid());
  end if;
  insert into user_roles (user_id, role, granted_by)
    select auth.uid(), i.role, i.invited_by from role_invite i
    where lower(i.email) = v_email and i.claimed_at is null and i.revoked_at is null
  on conflict do nothing;
  update role_invite set claimed_by = auth.uid(), claimed_at = now()
    where lower(email) = v_email and claimed_at is null and revoked_at is null;
  return (select coalesce(array_agg(role), '{}') from user_roles where user_id = auth.uid());
end $$;


-- 5 ── my_roles ──────────────────────────────────────────────────────────────
create or replace function my_roles() returns app_role[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(role), '{}') from user_roles where user_id = auth.uid();
$$;


-- 6 ── the admin console's people tab ────────────────────────────────────────
create or replace function admin_people()
returns table (user_id uuid, email text, joined timestamptz, last_seen timestamptz,
               roles app_role[], onboarded boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at,
           coalesce((select array_agg(r.role) from user_roles r where r.user_id = u.id), '{}'),
           exists (select 1 from profile p where p.user_id = u.id and p.onboarded_at is not null)
    from auth.users u order by u.created_at desc limit 500;
end $$;

create or replace function admin_invite(p_email text, p_role app_role, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_email text := lower(trim(p_email));
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role in ('owner','admin') and not has_role('owner') then
    raise exception 'Only the owner can grant % access', p_role;
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That is not an email address'; end if;
  select id into v_uid from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_uid is not null then
    insert into user_roles (user_id, role, granted_by) values (v_uid, p_role, auth.uid())
      on conflict do nothing;
    return 'granted';
  end if;
  insert into role_invite (email, role, note, invited_by) values (v_email, p_role, p_note, auth.uid())
    on conflict do nothing;
  return 'invited';
end $$;

create or replace function admin_revoke(p_user uuid, p_role app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role in ('owner','admin') and not has_role('owner') then
    raise exception 'Only the owner can remove % access', p_role;
  end if;
  if p_role = 'owner' and (select count(*) from user_roles where role = 'owner') <= 1 then
    raise exception 'This is the last owner. Add another owner first.';
  end if;
  delete from user_roles where user_id = p_user and role = p_role;
end $$;

create or replace function admin_cancel_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  update role_invite set revoked_at = now() where id = p_id and claimed_at is null;
end $$;


-- 7 ── scholar_request: one queue for "a new page" and "this needs changing" ──
create table if not exists scholar_request (
  id         uuid primary key default gen_random_uuid(),
  author     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_label text,
  kind       text not null check (kind in ('new_page','change','question')),
  title      text not null check (length(title) between 2 and 200),
  body       text check (body is null or length(body) <= 20000),
  target_key text,
  status     text not null default 'new' check (status in ('new','building','done','declined')),
  answer     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table scholar_request enable row level security;
revoke all on scholar_request from anon, authenticated;
grant select, insert on scholar_request to authenticated;
grant update (status, answer, updated_at) on scholar_request to authenticated;
drop policy if exists sreq_read on scholar_request;
create policy sreq_read on scholar_request for select to authenticated
  using (author = auth.uid() or is_staff());
drop policy if exists sreq_insert on scholar_request;
create policy sreq_insert on scholar_request for insert to authenticated
  with check (author = auth.uid() and (has_role('writer') or has_role('qc') or is_staff()));
drop policy if exists sreq_update_staff on scholar_request;
create policy sreq_update_staff on scholar_request for update to authenticated
  using (is_staff()) with check (is_staff());
create or replace function sreq_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author_label := (select email from auth.users where id = new.author);
    new.status := 'new'; new.answer := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists sreq_stamp_trg on scholar_request;
create trigger sreq_stamp_trg before insert or update on scholar_request
  for each row execute function sreq_stamp();


-- ── grants on the new functions: signed-in only, never anon ─────────────────
revoke execute on function claim_invites(), my_roles(), admin_people(),
  admin_invite(text, app_role, text), admin_revoke(uuid, app_role),
  admin_cancel_invite(uuid) from public, anon;
grant execute on function claim_invites(), my_roles(), admin_people(),
  admin_invite(text, app_role, text), admin_revoke(uuid, app_role),
  admin_cancel_invite(uuid) to authenticated;
revoke execute on function content_insert_is_draft(), content_edit_resets_review(), sreq_stamp()
  from public, anon, authenticated;
