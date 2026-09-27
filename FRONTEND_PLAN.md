# Robotrick dashboard — plan

This app is now **the private dashboard only**. The public website (home, services,
gallery, blog, join us, contact, certificate check, login, sign up) is the separate
Next.js app in `C:\Users\Admin\Desktop\robo-design\robotrick-next`.

## How the two apps fit together

| Path | Served by |
|---|---|
| `/`, `/en/...`, `/ar/...`, and every other path | Public site (Next.js) |
| `/dashboard`, `/student`, `/trainer`, `/reception`, `/clo`, `/cto-internal`, `/engineer`, `/client`, `/admin`, `/orders`, `/projects`, `/competitions`, `/teams`, `/posts`, `/inventory`, `/my-tasks`, `/my-hours`, `/settings`, `/profile`, `/notifications`, `/dash-assets/...`, `/odom-map/...` | Dashboard (this app) |

- The public site is the **front door** for the whole domain. It forwards the
  dashboard paths to this app. The list lives in the public site's `lib/dashboard.ts`
  (`DASHBOARD_PATHS`); add new top-level dashboard routes there.
- Both apps are on one domain, so they share the login (`token` and `user` in the
  browser's localStorage).
- Not signed in → the dashboard sends you to `/en/login` (or `/ar/login`).
- After sign-in, the public site sends students to `/student` and staff to `/dashboard`.
- Every link from the dashboard to the public site goes through `src/lib/publicSite.ts`.

### Run both on your computer

Three terminals:

```bash
# 1. backend (port 4889)
cd C:\Users\Admin\Desktop\Robotric\Robotrick-Backend-main
npm run dev

# 2. dashboard (port 5173, behind the front door)
cd C:\Users\Admin\Desktop\Robotric\Robotrick-Frontend-main
npm run dev

# 3. public site = front door (port 3000) — open http://localhost:3000
cd C:\Users\Admin\Desktop\robo-design\robotrick-next
npm run dev
```

Always open **http://localhost:3000**. The public site serves its own pages, sends
`/api` to the backend and forwards dashboard paths to the dashboard on 5173. Don't
open 5173 directly: the login is only shared on the same address.

Accounts: `<role>@robotrick.test` from the backend seed (the password is in the
backend's `src/shared/db/seed.ts`). Demo data: in the backend, run
`npx tsx scripts/demo-data.ts`; `--remove` deletes it.

### Deploying later (2 repos, 2 Vercel projects, one domain)

- **Public site project (owns robotrick.net)**
  - Already forwards the dashboard paths (`lib/dashboard.ts`, `next.config.ts`),
    skips them in `proxy.ts`, and keeps them out of `robots.txt`.
  - Set `DASHBOARD_ORIGIN` to the dashboard deployment's URL, and
    `NEXT_PUBLIC_API_BASE` to the backend.
- **Dashboard project**
  - `vercel.json` already sends every page to `index.html`.
  - The dashboard's pages say `noindex`, so Google won't index them.

## Done (step 1)

- Removed the old public pages, the old login and register pages, and their parts
  (landing header, footer, 3D robot, carousels, SEO tags).
- Removed the unused packages: Spline, three.js, embla carousel, moment.
- Removed about 50 MB of public-site images.
- `index.html` is now a small `noindex` dashboard shell (no Google Analytics).
- Deleted `RequireAuth` / `RequireRole`: they were broken and unused.
- The production build now really removes `console.*` calls. The old setting was
  invalid and did nothing.

## Linking plan (dashboard ↔ new backend)

Run `npm run api:check` to compare every API call in `src/` with the routes the
backend serves. Result on 2026-09-27:

| | Count |
|---|---|
| API calls in the dashboard | 447 (384 distinct) |
| Match a backend route exactly | **433** |
| Chat / notifications (postponed on purpose) | 5 |
| Look wrong, but are fine (query string glued to the path, or a variable base path) | 4 |
| **Real mismatches** | 5 (below) |

The login contract already matches: `POST /auth/login` returns `data.token` plus the
user, and both this app and the new login page read it that way. Errors keep
`message` and `error.message`, and `lib/api.ts` reads both.

### L1 — Fix the real mismatches ✅ Done

1. **Session report:** reception's "View report" called a route only students have.
   It now picks the report from `/reception/session-reports`, which it already loads.
   This was broken with the old backend too.
2. **Engineer submission panel:** it called `GET /engineer/tasks/:id`, which never
   existed. It now uses the submission that every task list already includes.
3. **Trainer groups:** removed the trainer create, edit and delete group code, plus
   `TrainerCreateGroup` and `EditGroupModal`. Groups are CLO-only.
4. **Register:** removed `register()` from `AuthProvider`. In the new design, the
   sign-up page is hidden: `/en/signup` and `/ar/signup` go to login, and the links
   are gone. `SignupForm` is kept.
5. **Student payments:** removed the pay and confirm code and both payment modals.
   The page shows history and receipts only.

`npm run api:check` now reports only the 4 known false alarms and the 5 postponed
chat/notification calls.

### L2 — One way to reach the backend ✅ Done

- `lib/api.ts` (`VITE_API_BASE`, default `/api` on the same domain) is the only
  client. `useApi.ts` and `utils/apiUrl.ts` are gone. `.env.example` documents the one
  setting.
- The public site now calls `/api` from the browser too, and its `next.config.ts`
  rewrites that to the backend (`NEXT_PUBLIC_API_BASE`). There's no CORS, and both
  apps share the login. Pages that fetch on the server (jobs, certificate check) still
  use the full URL. For local work, `.env.local` points at `http://localhost:4889/api`.

### L3 — Switch off what the backend doesn't have yet ✅ Done

Removed (restore from commit `27bfc2b` when the realtime phase starts):
- the socket provider and client
- the chat widget and chat hooks
- the notification bell
- the reception notifications page and its sidebar link
- the live-update hooks (dashboard, orders, projects, competitions, teams,
  inventory) and the admin dashboard's socket listeners

`socket.io-client` and `js-cookie` are uninstalled.

### L4 — Screens that must follow the new backend rules ✅ Done

- **Reception user form:** the admin, CLO and CTO roles are shown only to admins
  (other users see them disabled when editing such an account).
- **Gallery card:** uses the signed links as they are; the Cloudinary thumbnail
  rewriting is gone.
- **Inventory:** reserved (ordered) items count in the total, and the parts list's
  `imageUrl` is used.
- **409 "still in use" messages** already show: `lib/api.ts` puts every backend
  error message into a pop-up.
- **Uploads over about 4 MB** remain a backend phase 10 item (direct upload to
  Supabase).

### L5 — Check it running

1. ✅ Backend runs locally with the seed accounts (`<role>@robotrick.test`).
2. ✅ Signed in as each role, every GET the dashboard makes without an ID was
   called: 91 of 92 return 200. The other one, `enrollments/check`, needs
   parameters, and the form always sends them.
   This check found two **backend** bugs, both fixed in backend commit `8d06112`:
   - The server froze: the database driver's pipelining through Supabase's pooler
     hung parallel queries, and then everything else.
   - Leads stats crashed on a date passed inside raw SQL.
3. ⏳ Every page opened in headless Chrome as its role. Results are in the section below.

Only after L1–L5 does the dashboard **redesign** start (see the clean-up list below).

## Open questions for the owner

- **Google Maps key:** it's written in `src/pages/reception/TransportManagement.tsx`.
  Restrict it in Google Cloud to robotrick.net and localhost, and move it to `.env`.

## Clean-up list (next steps)

1. **One data layer:** one API client (drop `hooks/common/useApi.ts` and its separate
   `VITE_API_URL`), one API file per feature, and React Query hooks. 42 pages and 21
   components call the API directly today.
2. **Feature folders:** group code by feature, not by role; share the copied CLO and
   trainer pages (sessions, tasks, gallery, project detail).
3. **Split the giant pages:** EnrollmentManagement (≈2,000 lines, 42 `useState`),
   TransportManagement, CLOCourses, CLOTrainingContent.
4. **One role table:** it should drive the routes, the sidebar and each role's home page
   (today it's a long `if (role === …)` block in `App.tsx`).
5. **Types:** fix the 464 type errors, then make `npm run build` run `tsc`
   (774 uses of `any`).
6. **Unused dashboard files to delete:**
   - `components/clo/index.ts`
   - `components/index.ts`
   - `components/evaluation/DetailedEvaluationForm.tsx`
   - `components/navigation/UserDropdown.tsx`
   - `components/stock/StockDetailsModal.tsx`
   - `components/student/MaterialCard.tsx`
   - `components/trainer/EditGroupModal.tsx`
   - `components/ui/ThemeToggle.tsx`
   - `pages/student/StudentAttendance.tsx`
   - `utils/cssAnimations.ts`
   - `utils/imageOptimization.ts`
   - `utils/throttle.ts`
7. **Translations:** move the few keys the dashboard still reads from the public
   namespaces (`home`, `training`) into the dashboard namespaces, then delete the
   public ones.
8. **One date library** (keep date-fns or dayjs).
9. **Split the 1.1 MB vendor bundle.**
10. **Hide chat and notifications** until the mobile phase.
11. **Link to the new backend.**
