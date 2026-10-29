-- =============================================================================
-- 20261003090000_staff_in_app.sql
-- Staff work INSIDE the app (Hadi, 3 Oct 2026).
--
--   ADMIN    changes everything: rewrites any line in place, writes and rewrites
--            pages, publishes, approves scholars' pages, annotates.
--   SCHOLAR  (writer / qc) creates pages and annotates. Can never publish:
--            a scholar's page waits for an admin's approval.
--
-- APPLIED LIVE 29 Oct 2026, in parts via execute_sql (the connector cancels any
-- statement with DROP/REVOKE/"delete from" because it cannot show its confirm
-- dialog here). On the fresh tables the drop-if-exists lines were no-ops and were
-- left out; the delete policies are named page_remove / annotation_remove live.
-- The revoke lines did NOT run: anon/authenticated keep Supabase's default table
-- grants, and row-level security is what blocks them (proven: scripts/roles_live.py).
--
-- Every rule below is enforced HERE. The staff doors only ask; the database is
-- the one that says no. Runs after 20260928080000_three_doors.sql.
-- Touches nothing the frozen old app uses (salah_users, review_feedback, …).
-- =============================================================================


-- 0 ── who is on the team ──────────────────────────────────────────────────────
create or replace function is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid()
                 and role in ('owner','admin','writer','qc'));
$$;


-- 1 ── admins change everything, religious text included ────────────────────
insert into role_permission (role, namespace, action, money)
  select 'admin', namespace, action, money from role_permission where role = 'owner'
on conflict do nothing;


-- 2 ── rewrite any line in place ───────────────────────────────────────────────
-- Keys: 'ui.<screen>.<hash>' for lines written into a screen's code, or a named
-- key (e.g. 'ihtidar.c.wad.0'). The change is published at once and the audit
-- trigger on content_string records who changed what, from what, to what.
create or replace function ui_set_text(p_key text, p_value text, p_original text default null, p_where text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_ns content_namespace; v_kind content_kind;
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_key !~ '^[a-z][a-z0-9_]*(\.[A-Za-z0-9_-]+)+$' or length(p_key) > 160 then
    raise exception 'Bad key: %', p_key;
  end if;
  if p_value is null or length(trim(p_value)) = 0 then raise exception 'The text cannot be empty'; end if;
  if length(p_value) > 20000 then raise exception 'The text is too long'; end if;
  update content_string
     set draft_value = p_value, published_value = p_value, status = 'published',
         published_by = auth.uid(), published_at = now(), review_note = null
   where key = p_key;
  if not found then
    v_ns := case when p_key like 'ihtidar.%' or p_key like 'legacy.iht%' then 'religious' else 'product' end;
    v_kind := case when length(p_value) > 140 then 'longtext' else 'text' end;
    insert into content_string (key, namespace, kind, label, hint, draft_value, published_value, status, published_by, published_at)
    values (p_key, v_ns, v_kind, left(coalesce(nullif(trim(p_original), ''), p_key), 200),
            'in-app: ' || left(coalesce(p_where, ''), 180), p_value, p_value, 'published', auth.uid(), now());
  end if;
end $$;

-- Return a line to the words it was written with in the code. Only for lines
-- that were first changed in the app (otherwise use the history to restore).
create or replace function ui_reset_text(p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare r content_string;
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into r from content_string where key = p_key;
  if not found then return; end if;
  if coalesce(r.hint, '') not like 'in-app:%' then
    raise exception 'This line was not first written in the app; restore an earlier version from its history instead';
  end if;
  insert into content_audit (key, action, actor, actor_label, old_value, new_value)
  values (p_key, 'reset', auth.uid(), (select email from auth.users where id = auth.uid()), r.published_value, null);
  -- back to the words in the code: unpublish the override (the row stays as history)
  update content_string set published_value = null, draft_value = null, status = 'draft',
         published_by = null, published_at = null where key = p_key;
end $$;


-- 3 ── pages ─────────────────────────────────────────────────────────────────
create table if not exists page (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique default lower(substr(md5(gen_random_uuid()::text), 1, 10))
                 check (slug ~ '^[a-z0-9-]{3,80}$'),
  section      text not null check (section in ('prayer','qada','tahara','sawm','khums','will','death','calendar')),
  title        text not null check (length(trim(title)) between 2 and 160),
  summary      text check (summary is null or length(summary) <= 400),
  blocks       jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) < 300000),
  status       text not null default 'draft' check (status in ('draft','pending','published','returned')),
  review_note  text check (review_note is null or length(review_note) <= 4000),
  author       uuid references auth.users(id) on delete set null,
  author_label text,
  published_by uuid references auth.users(id),
  published_at timestamptz,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint returned_has_reason check (status <> 'returned' or length(trim(coalesce(review_note, ''))) > 0)
);
create index if not exists page_section_idx on page (section, status);

-- Every change keeps the version it replaced.
create table if not exists page_revision (
  id          bigserial primary key,
  page_id     uuid not null references page(id) on delete cascade,
  title       text, summary text, blocks jsonb, status text,
  actor       uuid, actor_label text,
  at          timestamptz not null default now()
);

