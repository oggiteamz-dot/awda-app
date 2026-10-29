# عَوْدة · Awda — three doors, one database

Built 28 Sep 2026. It takes the look of design build 8 (the awda-design repo) and connects it to the real `oggi-salah` database. Each door ships as a separate installable app at its own address.

| Door | For | Entry | Palette | Worker (workers.dev) |
|---|---|---|---|---|
| **عَوْدة** | users | `src/app.js` | الزمرّد | `awda` |
| **مكتب العالِم** | scholars (writer · qc) | `src/desk-main.js` | اللازورد | in `deploy.local.json` |
| **لوحة الإدارة** | owner · admin | `src/console-main.js` | الحبر | in `deploy.local.json` |

The staff addresses are kept out of this file and out of the code on purpose. They live in `deploy.local.json`, which is git-ignored, and in the handoff note in the project folder.

## Staff work inside the app (3 Oct 2026)

The scholar and admin links open **the same app a person sees**, with a staff bar floating above the tabs:

| | Admin (owner, admin) | Scholar (writer, qc) |
|---|---|---|
| Rewrite any text in place, live for everyone | ✔ (with history and undo) | — |
| Notes on any line: typed, suggested wording, voice, drawing | ✔ and resolve / apply wording | ✔ |
| Write pages for المعرفة | ✔ publish directly, rewrite any page | ✔ sent for approval, never published by them |
| Approve or return pages (with a reason) | ✔ | — |
| People, errors | ✔ | — |

How text becomes editable without rewriting the screens: `core/overrides.js` keys every visible text node as
`ui.<screen>.<fnv1a(original words)>` and paints the published value over it. Screens may name their own keys
with `data-k` (the iḥtiḍār cards do). Digits and the person's own name are never keyed.

Database: `supabase/migrations/20261003090000_staff_in_app.sql` (pages, page history, notes, `ui_set_text`,
`ui_reset_text`, admin rights over religious text). Proven role by role on a local copy:
`supabase/test/local-base.sql` + `supabase/test/roles-test.sql` (26 checks).

## Approvals and requests (29 Oct 2026) — nothing goes live without an admin

| | Admin (owner, admin) | Scholar (writer, qc) |
|---|---|---|
| Edit any line in place | ✔ live at once, with history | proposes wording → admin approves |
| Edit a published page | ✔ live at once | sends a **proposal** → admin approves (word-by-word diff) |
| New page | ✔ publishes | waits for approval |
| Requests (wall of text, recording up to ~30 min, "make this") | ✔ starts approved | ✔ waits for admin approval |
| Final approval of what was built from a request | for their own | ✔ the scholar who asked; approving publishes it |
| الموافقات tab (everything waiting, in one place) | ✔ | — |

Request lifecycle: `new → approved → building → review → done` (or `changes` → building again; `declined` with a reason).
Admin steps: `request_decide`, `request_start`, `request_deliver`. The requester's step: `request_signoff`.
The bar's badge is `staff_inbox()`. Tables: `page_proposal`, `work_request` — `supabase/migrations/20261029040000_approvals_and_requests.sql`.

Proof against the LIVE database: `scripts/roles_live.py` (30 role checks) and `scripts/walk-live.mjs` (22 steps across all three doors, real logins). Both create test rows; delete them afterwards.

## Why three doors and not one link

1. **The build copies only what each door reaches.** `scripts/build.mjs` follows the import statements from each entry, and a file that isn't reached isn't copied. So the user app's folder contains no scholar or admin screen. It doesn't even contain the *names* of the staff database functions (`staff/*-api.js`).
2. **A gate proves it on the output.** `scripts/gates.mjs` fails the build if a staff file, staff word, or staff address lands in the wrong folder. `--prove` plants each violation and requires the gate to catch it: 5 of 5 caught.
3. **The database is the actual lock.** Every staff action is a row-level-security policy or a `security definer` function that re-checks the role. Someone who found a staff address still can't do anything there without the role. Scholars write drafts only: a column grant blocks them from touching `published_value`. Only the owner publishes religious text.
4. **Staff doors aren't advertised.** They send `noindex` three ways (meta, `X-Robots-Tag`, `robots.txt`), use `Referrer-Policy: no-referrer`, and have unguessable worker names. Nothing links one door to another.

## Commands

```bash
npm i                     # playwright only (icons + walks)
node scripts/icons.mjs    # a home-screen icon per door
node scripts/build.mjs    # → dist/app · dist/desk · dist/console
node scripts/gates.mjs    # isolation · PWA · noindex · colour · file cap
node scripts/gates.mjs --prove
node scripts/walk.mjs     # the user app's screens at 390px, DB mocked at the network
node scripts/walk2.mjs    # staff in the app + iḥtiḍār cards: 38 steps, with taps and swipes
node scripts/offline.mjs  # server killed + offline: each door still opens
```

Deploy one folder: `cd dist/<door> && npx wrangler deploy` (needs `CLOUDFLARE_API_TOKEN`). You can also upload the folder in the Cloudflare dashboard (Workers → Create → Upload static files) under the worker name from `deploy.local.json`. **Use workers.dev only, never pages.dev.**

## Database

`supabase/migrations/20260928080000_three_doors.sql` adds profile, prayer_day, role_invite + `claim_invites()`, `my_roles()`, the admin functions, scholar_request, and the draft-only column grants.
`…080100_seed_ihtidar_and_owner.sql` adds the iḥtiḍār steps as drafts for the scholar, plus the owner invite.
Neither migration touches `salah_users`, `review_feedback`, `module_requests`, or any function the frozen old app calls (SPEC R-12).

## What is real and what is still a preview

- **Real:** sign-in (email code) · المعايرة saves the qaḍāʾ ledger by Hijri year · today's five prayers, with an offline outbox · the dot grid and calendar marks · logging qaḍāʾ (oldest year first) · pace and ±1 offset · published text from the content table · the whole scholar → owner approval loop · invites and revocation · scholar requests · the error inbox · install and offline on all three doors.
- **Preview, and labelled as one on screen:** الوصيّة (nothing is saved; moving wills to the cloud safely is the next slice) · the iḥtiḍār text (shows «لم يراجعها العالِم بعد» until each step is approved) · prayer times (approximate Beirut times; location-based calculation has its own spec).
