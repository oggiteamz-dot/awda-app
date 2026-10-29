-- =============================================================================
-- 20261029040000_approvals_and_requests.sql
-- Nothing goes live without an admin (Hadi, 29 Oct 2026).
--
--   SCHOLAR  creates pages, proposes edits to ANY page (published ones too),
--            suggests wording on any line, annotates, and files requests
--            (a wall of text, an audio recording, "change this", "make this").
--            None of it is live until an admin approves.
--   ADMIN    approves or returns all of the above in one Approvals tab,
--            rewrites text and pages directly, and files requests of their own.
--
--   REQUEST LIFECYCLE — two approvals:
--     new ──admin approves──▶ approved ──build starts──▶ building
--         ──built, sent back──▶ review ──requester signs off──▶ done (result published)
--                                     └─asks for changes──▶ changes ─▶ building …
--     new ──admin declines (reason)──▶ declined
--   An admin's own request starts at 'approved'.
--
-- Written without DROP / REVOKE / DELETE statements: every object here is new.
-- =============================================================================

-- 0 ── page_guard learns one trusted path: a requester's final sign-off ─────
-- request_signoff() sets awda.trusted for its own transaction only, so the page
-- it built can be published by the scholar's approval. Nothing a client sends
-- can set it: the setting is local to that function's transaction.
create or replace function page_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_admin boolean := is_staff() or coalesce(current_setting('awda.trusted', true), '') = 'on';
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


-- 1 ── a scholar's proposed edit to an existing page ─────────────────────────
create table if not exists page_proposal (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references page(id) on delete cascade,
  author       uuid references auth.users(id) on delete set null,
  author_label text,
  title        text not null check (length(trim(title)) between 2 and 160),
  summary      text check (summary is null or length(summary) <= 400),
  blocks       jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(blocks) = 'array' and pg_column_size(blocks) < 300000),
  note         text check (note is null or length(note) <= 4000),
  status       text not null default 'pending' check (status in ('pending','approved','returned','withdrawn')),
  review_note  text check (review_note is null or length(review_note) <= 4000),
  decided_by   uuid references auth.users(id),
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint proposal_returned_has_reason check (status <> 'returned' or length(trim(coalesce(review_note, ''))) > 0)
);
create index if not exists page_proposal_status_idx on page_proposal (status, created_at desc);

create or replace function page_proposal_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.author := auth.uid();
    new.author_label := (select email from auth.users where id = auth.uid());
    new.status := 'pending'; new.review_note := null; new.decided_by := null; new.decided_at := null;
    new.created_at := now();
  else
    new.id := old.id; new.page_id := old.page_id; new.author := old.author;
    new.author_label := old.author_label; new.created_at := old.created_at;
    if not is_staff() then
      -- the author may revise a pending proposal or withdraw it; never decide it
      new.status := case when new.status = 'withdrawn' then 'withdrawn' else 'pending' end;
      new.review_note := old.review_note; new.decided_by := old.decided_by; new.decided_at := old.decided_at;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger page_proposal_guard_trg before insert or update on page_proposal
  for each row execute function page_proposal_guard();

alter table page_proposal enable row level security;
create policy page_proposal_read on page_proposal for select to authenticated using (is_team());
create policy page_proposal_insert on page_proposal for insert to authenticated with check (is_team());
create policy page_proposal_update on page_proposal for update to authenticated
  using (is_staff() or (author = auth.uid() and status in ('pending','returned')))
  with check (is_staff() or author = auth.uid());

