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
| 1 Identity | ✅ Done | 9 `/api/auth/*` routes; exchange rate; app version (public + admin); superadmin assigns a competition to a user |
| 2 Catalog | ✅ Done | 32 routes: CLO courses/bundles, interests, subscription plans, training content; reception interests + active plans; public training content |
| 3 CRM | ✅ Done | 26 routes: leads (incl. convert, waiting list, status history), contact history (auto calendar event), events, contact form, job applications (PDF CV) |
| 4 Enrollment & money | ✅ Done | 63 routes: CLO + trainer groups; reception enrollments (single, bundle, from waiting list), course & transportation payments, receipts (PDF on download), student payments (read-only), hour packages, private session requests & reports |
| 5 Teaching | ✅ Done (uncommitted) | 194 routes: sessions, attendance, course modules, quizzes, assignments, tasks, resources (one-time PDF tokens in DB), evaluations + criteria, certificates (PDF), student projects, gallery, WRO documents, boards, student courses/sessions/video, trainer/student/CLO/reception dashboards, CLO analytics & trainers, reception users & job applications. Migrations 0007–0014 applied to Supabase. See START_HERE.md §3 for behaviour changes. |
| 6 Competitions & store | ✅ Done | 44 routes: competitions, teams, judge scoring & rankings, parts, stock (levels/stats/history/adjust), orders (reserve → fulfil, fixed stock maths), inventory projects, posts, images (public bucket + redirects). Migration 0015 applied. |
| 7 Internal work | ✅ Done | 57 routes: CTO projects/sub-projects/tasks/attachments/analytics/employee of the month, engineer tasks/sub-tasks/submissions/extensions, clock-in/out work hours, client portal with media. Migration 0016 applied. |
| 8 Transport | ✅ Done | 47 routes: reception seats/drivers/trips/fares/academy location, trip generator, management pricing/earnings/overview/feedback, driver app (route optimisation, live location, pickups, earnings), student app (status, history, feedback, estimates). Migration 0017 applied. |
| 9–10 | ⏳ | Phase 9 (chat & notifications) next |

Tests: 131 passing. Route parity: `npm run routes:check` → 479 / 503 legacy routes served.

Note: the old reception job-application admin handlers (list/update/delete/CV download) were never mounted in the old app, so they are not ported either.

Live on Supabase: tables migrated; buckets `pdf`, `client-media` (private) and `images` (public, website images).

Temporary gaps, closed when the owning module lands (each is a small interface with a stand-in, wired in `src/container.ts`):
- A course's `modules` list is `[]` until course modules are ported (phase 5).
- Group session/attendance figures (progress, average attendance, next session, per-student attendance)
  are zero until sessions & attendance exist (phase 5) — `groups.ports.ts`.
- Student notifications (enrollment, payment, reminders) and group-chat membership are no-ops until
  phase 9 — `enrollments.ports.ts`, `groups.ports.ts`.

Deliberate changes from the old API (safer; response shapes unchanged):
- Every error body has both `message` and `error.message`.
- Invalid ids return 404 instead of 500.
- Training-page images moved from Cloudinary to the public Supabase `images` bucket.
- Search text is matched literally (the old code passed it into a regex).
- Leads: creating without a status now defaults to `interest` (the old default `new` was invalid and made the save fail);
  a lead already converted to a student cannot be converted again (the old check tested an impossible status).
- Converting a lead / setting it to waiting creates the account and updates the lead in one transaction.
- Login display names prefer the lead that was converted into the account, then fall back to a same-name lead.
- Deleting a contact-history entry removes its calendar event in the same transaction.
- **Student online payments disabled** (business decision): `POST /api/student/payments/initiate` and
  `/:id/confirm` always answer 403 `PAYMENTS_AT_RECEPTION`; they let a student mark their own payment
  as paid. Payments are recorded by reception only.
- Groups: adding a student now enforces `maxStudents` everywhere (the CLO endpoint checked a field that
  did not exist); the CLO add no longer fails with a 500 after adding the student (it tried to create an
  enrollment with wrong field names); group "enrollments" counts now reflect real enrollments (always 0 before).
- Enrollments, payments and receipts: a payment and its receipt are one transaction; receipt numbers come
  from an atomic per-year counter (no duplicates); remaining amounts are always `total − paid`; deleting a
  bundle enrollment cascades to its sub-enrollments, so orphans can no longer block re-enrollment.
- Receipt PDFs are rendered on download (Puppeteer; `@sparticuz/chromium` on Vercel) — nothing on disk.
- Session reports: deducting hours, saving the report and closing the request are one transaction (the old
  code could deduct hours and then fail to save a report with a PDF); `pdfUrl` is now a working signed link.
