# START HERE — Robotrick Backend Rewrite

Read this file first when you come back. It explains the goal, what is
finished, where we stopped, and exactly how to continue.

Last updated: 2026-09-26 (evening)

---

## 1. The goal (in one paragraph)

The old backend was JavaScript + MongoDB with messy code (controllers doing
everything). We are rewriting it **from zero, in this same folder**, as
**TypeScript + PostgreSQL** with clean SOLID structure. The web frontend and
the mobile app must keep working **without any change**, so every route and
every response shape stays exactly the same (including `_id`).

---

## 2. Decisions we made (do not change without deciding again)

| Topic | Decision |
|---|---|
| Language | TypeScript (strict) |
| Database | PostgreSQL through **Drizzle ORM** |
| Database provider | **Supabase for now.** If you prefer Neon later, only change `DATABASE_URL` in `.env` |
| File storage | **Supabase Storage for now.** If you prefer Cloudinary later, we write one small adapter file |
| IDs | 24-character ids like `6ab6dc841de5cca01e71ffd0`, returned as `_id` (same as MongoDB) |
| Routes / responses | Identical to the old API |
| Hosting | Vercel for now |
| WebSockets (chat live updates) | **Ignored for now** — skip until you ask |
| Git | No branches. Work directly here (you keep another copy of the project) |
| Test data | No real data yet; we create test data with a seed script |

---

## 3. Where we are now

| Phase | What | Status |
|---|---|---|
| 0 | Foundation (TypeScript, database, tests, security, errors) | ✅ Done |
| 1 | Identity: **auth** (login, logout, me, change password/email, forgot password) | ✅ Done |
| 1 | Identity: settings (exchange rate, app version), assign a competition to a user | ✅ Done |
| 2 | Catalog: courses & bundles, interests, subscription plans, training page content | ✅ Done |
| 3 | CRM: leads, contact history, calendar events, website contact form, job applications | ✅ Done |
| 4 | Groups, enrollments, payments, receipts (PDF), student payments (read-only), hour packages, private session requests | ✅ Done |
| 5 | Teaching: course modules, sessions, attendance, quizzes, assignments, tasks, resources, evaluations, certificates, student projects, gallery, documents, boards, student course pages, all dashboards, CLO trainers, reception users & job applications | ✅ Done (commit `119650e`) |
| 6 | Competitions, teams, judging, parts, stock, orders, inventory projects, posts, images | ✅ Done (commit `f5f02c2`) |
| 7 | CTO internal work, engineer, client portal, work hours | ✅ Done (commit `f5f02c2`) |
| 8 | Transport: drivers, seats & fares, trips, driver app, student app, feedback, management | ✅ Done (not committed yet) |
| 9 | Chat & notifications (WebSockets on hold) | ⏳ **Next** |
| 10 | Finish: delete `legacy/`, final checks, deploy | ⏳ |

**Numbers:** 479 of 503 old routes are rebuilt. 131 automatic tests pass
(typecheck and lint clean). Migrations 0000–0017 are applied to Supabase.
Left: chat & notifications (23 routes, phase 9) and a deep health check (phase 10).

### Phase 8 changes you should know about

- The daily trip generator is a service now; reception can still run it with
  `POST /api/reception/transport/trips/generate`. The automatic 00:01 run
  (it was a timer inside the server, which Vercel does not keep running)
  comes back in phase 10 as a Vercel Cron call.
- The academy location is stored in the app settings (no server memory cache).
- Safety rules in the database: one active seat per student, one active fare
  setting, one trip in progress per driver.
- Road distances use Google Maps when `GOOGLE_MAPS_API_KEY` is set (it is, and it
  works); otherwise straight line × 1.35. Tests never call Google.
- A driver with past trips can't be deleted (409) instead of leaving broken history.

⚠️ **Big uploads on Vercel:** Vercel refuses request bodies over ~4.5 MB, so on
Vercel any larger upload (resource PDFs up to 25 MB, client videos up to 300 MB,
documents …) will fail. The fix is "direct upload": the app asks the backend for
a signed upload link and sends the file straight to Supabase. Decide before
launch; locally everything works as is.

### Phase 7 changes you should know about

- Task attachments and engineer screenshots are in the public images bucket
  (they were public Cloudinary links); client videos/voice notes stay private.
- Someone can only be clocked in once at a time (enforced by the database).
- A CTO status change to "done" now records the completion time (used for scores).
- Moving a project that has its own sub-projects is refused (it would nest two levels).

### Phase 6 changes you should know about

- **Stock is now counted correctly.** Before, placing an order *added* to the
  available stock and fulfilling never removed anything. Now: ordering moves
  the quantity from available to reserved; rejecting/cancelling moves it back;
  fulfilling removes it from reserved. Orders only move pending → approved →
  fulfilled (or rejected/cancelled while open); stock can't go below zero.
