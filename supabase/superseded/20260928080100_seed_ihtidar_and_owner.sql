-- The iḥtiḍār steps of the new design, as DRAFTS for the scholar to review.
-- Not published: the app shows them with «لم يراجعها العالِم بعد» until the owner approves each.
insert into content_string (key, namespace, kind, label, hint, draft_value, status) values
  ('ihtidar.v2.1.title', 'religious', 'text', 'Ihtidar step 1 — title', 'الاحتضار · الخطوة 1 · العنوان', 'وجِّهه إلى القبلة', 'draft'),
  ('ihtidar.v2.1.body', 'religious', 'longtext', 'Ihtidar step 1 — body', 'الاحتضار · الخطوة 1 · النصّ', 'يُستحبّ أن يُوجَّه المحتضر إلى القبلة، مستلقياً على ظهره، وباطنُ قدميه نحوها. إن تعذّر ذلك لحالته، فلا حرج.', 'draft'),
  ('ihtidar.v2.2.title', 'religious', 'text', 'Ihtidar step 2 — title', 'الاحتضار · الخطوة 2 · العنوان', 'لقِّنه الشهادتين', 'draft'),
  ('ihtidar.v2.2.body', 'religious', 'longtext', 'Ihtidar step 2 — body', 'الاحتضار · الخطوة 2 · النصّ', 'يُلقَّن برفق، من غير إلحاح ولا رفع صوت: الشهادتان، والإقرار بالأئمّة عليهم السلام. يُقال أمامه، ولا يُطلب منه أن يردّد.', 'draft'),
  ('ihtidar.v2.3.title', 'religious', 'text', 'Ihtidar step 3 — title', 'الاحتضار · الخطوة 3 · العنوان', 'اقرأ عنده', 'draft'),
  ('ihtidar.v2.3.body', 'religious', 'longtext', 'Ihtidar step 3 — body', 'الاحتضار · الخطوة 3 · النصّ', 'يُستحبّ قراءة سورة يس والصافّات عنده، لتخفيف سكرات الموت. اقرأ بصوتٍ هادئ.', 'draft'),
  ('ihtidar.v2.4.title', 'religious', 'text', 'Ihtidar step 4 — title', 'الاحتضار · الخطوة 4 · العنوان', 'خفِّف عنه', 'draft'),
  ('ihtidar.v2.4.body', 'religious', 'longtext', 'Ihtidar step 4 — body', 'الاحتضار · الخطوة 4 · النصّ', 'لا يُترك وحده. يُحسن إغماضُ عينيه وإطباقُ فمه بعد الوفاة، وشدُّ لحييه، ومدُّ يديه إلى جنبيه.', 'draft'),
  ('ihtidar.v2.5.title', 'religious', 'text', 'Ihtidar step 5 — title', 'الاحتضار · الخطوة 5 · العنوان', 'بعد الوفاة', 'draft'),
  ('ihtidar.v2.5.body', 'religious', 'longtext', 'Ihtidar step 5 — body', 'الاحتضار · الخطوة 5 · النصّ', 'يُغطّى بثوب، ويُعجَّل في تجهيزه. لا يُترك عنده مَن لا يملك نفسه من الصياح — والصبرُ عند الصدمة الأولى.', 'draft'),
  ('ihtidar.v2.6.title', 'religious', 'text', 'Ihtidar step 6 — title', 'الاحتضار · الخطوة 6 · العنوان', 'من تتّصل به', 'draft'),
  ('ihtidar.v2.6.body', 'religious', 'longtext', 'Ihtidar step 6 — body', 'الاحتضار · الخطوة 6 · النصّ', 'الغاسل، والمسجد أو الحسينيّة، والمقبرة. أرقامك محفوظة هنا وتعمل بلا إنترنت.', 'draft')
on conflict (key) do nothing;

-- The owner's seat: claimed automatically the first time this address signs in and confirms.
insert into role_invite (email, role, note) select 'oggi.teamz@gmail.com', 'owner', 'bootstrap' where not exists (select 1 from user_roles where role = 'owner') on conflict do nothing;
