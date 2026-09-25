# Robotrick Backend — Rewrite Plan

A fresh TypeScript backend, built in this folder, that replaces the JavaScript +
MongoDB version with TypeScript + PostgreSQL and a clean layered design.

## Decisions

| Topic | Decision |
|---|---|
| Language | TypeScript, `strict: true` from day one (new code only) |
| Database | PostgreSQL via **Drizzle ORM** and a plain `DATABASE_URL` |
| DB provider | **Supabase Postgres for now.** Switching to Neon = change `DATABASE_URL` |
| File storage | **Supabase Storage for now**, behind a `FileStorage` interface. Switching to Cloudinary = one new adapter |
| IDs | 24-char hex strings in ObjectId format, exposed as `_id` (and `id`) exactly as today |
| API surface | Same routes, same request/response shapes. Guarded by the route-parity snapshot |
| Validation | `zod` (schemas double as TypeScript types) |
| Tests | `vitest` + `supertest`, against in-process Postgres (**PGlite**) — no DB server needed |
| Hosting | Vercel for now |
| Realtime / cron | Socket.io and node-cron kept behind interfaces; the Vercel question is decided at the end |
| Data | No existing data to migrate. Seed scripts create test data |

## Architecture (the SOLID fix)

Old code: 73 of 80 controllers query Mongoose models directly, so HTTP,
business rules and database access are mixed in 1,000–2,300 line files.

New code, per feature module:

```
src/modules/<feature>/
  <feature>.routes.ts       HTTP wiring only: path + middleware + controller method
  <feature>.controller.ts   Reads request, calls service, shapes response. No DB, no rules.
  <feature>.service.ts      Business rules. Depends on repository INTERFACES only.
  <feature>.repository.ts   Interface + Drizzle implementation. The only place SQL lives.
  <feature>.schemas.ts      zod request schemas
  <feature>.table.ts        Drizzle table definitions
```

Rules:
- **S** — one reason to change per file (above).
- **O/L** — adapters (storage, email, push, DB) implement small interfaces and are swappable.
- **I** — services ask for the narrow interface they need (`UserCredentialsReader`), not "the whole DB".
- **D** — services receive dependencies via constructor; `src/container.ts` is the single place that wires real implementations. Tests wire fakes or PGlite.
- Modules talk to each other through their services/interfaces, never by importing another module's tables.

Shared code lives in `src/shared/` (db, http errors, auth middleware, storage, email, logger).

The old JavaScript is moved to `legacy/` as read-only reference and deleted
module by module as each is ported. It is not run.

## Phases

| # | Phase | Contents |
|---|---|---|
| 0 | Foundation | TS toolchain, env config, Drizzle + Postgres, PGlite tests, errors, logger, app bootstrap, Vercel entry, storage/email interfaces |
| 1 | Identity | users, auth (login, logout, me, OTP password/email/forgot flows), push tokens, settings, app version |
| 2 | Catalog | courses & bundles, subscription plans, training page content, interests |
| 3 | CRM | leads, contacts, contact history, events, job applications, contact form |
| 4 | Enrollment & money | groups, enrollments, payments, receipts, user subscriptions |
| 5 | Teaching | course modules, sessions, attendance, quizzes, assignments, tasks, resources, evaluations, certificates, gallery, documents, boards |
| 6 | Competitions & inventory | competitions, teams, evaluations, parts, stock, orders, projects, posts, images |
| 7 | Internal work | CTO projects/tasks/subtasks, work sessions, time extensions, engineer, client portal |
| 8 | Transport | routes, pricing, trips, drivers, scheduler |
| 9 | Chat & notifications | group/private chat, notifications, web push. **WebSockets on hold: skipped until you ask** |
| 10 | Finish | delete `legacy/`, full route-parity pass, seed data, deploy docs |

Each phase ends with: typecheck clean, tests green, routes for that phase
present in the parity report.

## Setup you will need to do

1. Create a Supabase project → **Project Settings → Database → Connection string**.
   Put the *Transaction pooler* URL (port 6543) in `.env` as `DATABASE_URL`.
2. Keep `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET` for file storage.
3. `npm run db:migrate` creates the tables; `npm run db:seed` creates test data.

## Progress

| Phase | Status | Notes |
|---|---|---|
| 0 Foundation | ✅ Done | Typecheck, lint, build OK |
| 1 Identity | 🟡 Auth done | All 9 `/api/auth/*` routes. User management, settings, app version still to do |
| 2 Catalog | ✅ Done | 32 routes: CLO courses/bundles, interests, subscription plans, training content; reception interests + active plans; public training content |
| 3–10 | ⏳ | |

Tests: 30 passing. Route parity: `npm run routes:check` → 43 / 503 legacy routes served.

Live on Supabase: tables migrated; buckets `pdf`, `client-media` (private) and `images` (public, website images).

Temporary gaps, closed when the owning module lands (each is a small interface with a stand-in, wired in `src/container.ts`):
- Login/`me` return `nameAr: null`: Arabic names come from CRM leads (phase 3).
- The "all enrollments inactive → student can't log in" rule returns with enrollments (phase 4).
- Course list stats, course details (groups/trainers/enrollments), course statistics, and the
  "has groups/enrollments" checks on delete/archive report zero until groups & enrollments exist (phases 4–5).
- Deleting a subscription plan does not yet check active user subscriptions (phase 4).
- A course's `modules` list is `[]` until course modules are ported (phase 5).

Deliberate changes from the old API (safer; response shapes unchanged):
- Every error body has both `message` and `error.message`.
- Invalid ids return 404 instead of 500.
- Training-page images moved from Cloudinary to the public Supabase `images` bucket.
- Search text is matched literally (the old code passed it into a regex).