- Uploaded images (part photos etc.) go to the public `images` bucket instead
  of the server disk (which Vercel wipes). `/api/images/...` redirects to the
  file; thumbnails show the full image (the old resizing always failed).
- Judges: a team must belong to the competition, and a judge scores each team once.
  Team limits (`maxTeams`) are now enforced.
- Posts: editing a published post keeps its original publish date; duplicate slugs → 409.
- Inventory "projects" (`/api/projects`, parts lists) are separate from graded
  student projects now.
- A part used in orders can't be deleted (409), instead of leaving broken orders.

**State (2026-09-27, midday):** Phase 5 is finished and live-checked on
Supabase (CLO dashboard, analytics, trainers, resources, gallery, projects,
evaluations; a real certificate PDF renders correctly with local Chrome).
The live check found that firing ~15 queries at once stalls on the Supabase
transaction pooler, so the CLO dashboard now queries in batches of ≤ 5 (the
pool size) and connections time out after 10 s instead of hanging.

**Root cause found (2026-09-27, evening):** the database driver (postgres.js)
*pipelines*: it sends a new query on a connection that is still busy. Supabase's
transaction pooler loses those queries, so any request that ran more queries at
once than there are connections hung forever, and then the whole server hung.
Turning pipelining off (`max_pipeline: 0`) stopped the hangs but broke every
transaction (a postgres.js quirk), so the backend now uses **node-postgres
(`pg`)** instead. It never pipelines and gives each transaction its own
connection (`src/shared/db/client.ts`). Checked on Supabase: repeated parallel
batches, 7 queries at once, and transactions next to other queries all pass,
and the dashboard link check passes 91 of 92 calls (the other one is a check
that needs parameters).
Also fixed: the leads stats query sent a JS `Date` inside raw SQL, which the real
driver rejects (the in-memory test database accepts it, so tests didn't catch it).

⚠️ **Deploy note:** the database is in Tokyo (`ap-northeast-1`). Set the Vercel
function region to Tokyo (`hnd1`) so each query is fast; from far away every
query costs ~0.5 s (the dashboard took 4–6 s from Syria).

**Next step when you return:**
1. Commit Phase 8 if not yet done (Claude shows the message first).
2. Continue with Phase 9 (chat & notifications), then 10 (finish).
3. Run `npx tsx scripts/route-parity.ts --list-missing` to see what is left.

### Phase 5 changes you should know about (differences from the old API)

- **Students cannot enroll themselves** (`POST /api/student/courses/:id/enroll`
  → 403 `ENROLLMENT_AT_RECEPTION`), same rule as payments.
- **Reception can no longer create admin/CLO/CTO accounts or promote anyone to
  them** (the old API even let reception make itself admin). Admins still can.
  ⚠️ Tell Claude if reception really must do this.
- Trainer evaluation endpoints are now staff-only (students could use them before).
- Private files: WRO documents (national IDs!), gallery photos, project photos
  are private now and served with short-lived links (they were public before).
- Web PDF viewer one-time tokens are stored in the database (the old in-memory
  store breaks on Vercel).
- Certificate artwork is embedded in the backend (the old code read it from the
  frontend folder). Fixed "wish he" → "wish him" on the certificate.
- Fixed old bugs: certificate "issued" count, course-popularity / attendance
  trends / top-trainer attendance (always empty or 0 before), reception
  recent-activities (always crashed), trainer schedule "attendance marked",
  quiz answers and YouTube id leaking in the student session list, "2 months"
  course duration read as 2 hours.
- Trainer dashboard evaluation/resource figures now come from student
  evaluations and assigned resources (the old sources were never filled).
- Deactivating a trainer (CLO) only labels them inactive; it does not block sign-in (same as before).

### Business decisions made along the way

- **Students never pay in the app.** Payments are recorded at the company by
  reception only. The old student "initiate / confirm payment" endpoints let a
  student mark their own payment as paid with any transaction number; they now
  always refuse. Students can still *see* their payments, balance and receipts.
- **Receipt PDFs are not stored as files.** They are rendered from the saved
  receipt data each time someone downloads them (works on Vercel). Locally
  this uses the Chrome installed on the computer; on Vercel a bundled Chromium.

---

## 4. Your Supabase setup (already done ✅)

- Project: `tvjujazmhrfyekptonrc` (region: Tokyo / ap-northeast-1)
- Tables are created in the database (see Supabase → **Table Editor**)
- Storage buckets:
  - `pdf` — private (PDF files)
  - `client-media` — private (client uploads)
  - `images` — **public** (website images)
- All secrets are in the `.env` file (never share it, never commit it):
  `C:\Users\Admin\Desktop\Robotric_Project\Robotric_backend\.env`

⚠️ **Security to-do before going live:** the database password and the
secret key were pasted in the chat. Before launch, reset both in Supabase
(Project Settings → Database → Reset password, and Project Settings →
API Keys → new secret key) and update `.env`. Also delete the old secret key.

### Test accounts (created by the seed script)

One account per role. Password for all: `Password123`

```
student@robotrick.test     trainer@robotrick.test    clo@robotrick.test
reception@robotrick.test   admin@robotrick.test      superadmin@robotrick.test
cto@robotrick.test         engineer@robotrick.test   driver@robotrick.test
client@robotrick.test      ... (every role)
```

---

## 5. How to run it

Open a terminal in the project folder (VS Code → Terminal → New Terminal):

| Command | What it does |
|---|---|
| `npm run dev` | Starts the backend on http://localhost:4889 (stop with Ctrl + C) |
| `npm test` | Runs all automatic tests |
| `npm run typecheck` | Checks TypeScript errors |
| `npm run lint` | Checks code style |
| `npm run routes:check` | Shows how many old routes are rebuilt |
| `npm run db:generate` | Creates a new migration after changing tables |
| `npm run db:migrate` | Applies migrations to Supabase |
| `npm run db:seed` | Creates/resets the test accounts |

Quick check that it works: open http://localhost:4889/api/health in the
browser → you should see `{"status":"ok", ...}`.

---

## 6. How the code is organised

```
Robotric_backend/
├── START_HERE.md          ← this file
├── REWRITE_PLAN.md        ← detailed plan + list of temporary gaps
├── .env                   ← secrets (never commit)
├── legacy/                ← OLD JavaScript code, only for reference. Not run.
├── drizzle/               ← database migration files (SQL)
├── api/index.ts           ← Vercel entry
├── scripts/
│   ├── route-parity.ts    ← compares new routes with the old ones
│   └── legacy-routes.json ← list of all 503 old routes
├── tests/                 ← automatic tests (run on an in-memory database)
└── src/
    ├── server.ts          ← starts the server
    ├── app.ts             ← Express app: mounts all routes
    ├── container.ts       ← THE place where everything is connected together
    ├── config/env.ts      ← reads and checks .env
    ├── routes/            ← role areas: /api/clo, /api/reception, /api/public
    ├── shared/            ← code used by everyone (db, auth, errors, upload, storage, email)
    └── modules/           ← one folder per feature
        ├── auth/
        ├── users/
        ├── push-tokens/
        ├── courses/
        ├── interests/
        ├── subscription-plans/
        ├── training-content/
        ├── settings/
        ├── leads/
        ├── events/
        ├── contact-history/
        ├── contacts/
        ├── job-applications/
        ├── groups/
        ├── enrollments/
        ├── receipts/
        └── subscriptions/
```

Every feature module has the same files (this is the SOLID fix):

| File | Job |
|---|---|
| `*.table.ts` | Database table definition |
| `*.repository.ts` | The ONLY place that talks to the database |
| `*.service.ts` | Business rules (no HTTP, no SQL) |
| `*.schemas.ts` | Checks the request data |
| `*.controller.ts` | Reads the request, calls the service, sends the response |
| `*.ports.ts` | Small interfaces for things another module will provide later |

When one change touches several tables (for example, converting a lead
creates a user AND updates the lead), the service uses a **unit of work**
(`src/shared/db/unit-of-work.ts`): everything is saved together or nothing is.

---

## 7. Temporary gaps (filled automatically when later phases are built)

These show "zero/empty" today only because the feature they depend on is not
rebuilt yet. They are wired in `src/container.ts` with a comment `→ phase X`.

- Notifications (enrollment, payment, sessions, quizzes, tasks, resources,
  evaluations, projects) are not sent yet, and group chat membership is not
  updated → Phase 9. `POST /api/reception/notifications/send` → Phase 9.

---

## 8. How to continue with Claude

Open Claude Code in this folder and paste this:

> Read START_HERE.md and REWRITE_PLAN.md. We are rewriting the backend from
> legacy/ (JS + MongoDB) to TypeScript + PostgreSQL (Drizzle, Supabase).
> Continue from where we stopped (see "State when we stopped" in section 3):
> commit Phase 5 after I approve, then Phase 6. Keep routes and responses identical to the old
> API, follow the same module structure, ignore WebSockets, run tests,
> typecheck, lint and routes:check after each module, and update
> START_HERE.md at the end.

### The steps we follow for each feature

1. Read the old code in `legacy/src` (routes, controller, model).
2. Check how the frontend uses it (`../Robotric_Frontend_Dashboard`; the public site is `../Robotric_Frontend_Public`).
3. Write `table → repository → service → schemas → controller`.
4. Add the routes in `src/routes/...` and connect it in `src/container.ts`.
5. `npm run db:generate` (new migration), then write tests.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run routes:check`.
7. `npm run db:migrate` to update Supabase, then try it live.
8. Update this file.

---

## 9. Git

Phases 0–2 are committed (`4c0c8e8`). Phases 1 (rest), 3 and 4 are saved in
the files but **not committed yet**. Ask Claude to commit, or run:

```
git add -A
git commit -m "Rewrite: settings, CRM, groups, enrollments, payments (phases 1, 3, 4)"
```