-- approve: the proposal's words become the page (history kept by page_revision_trg)
create or replace function approve_page_proposal(p_id uuid, p_publish boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare pr page_proposal;
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into pr from page_proposal where id = p_id for update;
  if not found then raise exception 'No such proposal'; end if;
  if pr.status <> 'pending' then raise exception 'This proposal was already decided'; end if;
  update page set title = pr.title, summary = pr.summary, blocks = pr.blocks,
         status = case when p_publish then 'published' else status end
   where id = pr.page_id;
  update page_proposal set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = p_id;
  return pr.page_id;
end $$;

create or replace function return_page_proposal(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Write the reason for returning it'; end if;
  update page_proposal set status = 'returned', review_note = p_reason, decided_by = auth.uid(), decided_at = now()
   where id = p_id and status = 'pending';
  if not found then raise exception 'This proposal was already decided'; end if;
end $$;


-- 2 ── requests: "make this", "change this", a wall of text, a recording ─────
create table if not exists work_request (
  id            uuid primary key default gen_random_uuid(),
  author        uuid references auth.users(id) on delete set null,
  author_label  text,
  author_is_admin boolean not null default false,
  kind          text not null default 'new_page'
                  check (kind in ('new_page','change','media','question','other')),
  title         text not null check (length(trim(title)) between 2 and 200),
  body          text check (body is null or length(body) <= 100000),
  audio         text check (audio is null or (audio like 'data:audio/%' and length(audio) < 16000000)),
  has_audio     boolean generated always as (audio is not null) stored,
  route         text check (route is null or length(route) <= 200),
  page_id       uuid references page(id) on delete set null,
  status        text not null default 'new'
                  check (status in ('new','approved','building','review','changes','done','declined','withdrawn')),
  decision_note text check (decision_note is null or length(decision_note) <= 4000),
  decided_by    uuid references auth.users(id),
  decided_at    timestamptz,
  result_note   text check (result_note is null or length(result_note) <= 8000),
  result_page   uuid references page(id) on delete set null,
  result_route  text check (result_route is null or length(result_route) <= 300),
  delivered_at  timestamptz,
  signoff_note  text check (signoff_note is null or length(signoff_note) <= 8000),
  signoff_by    uuid references auth.users(id),
  signoff_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint declined_has_reason check (status <> 'declined' or length(trim(coalesce(decision_note, ''))) > 0),
  constraint says_what check (length(coalesce(body, '')) > 0 or audio is not null or length(trim(title)) > 0)
);
create index if not exists work_request_status_idx on work_request (status, created_at desc);

create or replace function work_request_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_admin boolean := is_staff();
        v_trusted boolean := coalesce(current_setting('awda.trusted', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.author := auth.uid();
    new.author_label := (select email from auth.users where id = auth.uid());
    new.author_is_admin := v_admin;
    -- an admin's own request needs no first approval
    new.status := case when v_admin then 'approved' else 'new' end;
    new.decided_by := case when v_admin then auth.uid() end;
    new.decided_at := case when v_admin then now() end;
    new.decision_note := null; new.result_note := null; new.result_page := null; new.result_route := null;
    new.delivered_at := null; new.signoff_note := null; new.signoff_by := null; new.signoff_at := null;
    new.created_at := now();
  else
    new.id := old.id; new.author := old.author; new.author_label := old.author_label;
    new.author_is_admin := old.author_is_admin; new.created_at := old.created_at;
    if not (v_admin or v_trusted) then
      -- a scholar may only reword their request while it is new, or withdraw it.
      -- Deciding, delivering and signing off go through the functions below.
      new.status := case when new.status = 'withdrawn' and old.status in ('new','approved') then 'withdrawn' else old.status end;
      new.decision_note := old.decision_note; new.decided_by := old.decided_by; new.decided_at := old.decided_at;
      new.result_note := old.result_note; new.result_page := old.result_page; new.result_route := old.result_route;
      new.delivered_at := old.delivered_at; new.signoff_note := old.signoff_note;
      new.signoff_by := old.signoff_by; new.signoff_at := old.signoff_at;
      if old.status <> 'new' then
        new.title := old.title; new.body := old.body; new.audio := old.audio; new.kind := old.kind;
        new.route := old.route; new.page_id := old.page_id;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger work_request_guard_trg before insert or update on work_request
  for each row execute function work_request_guard();

alter table work_request enable row level security;
create policy work_request_read on work_request for select to authenticated using (is_team());
create policy work_request_insert on work_request for insert to authenticated with check (is_team());
create policy work_request_update on work_request for update to authenticated
  using (is_staff() or author = auth.uid()) with check (is_staff() or author = auth.uid());
create policy work_request_remove on work_request for delete to authenticated using (is_staff());

-- step 1: an admin approves or declines a scholar's request
create or replace function request_decide(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Write the reason for declining it'; end if;
  update work_request
     set status = case when p_approve then 'approved' else 'declined' end,
         decision_note = nullif(trim(coalesce(p_note, '')), ''), decided_by = auth.uid(), decided_at = now()
   where id = p_id and status = 'new';
  if not found then raise exception 'This request was already decided'; end if;
end $$;

-- the build has started (set by an admin, or by Claude working for one)
create or replace function request_start(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  update work_request set status = 'building' where id = p_id and status in ('approved','changes');
  if not found then raise exception 'This request is not waiting to be built'; end if;
end $$;

-- the thing is made: send it back to the requester for the final approval
create or replace function request_deliver(p_id uuid, p_note text, p_page uuid default null, p_route text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed' using errcode = '42501'; end if;
  update work_request
     set status = 'review', result_note = p_note, result_page = coalesce(p_page, result_page),
         result_route = coalesce(nullif(trim(coalesce(p_route, '')), ''), result_route),
         delivered_at = now(), signoff_note = null, signoff_by = null, signoff_at = null
   where id = p_id and status in ('approved','building','changes');
  if not found then raise exception 'This request is not being built'; end if;
end $$;

-- step 2: the requester (or an admin for them) approves what was made, or asks for changes.
-- Approving publishes the page that was built for it.
create or replace function request_signoff(p_id uuid, p_ok boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r work_request;
begin
  select * into r from work_request where id = p_id for update;
  if not found then raise exception 'No such request'; end if;
  if not (is_staff() or r.author = auth.uid()) then raise exception 'not allowed' using errcode = '42501'; end if;
  if r.status <> 'review' then raise exception 'Nothing is waiting for your approval on this request'; end if;
  if not p_ok and length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Write what needs to change'; end if;
  -- the checks above are the gate; the writes below run as trusted for this transaction only
  perform set_config('awda.trusted', 'on', true);
  update work_request
     set status = case when p_ok then 'done' else 'changes' end,
         signoff_note = nullif(trim(coalesce(p_note, '')), ''), signoff_by = auth.uid(), signoff_at = now()
   where id = p_id;
  if p_ok and r.result_page is not null then
    update page set status = 'published', published_by = auth.uid(), published_at = now(), review_note = null
     where id = r.result_page and status <> 'published';
  end if;
  perform set_config('awda.trusted', '', true);
end $$;


-- 3 ── what is waiting for me: the badge on the staff bar ────────────────────
create or replace function staff_inbox()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_admin boolean := is_staff(); v jsonb;
begin
  if not is_team() then raise exception 'not allowed' using errcode = '42501'; end if;
  if v_admin then
    v := jsonb_build_object(
      'pages',      (select count(*) from page where status = 'pending'),
      'proposals',  (select count(*) from page_proposal where status = 'pending'),
      'wording',    (select count(*) from annotation where status = 'open' and suggestion is not null),
      'notes',      (select count(*) from annotation where status = 'open' and suggestion is null),
      'requests',   (select count(*) from work_request where status = 'new'),
      'to_build',   (select count(*) from work_request where status in ('approved','changes')),
      'signoff',    (select count(*) from work_request where status = 'review' and author = auth.uid()));
  else
    v := jsonb_build_object(
      'signoff',    (select count(*) from work_request where status = 'review' and author = auth.uid()),
      'returned',   (select count(*) from page where status = 'returned' and author = auth.uid())
                  + (select count(*) from page_proposal where status = 'returned' and author = auth.uid()),
      'declined',   (select count(*) from work_request where status = 'declined' and author = auth.uid()
                       and decided_at > now() - interval '14 days'));
  end if;
  return v || jsonb_build_object('total',
    (select coalesce(sum(value::int), 0) from jsonb_each_text(v) where key not in ('notes','to_build','declined')));
end $$;

grant select, insert, update on page_proposal, work_request to authenticated;
grant execute on function approve_page_proposal(uuid, boolean), return_page_proposal(uuid, text),
  request_decide(uuid, boolean, text), request_start(uuid), request_deliver(uuid, text, uuid, text),
  request_signoff(uuid, boolean, text), staff_inbox() to authenticated;
