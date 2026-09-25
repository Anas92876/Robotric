# START HERE — Robotrick Backend Rewrite

Read this file first when you come back. It explains the goal, what is
finished, where we stopped, and exactly how to continue.

Last updated: 2026-09-26

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
| 1 | Identity: user management, settings, app version | ⏳ **Not done yet** |
| 2 | Catalog: courses & bundles, interests, subscription plans, training page content | ✅ Done |
| 3 | CRM: leads, contacts, contact history, events, job applications, contact form | ⏳ Next |
| 4 | Groups, enrollments, payments, receipts, user subscriptions | ⏳ |
| 5 | Teaching: course modules, sessions, attendance, quizzes, assignments, tasks, resources, evaluations, certificates, gallery, documents, boards | ⏳ |
| 6 | Competitions, teams, parts, stock, orders, projects, posts, images | ⏳ |
| 7 | CTO internal work, engineer, client portal | ⏳ |
| 8 | Transport | ⏳ |
| 9 | Chat & notifications (WebSockets on hold) | ⏳ |
| 10 | Finish: delete `legacy/`, final checks, deploy | ⏳ |

**Numbers:** 43 of 503 old routes are rebuilt. 30 automatic tests pass.

**Next step when you return:** finish Phase 1 (user management, settings,
app version), then Phase 3 (CRM).

---

## 4. Your Supabase setup (already done ✅)

- Project: `tvjujazmhrfyekptonrc` (region: Tokyo / ap-northeast-1)
- Tables are created in the database (see Supabase → **Table Editor**)
- Storage buckets:
  - `pdf` — private (PDF files)
  - `client-media` — private (client uploads)
  - `images` — **public** (website images)
- All secrets are in the `.env` file (never share it, never commit it):
  `C:\Users\Admin\Desktop\Robotric\Robotrick-Backend-main\.env`

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
Robotrick-Backend-main/
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
        └── training-content/
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

---

## 7. Temporary gaps (filled automatically when later phases are built)

These show "zero/empty" today only because the feature they depend on is not
rebuilt yet. They are wired in `src/container.ts` with a comment `→ phase X`.

- Login returns `nameAr: null` → fixed in Phase 3 (leads).
- A student with all enrollments inactive can still log in → fixed in Phase 4.
- Course statistics show 0 groups / 0 enrollments → fixed in Phases 4–5.
- Deleting a subscription plan does not check active subscriptions → Phase 4.
- A course's `modules` list is empty → Phase 5.

---

## 8. How to continue with Claude

Open Claude Code in this folder and paste this:

> Read START_HERE.md and REWRITE_PLAN.md. We are rewriting the backend from
> legacy/ (JS + MongoDB) to TypeScript + PostgreSQL (Drizzle, Supabase).
> Continue from where we stopped: finish Phase 1 (user management, settings,
> app version), then Phase 3. Keep routes and responses identical to the old
> API, follow the same module structure, ignore WebSockets, run tests,
> typecheck, lint and routes:check after each module, and update
> START_HERE.md at the end.

### The steps we follow for each feature

1. Read the old code in `legacy/src` (routes, controller, model).
2. Check how the frontend uses it (`../Robotrick-Frontend-main`).
3. Write `table → repository → service → schemas → controller`.
4. Add the routes in `src/routes/...` and connect it in `src/container.ts`.
5. `npm run db:generate` (new migration), then write tests.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run routes:check`.
7. `npm run db:migrate` to update Supabase, then try it live.
8. Update this file.

---

## 9. Nothing is committed yet

All work is saved in the files and **staged** in git, but not committed.
If you want a safe save point, run:

```
git commit -m "Rewrite: foundation, auth, catalog (phases 0-2)"
```
