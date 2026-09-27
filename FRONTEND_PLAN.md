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