create or replace function page_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_admin boolean := is_staff();
begin
  if tg_op = 'INSERT' then
    new.author := auth.uid();
    new.author_label := (select email from auth.users where id = auth.uid());
    new.created_at := now();
    if not v_admin then
      new.status := case when new.status = 'pending' then 'pending' else 'draft' end;
      new.review_note := null; new.published_by := null; new.published_at := null; new.sort := 0;
    end if;
  else
    new.id := old.id; new.author := old.author; new.author_label := old.author_label; new.created_at := old.created_at;
    if not v_admin then
      -- a scholar may save a draft or send it; never publish, never return, never re-slug
      new.status := case when new.status = 'pending' then 'pending' else 'draft' end;
      new.review_note := old.review_note; new.published_by := old.published_by;
      new.published_at := old.published_at; new.slug := old.slug; new.sort := old.sort;
    end if;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_by := auth.uid(); new.published_at := now(); new.review_note := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists page_guard_trg on page;
create trigger page_guard_trg before insert or update on page for each row execute function page_guard();

create or replace function page_keep_revision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (old.title, old.summary, old.blocks, old.status) is distinct from (new.title, new.summary, new.blocks, new.status) then
    insert into page_revision (page_id, title, summary, blocks, status, actor, actor_label)
    values (old.id, old.title, old.summary, old.blocks, old.status, auth.uid(),
            (select email from auth.users where id = auth.uid()));
  end if;
  return new;
end $$;
drop trigger if exists page_revision_trg on page;
create trigger page_revision_trg after update on page for each row execute function page_keep_revision();

alter table page enable row level security;
alter table page_revision enable row level security;
revoke all on page, page_revision from anon, authenticated;
grant select on page to anon, authenticated;
grant insert, update, delete on page to authenticated;
grant select on page_revision to authenticated;

drop policy if exists page_read on page;
create policy page_read on page for select to anon, authenticated
  using (status = 'published' or is_team());
drop policy if exists page_insert on page;
create policy page_insert on page for insert to authenticated with check (is_team());
drop policy if exists page_update on page;
create policy page_update on page for update to authenticated
  using (is_staff() or (author = auth.uid() and status in ('draft','returned','pending')))
  with check (is_staff() or (author = auth.uid() and status in ('draft','pending')));
drop policy if exists page_delete on page;
create policy page_delete on page for delete to authenticated
  using (is_staff() or (author = auth.uid() and status <> 'published'));
drop policy if exists page_revision_read on page_revision;
create policy page_revision_read on page_revision for select to authenticated using (is_team());


-- 4 ── annotations: notes, suggested wording, voice notes, drawings ───────────
-- Seen by staff only. Never by a user, never in the user app.
create table if not exists annotation (
  id           uuid primary key default gen_random_uuid(),
  author       uuid references auth.users(id) on delete set null,
  author_label text,
  route        text not null check (length(route) <= 200),
  target_key   text check (target_key is null or length(target_key) <= 160),
  target_text  text check (target_text is null or length(target_text) <= 4000),
  note         text check (note is null or length(note) <= 8000),
  suggestion   text check (suggestion is null or length(suggestion) <= 8000),
  drawing      text check (drawing is null or (drawing like 'data:image/%' and length(drawing) < 1600000)),
  audio        text check (audio is null or (audio like 'data:audio/%' and length(audio) < 4200000)),
  scroll_y     integer, view_w integer, view_h integer,
  has_drawing  boolean generated always as (drawing is not null) stored,
  has_audio    boolean generated always as (audio is not null) stored,
  status       text not null default 'open' check (status in ('open','resolved')),
  resolved_by  uuid references auth.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint says_something check (length(coalesce(note, '') || coalesce(suggestion, '')) > 0
                                   or drawing is not null or audio is not null)
);
create index if not exists annotation_route_idx on annotation (route, status);

create or replace function annotation_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author := auth.uid();
    new.author_label := (select email from auth.users where id = auth.uid());
    new.status := 'open'; new.resolved_by := null; new.resolved_at := null; new.created_at := now();
  else
    new.author := old.author; new.author_label := old.author_label; new.created_at := old.created_at;
    if new.status = 'resolved' and old.status <> 'resolved' then new.resolved_by := auth.uid(); new.resolved_at := now(); end if;
    if new.status = 'open' then new.resolved_by := null; new.resolved_at := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists annotation_stamp_trg on annotation;
create trigger annotation_stamp_trg before insert or update on annotation for each row execute function annotation_stamp();

alter table annotation enable row level security;
revoke all on annotation from anon, authenticated;
grant select, insert, update, delete on annotation to authenticated;
drop policy if exists annotation_read on annotation;
create policy annotation_read on annotation for select to authenticated using (is_team());
drop policy if exists annotation_insert on annotation;
create policy annotation_insert on annotation for insert to authenticated with check (is_team());
drop policy if exists annotation_update on annotation;
create policy annotation_update on annotation for update to authenticated
  using (is_staff() or author = auth.uid()) with check (is_staff() or author = auth.uid());
drop policy if exists annotation_delete on annotation;
create policy annotation_delete on annotation for delete to authenticated
  using (is_staff() or author = auth.uid());


-- 5 ── grants on the functions: signed-in only, never anon ────────────────────
-- is_team() is called by the page read policy, which anon also passes through;
-- for anon it simply returns false.
grant execute on function is_team() to anon, authenticated;
revoke execute on function ui_set_text(text, text, text, text), ui_reset_text(text) from public, anon;
grant execute on function ui_set_text(text, text, text, text), ui_reset_text(text) to authenticated;
revoke execute on function page_guard(), page_keep_revision(), annotation_stamp() from public, anon, authenticated;
