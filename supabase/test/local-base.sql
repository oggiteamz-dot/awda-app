-- A small stand-in for the parts of the live Supabase project the migrations
-- build on, so the database rules can be proven locally before anything
-- touches production. Mirrors: auth.users, auth.uid()/jwt(), the role tables,
-- the content tables and their triggers/policies (copied from the live project
-- on 3 Oct 2026).
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
grant usage on schema auth, public to anon, authenticated;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;

create type app_role as enum ('owner','admin','qc','writer','copywriter','viewer');
create type content_namespace as enum ('marketing','product','help','legal','email','system','religious','calendar','triage');
create type content_kind as enum ('text','longtext','html','image','number','toggle','price','link');
create type content_status as enum ('draft','in_review','published');
create type content_action as enum ('view','edit','submit','publish');

create table user_roles (user_id uuid not null references auth.users(id), role app_role not null,
  granted_by uuid, granted_at timestamptz not null default now(), primary key (user_id, role));
create table role_permission (role app_role, namespace content_namespace, money bool, action content_action,
  primary key (role, namespace, money, action));
insert into role_permission select 'owner', n, m, a from unnest(enum_range(null::content_namespace)) n,
  unnest(array[false,true]) m, unnest(enum_range(null::content_action)) a;
insert into role_permission select 'admin', n, m, a from unnest(array['marketing','product','help','legal','email','system']::content_namespace[]) n,
  unnest(array[false,true]) m, unnest(enum_range(null::content_action)) a;
insert into role_permission values ('admin','religious',false,'view'),('admin','religious',false,'edit'),('admin','religious',false,'submit'),
  ('admin','calendar',false,'view'),('admin','calendar',false,'edit'),('admin','calendar',false,'submit'),('admin','triage',false,'view'),
  ('writer','religious',false,'view'),('writer','religious',false,'edit'),('writer','religious',false,'submit'),
  ('writer','product',false,'view'),('writer','product',false,'edit'),('writer','product',false,'submit');

create function has_role(p_role app_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = p_role); $$;
create function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('owner','admin')); $$;
create function can_content(p_namespace content_namespace, p_kind content_kind, p_action content_action) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles ur join role_permission rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.namespace = p_namespace and rp.action = p_action and rp.money = (p_kind in ('price','link'))); $$;
grant execute on function has_role(app_role), is_staff(), can_content(content_namespace, content_kind, content_action) to anon, authenticated;

create table content_string (key text primary key, namespace content_namespace not null, kind content_kind not null,
  label text not null, hint text, draft_value text, published_value text, status content_status not null,
  updated_by uuid references auth.users(id), updated_at timestamptz not null default now(),
  published_by uuid references auth.users(id), published_at timestamptz, review_note text,
  constraint published_not_blank check (status <> 'published' or (published_value is not null and length(trim(published_value)) > 0)));
create table content_audit (id bigserial primary key, key text not null, action text not null, actor uuid, actor_label text,
  old_value text, new_value text, at timestamptz not null default now());
create function log_content_change() returns trigger language plpgsql security definer set search_path = public as $$
declare v_actor uuid := coalesce(auth.uid(), nullif(current_setting('app.actor_id', true), '')::uuid); v_action text;
begin
  if tg_op = 'INSERT' then v_action := 'created';
  elsif new.status = 'published' and coalesce(old.status::text, '') <> 'published' then v_action := 'published';
  elsif new.status = 'in_review' and coalesce(old.status::text, '') <> 'in_review' then v_action := 'submitted';
  elsif new.review_note is distinct from old.review_note and new.status = 'draft' then v_action := 'rejected';
  else v_action := 'edited'; end if;
  insert into content_audit (key, action, actor, actor_label, old_value, new_value)
  values (new.key, v_action, v_actor, coalesce((select email from auth.users where id = v_actor), 'system/service-role'),
    case when tg_op = 'INSERT' then null else coalesce(old.published_value, old.draft_value) end, coalesce(new.published_value, new.draft_value));
  new.updated_at := now(); new.updated_by := coalesce(v_actor, new.updated_by); return new;
end $$;
create trigger content_audit_trg before insert or update on content_string for each row execute function log_content_change();
alter table content_string enable row level security;
alter table content_audit enable row level security;
create policy content_insert on content_string for insert with check (can_content(namespace, kind, 'edit'));
create policy content_read_drafts on content_string for select using (can_content(namespace, kind, 'view'));
create policy content_read_published on content_string for select using (status = 'published');
create policy content_update on content_string for update using (can_content(namespace, kind, 'edit')) with check (can_content(namespace, kind, 'edit'));
create policy audit_read_staff on content_audit for select using (is_staff() or has_role('qc'));
grant select, insert, update on content_string to anon, authenticated;
grant select on content_audit to authenticated;
create view content_published as select key, namespace, kind, published_value as value from content_string where status = 'published';
grant select on content_published to anon, authenticated;
insert into content_string (key, namespace, kind, label, published_value, draft_value, status)
values ('ihtidar.title', 'product', 'text', 'Screen title', 'عند الاحتضار', 'عند الاحتضار', 'published');
