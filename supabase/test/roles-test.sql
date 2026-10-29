do $$
declare r jsonb := '{}'; a uuid := gen_random_uuid(); s uuid := gen_random_uuid(); u uuid := gen_random_uuid();
  pid uuid; st text; n int; v text;
  claims text;
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','dry-admin@x.invalid',now(),now(),now(),'{}','{}'),
         (s,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','dry-sch@x.invalid',now(),now(),now(),'{}','{}'),
         (u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','dry-usr@x.invalid',now(),now(),now(),'{}','{}');
  insert into user_roles (user_id, role) values (a,'admin'), (s,'writer');

  -- ── as the SCHOLAR ──
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role','authenticated','email','dry-sch@x.invalid')::text, true);
  execute 'set local role authenticated';
  insert into page (section, title, blocks, status) values ('will','صفحة تجربة','[{"t":"p","text":"نص"}]','published') returning id, status into pid, st;
  r := r || jsonb_build_object('1_scholar_creates_published_becomes', st);
  update page set status = 'published' where id = pid;
  select status into st from page where id = pid;
  r := r || jsonb_build_object('2_scholar_publish_attempt_leaves', st);
  update page set status = 'pending', title = 'صفحة تجربة ٢' where id = pid;
  select status into st from page where id = pid;
  r := r || jsonb_build_object('3_scholar_sends', st);
  begin perform ui_set_text('ui.home.abc', 'x'); r := r || '{"4_scholar_edit_text":"ALLOWED (BAD)"}';
  exception when others then r := r || jsonb_build_object('4_scholar_edit_text', 'refused: ' || sqlerrm); end;
  insert into annotation (route, target_key, note, suggestion) values ('home', 'ui.home.abc', 'ملاحظة', 'صياغة');
  select count(*) into n from annotation; r := r || jsonb_build_object('5_scholar_sees_notes', n);
  begin update annotation set status='resolved' where author = s; r := r || '{"6_scholar_resolves_own":"ok"}';
  exception when others then r := r || jsonb_build_object('6_scholar_resolves_own', sqlerrm); end;

  -- ── as the ADMIN ──
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated','email','dry-admin@x.invalid')::text, true);
  execute 'set local role authenticated';
  update page set status = 'returned' where id = pid and false; -- no-op
  begin update page set status = 'returned' where id = pid; r := r || '{"7_return_without_reason":"ALLOWED (BAD)"}';
  exception when others then r := r || jsonb_build_object('7_return_without_reason', 'refused'); end;
  update page set status = 'published' where id = pid;
  select status || ' by ' || coalesce((published_by = a)::text,'null') into st from page where id = pid;
  r := r || jsonb_build_object('8_admin_publishes', st);
  select count(*) into n from page_revision where page_id = pid; r := r || jsonb_build_object('9_revisions_kept', n);
  perform ui_set_text('ui.home.abc', 'نص جديد', 'نص قديم', 'home');
  perform ui_set_text('ui.home.abc', 'نص أحدث', 'نص قديم', 'home');
  select published_value into v from content_string where key = 'ui.home.abc';
  r := r || jsonb_build_object('10_admin_edit_live', v);
  select count(*) into n from content_audit where key = 'ui.home.abc'; r := r || jsonb_build_object('11_audit_rows', n);
  perform ui_set_text('ihtidar.c.wad.0', 'يُوضَع على ظهره (تجربة).', 'يُوضَع على ظهره', 'ihtidar');
  select namespace::text into v from content_string where key = 'ihtidar.c.wad.0'; r := r || jsonb_build_object('12_ihtidar_line_namespace', v);
  perform ui_reset_text('ui.home.abc');
  select count(*) into n from content_string where key = 'ui.home.abc'; r := r || jsonb_build_object('13_reset_removes', n);
  begin perform ui_reset_text('ihtidar.title'); r := r || '{"14_reset_seeded_line":"ALLOWED (BAD)"}';
  exception when others then r := r || '{"14_reset_seeded_line":"refused"}'; end;
  update annotation set status = 'resolved'; select count(*) into n from annotation where status='resolved'; r := r || jsonb_build_object('15_admin_resolves', n);

  -- ── as an ordinary USER ──
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role','authenticated','email','dry-usr@x.invalid')::text, true);
  execute 'set local role authenticated';
  begin insert into page (section, title) values ('will','x y'); r := r || '{"16_user_creates_page":"ALLOWED (BAD)"}';
  exception when others then r := r || '{"16_user_creates_page":"refused"}'; end;
  select count(*) into n from annotation; r := r || jsonb_build_object('17_user_sees_notes', n);
  begin perform ui_set_text('ui.home.zz', 'x'); r := r || '{"18_user_edits":"ALLOWED (BAD)"}';
  exception when others then r := r || '{"18_user_edits":"refused"}'; end;
  select count(*) into n from page where id = pid; r := r || jsonb_build_object('19_user_reads_published_page', n);

  -- ── signed OUT ──
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  select count(*) into n from page where id = pid; r := r || jsonb_build_object('20_anon_reads_published_page', n);
  select count(*) into n from content_published where key = 'ihtidar.c.wad.0'; r := r || jsonb_build_object('21_anon_sees_edited_line', n);
  begin select count(*) into n from annotation; r := r || jsonb_build_object('22_anon_notes', n);
  exception when others then r := r || '{"22_anon_notes":"refused"}'; end;

 -- extra: published pages
 execute 'reset role';
 perform set_config('request.jwt.claims', json_build_object('sub', s, 'role','authenticated')::text, true);
 execute 'set local role authenticated';
 update page set title = 'scholar rewrite' where id = pid; get diagnostics n = row_count;
 r := r || jsonb_build_object('23_scholar_edits_published_rows', n);
 begin delete from page where id = pid; get diagnostics n = row_count; r := r || jsonb_build_object('24_scholar_deletes_published_rows', n);
 exception when others then r := r || '{"24_scholar_deletes_published_rows":"refused"}'; end;
 execute 'reset role';
 perform set_config('request.jwt.claims', json_build_object('sub', a, 'role','authenticated')::text, true);
 execute 'set local role authenticated';
 update page set title = 'admin rewrite', blocks = '[{"t":"p","text":"جديد"}]' where id = pid; get diagnostics n = row_count;
 r := r || jsonb_build_object('25_admin_rewrites_published_rows', n);
 update page set status = 'returned', review_note = 'راجع المصدر' where id = pid;
 select status into st from page where id = pid; r := r || jsonb_build_object('26_admin_returns_with_reason', st);
  execute 'reset role';
  raise notice 'RESULT %', r;
end $$;
