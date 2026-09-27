# Robotrick — public website (Next.js)

Built with **Next.js 16** (App Router), **React 19** and **TypeScript**. The design follows `../Design_Reference/DESIGN.md`. Brand colors, fonts and business facts come from `../Design_Reference/All Data Needed/`. All page text comes from the live robotrick.net and is stored in `content/en` and `content/ar`.

## Run it

```bash
npm install          # first time only
npm run dev          # development: http://localhost:3000
npm run build        # production build
npm start            # serve the production build (use `npm start -- -p 3100` if port 3000 is busy)
```

Optional settings: copy `.env.example` to `.env.local` and change the values (API address, Google Analytics ID and so on).

## How it's organized

```
app/[lang]/               one folder per page; every page exists in /en and /ar
  layout.tsx              <html lang/dir>, fonts, header, footer, animations, GA
  page.tsx                Home
  about/ training/ technical-projects/ 3d-printing/ technical-consultation/
  curriculum-design/ stem-lab-setup/ gallery/ blog/ contact/
  join-us/  join-us/[slug]/      jobs, loaded live from the backend (refreshed every 5 min)
  verify/   verify/[cert]/       certificate check, done live on the server
  login/    signup/              sign in (with forgot password) and create account, on the real backend
app/fonts/                Inter + Cairo, self-hosted (builds never depend on Google Fonts)
app/sitemap.ts, app/robots.ts
components/               Header, Footer, Motion (animations), forms, Training map, Gallery…
content/en, content/ar    ALL the text. Edit these JSON files to change wording.
lib/                      config (phone, links, API), content loader, icons, SEO metadata
proxy.ts                  sends visitors without /en or /ar to the right language (browser setting)
public/images             real Robotrick photos and logos (optimized WebP)
```

## Languages

- Every page has a real URL in each language: `/en/...` and `/ar/...`.
- Arabic pages use right-to-left layout and the Cairo font. English visitors never download Cairo.
- Each page tells search engines about its other-language version (hreflang), so the old site's broken `/ar` link is fixed.
- Old robotrick.net links still work. For example, `/services/training` goes to `/en/training`, and `/join-us/<slug>` and `/verify/<number>` get a language prefix.

## Backend

The site uses the same backend as robotrick.net (`NEXT_PUBLIC_API_BASE`):
- `POST /contact`: the contact and consultation forms.
- `GET /public/jobs` and `GET /public/jobs/:slug`: open positions.
- `POST /jobs/apply`: applications, using the live field names.
- `GET /certificates/verify/:NUMBER`: certificate lookup.

The backend must allow the new site's domain in CORS for the forms. Jobs and certificates are fetched on the server, so they don't depend on CORS.

## Icons

All icons come from the **react-icons** library, mapped in one place (`lib/icons.tsx`):
- **Interface icons** use the Lucide set (`react-icons/lu`).
- **Brand logos** (WhatsApp, Facebook, Instagram, LinkedIn) use Font Awesome 6 (`react-icons/fa6`).
- **The drone** uses the Tabler set (`react-icons/tb`), because Lucide doesn't have one.

In components, use `<Icon name="…" />`. To add an icon, import it in `lib/icons.tsx` and give it a name.

## Sign in and sign up

- `/en/login` and `/en/signup` (and the `/ar/` versions) use the same account system as the dashboard:
  - `POST /auth/login`
  - `POST /auth/register`
  - the forgot-password flow: `/auth/forgot-password/request`, then `/auth/forgot-password/confirm`
- After a successful sign-in, the session is stored the way the dashboard expects: `token` and `user` in the browser's localStorage.
- Students are then sent to `/student` and everyone else to `/dashboard`.
- Set `NEXT_PUBLIC_DASHBOARD_URL` if the dashboard lives on another domain. Browser storage is per domain, so the smoothest setup serves the dashboard on the same domain.
- Both pages are marked `noindex`, so they don't appear in search results.

## Deploy

- **Vercel:** import the folder and deploy. No settings are needed.
- **Any Node host:** run `npm run build`, then `npm start`.

## Content decisions to confirm with the owner

- **Students trained:** the live site shows two different numbers (2,200+ and 2,600+), so the count is left out.
- **Years of experience:** calculated from the 2022 founding year.
- **Testimonials:** not shown, because they are unverified.
- **English FAQ:** answers 1 and 4 are aligned with the Arabic version.
- **Achievements:** taken from `All Data Needed/02`.
- **Robotics Trainer job:** some duties and perks exist only in Arabic in the dashboard. Fill in the English fields there.
