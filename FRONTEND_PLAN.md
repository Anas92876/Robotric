# Robotrick dashboard — plan

This app is now **the private dashboard only**. The public website (home, services,
gallery, blog, join us, contact, certificate check, login, sign up) is the separate
Next.js app in `C:\Users\Admin\Desktop\robo-design\robotrick-next`.

## How the two apps fit together

| Path | Served by |
|---|---|
| `/`, `/en/...`, `/ar/...`, and every other path | Public site (Next.js) |
| `/dashboard`, `/student`, `/trainer`, `/reception`, `/clo`, `/cto-internal`, `/engineer`, `/client`, `/admin`, `/orders`, `/projects`, `/competitions`, `/teams`, `/posts`, `/inventory`, `/my-tasks`, `/my-hours`, `/settings`, `/profile`, `/notifications`, `/dash-assets/...`, `/odom-map/...` | Dashboard (this app) |

- The list lives in `vite.config.ts` (`DASHBOARD_PATHS`). Keep it in sync with the
  production rewrites.
- Both apps are on one domain, so they share the login (`token` and `user` in the
  browser's localStorage).
- Not signed in → the dashboard sends you to `/en/login` (or `/ar/login`).
- After sign-in, the public site sends students to `/student` and staff to `/dashboard`.
- Every link from the dashboard to the public site goes through `src/lib/publicSite.ts`.

### Run both on your computer

```bash
# 1. public site (port 3100)
cd C:\Users\Admin\Desktop\robo-design\robotrick-next
npx next dev -p 3100

# 2. dashboard (port 3000) — open http://localhost:3000
cd C:\Users\Admin\Desktop\Robotric\Robotrick-Frontend-main
npm run dev
```

Always open **http://localhost:3000**. The dashboard forwards the public pages to
port 3100, so everything looks like one site.

### Deploying later (2 repos, 2 Vercel projects, one domain)

- **Public site project (owns robotrick.net)**
  - Add rewrites that send the dashboard paths above to the dashboard project.
  - Exclude those paths from its `proxy.ts` matcher; otherwise it adds `/en` in front of them.
  - Add the dashboard paths to `Disallow` in its `robots.ts`.
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

### L1 — Fix the real mismatches

1. **Session report:** `services/subscription.service.ts:377` calls
   `GET /reception/session-requests/:id/report`. The backend route is
   `GET /subscriptions/session-requests/:id/report`. This was already broken with the
   old backend.
2. **Engineer submission panel:** `components/cto/SubmissionPanel.tsx:57` calls
   `GET /engineer/tasks/:id`, which never existed; only the list exists. Either add that
   route to the backend or read the task from the list.
3. **Trainer groups:** `hooks/trainer/useTrainerGroups.ts:140,163` still has trainer
   create and update calls (`POST/PUT /trainer/groups`). Groups are CLO-only now;
   delete the dead code.
4. **Register:** `providers/AuthProvider.tsx:152` calls `POST /auth/register`, which is
   removed (registration happens at the company). Delete `register()`. The new
   design's **sign-up page calls it too**, so it can't work: hide it.
5. **Student payments:** `pages/student/StudentPayments.tsx` still has "pay now"
   (`/student/payments/initiate` and `/confirm`), which now returns 403 (students never
   pay in the app). Make the page read-only: history and receipts.

### L2 — One way to reach the backend

- `lib/api.ts` uses `VITE_API_BASE` (default `/api`, same domain, which is right).
- `utils/apiUrl.ts`, `hooks/common/useApi.ts`, `lib/socket.ts` and
  `services/socket.service.ts` use `VITE_API_URL` with `localhost:4889` or `:5000`
  fallbacks.
- Make everything use `lib/api.ts` and delete the rest.
- Production: the public-site project also rewrites `/api/*` to the backend, so the
  browser always talks to its own domain (no CORS, and the login cookie works).

### L3 — Switch off what the backend doesn't have yet

- **Sockets:** `SocketContext`, `lib/socket.ts`, `services/socket.service.ts`,
  `useRealtimeUpdates` and `AdminDashboard` connect to `/socket.io`, which doesn't
  exist. They would retry forever. Remove the provider for now.
- **Chat:** hide `ChatWidget` and the chat hooks.
- **Notifications:** hide the notification bell (`NotificationCenter`, `useWebNotifications`)
  and the reception notifications page (`/reception/notifications`, which calls
  `/reception/notifications/send`).

### L4 — Screens that must follow the new backend rules

- **Reception user form** (`components/reception/UserForm.tsx:358`): offers CLO / Admin /
  CTO roles, but only admins may create those now (the backend returns 403
  `PRIVILEGED_ROLE`). Show those roles to admins only.
- **Gallery and project photos:** these are private now, and each link expires after a
  short time. Don't cache links; reload them.
  `components/gallery/GalleryImageCard.tsx` builds Cloudinary thumbnails; remove that
  (the files are on Supabase now).
- **Inventory:** stock is now reserved when an order is placed and released on
  reject/cancel. Check that the stock screens show "available" and "reserved" correctly.
- **Deleting things still in use** (a part used in orders, a driver with students,
  a user with history) now returns 409 with a clear message. Show that message.
- **Uploads over about 4 MB** will fail on Vercel. Big PDFs need direct upload to
  Supabase (backend phase 10).

### L5 — Check it running (contract smoke test)

The route list only proves that the paths exist. It doesn't prove that each screen
reads the right fields. So:

1. Run the backend locally with the seed accounts.
2. Sign in as each role and call every GET the dashboard uses. Record any 4xx or 5xx.
3. Compare the fields each page reads with what comes back.
4. Then click through every page for each role and fix what breaks.

Only after L1–L5 does the dashboard **redesign** start (see the clean-up list below).

## Open questions for the owner

- **Sign up:** the new design has a sign-up page, but registration happens at the
  company. Hide it?
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
