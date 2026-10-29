-- The owner's seat: claimed automatically the first time this address signs in
-- and confirms it. (The iḥtiḍār drafts that used to be seeded here are gone:
-- iḥtiḍār is back to the eight topics Samer reviewed, read from the code with
-- named keys an admin edits in place.)
insert into role_invite (email, role, note)
select 'oggi.teamz@gmail.com', 'owner', 'bootstrap'
where not exists (select 1 from user_roles where role = 'owner')
on conflict do nothing;
