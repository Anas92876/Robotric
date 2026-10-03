# Technical Integration Notes

You're building the frontend from scratch, but it still needs to talk to Robotrick's **existing backend** for a handful of real, live features. You are not building or modifying the backend — just calling these existing public endpoints. Ask the owner for the production API base URL and any CORS allowlisting you'll need added for your new site's domain.

## Public API endpoints that already exist and work

| Feature | Method & path | Notes |
|---|---|---|
| Contact form submission | `POST /api/contact` | Body validated server-side (`submitContactSchema`). Fields: name, phone, subject, message. This is how contact-page and "book a consultation" leads land in the internal CRM (Reception's Lead/Contact management dashboard) — **this integration is business-critical**, don't reinvent it with a mailto: link or third-party form service. |
| Job application submission | `POST /api/jobs/apply` | Multipart form, optional `cv` field (PDF upload). Public, no auth. |
| Certificate verification | `GET /api/certificates/verify/:certNumber` | Public, no auth. Powers the `/verify/:certNumber` page — look up a certificate, render verified/not-found. |
| Blog posts (published, public) | `GET /api/posts` (list), `GET /api/posts/slug/:slug` (single) | Public read-only; posts are created/edited by staff through the internal dashboard (roles: editor/admin/superadmin/reception/social), not by the public site. Your job is just to render them. |

All of these are mounted under `/api/...` behind a rate limiter (`apiLimiter`) — expect standard rate limiting on repeated submissions, that's intentional (anti-spam), not a bug.

## What this means for your build

- **Contact form and consultation-booking CTAs must POST to the real `/api/contact` endpoint** so leads flow into the business's actual CRM. This is the single most important integration on the whole site — it's how inquiries turn into revenue.
- **Job applications** should hit `/api/jobs/apply` so HR/reception sees them in the existing system.
- **Certificate verification page** is a thin wrapper around `/api/certificates/verify/:certNumber` — no business logic needed on your end.
- **Blog** can be built as a normal client fetching `/api/posts` — treat it as a standard headless-CMS-style read API. There is currently zero content in it, so you won't see real posts until staff publish some.
- **Everything else on the public site (services, programs, team, gallery, testimonials, FAQ) is static/marketing content** — it does not need a backend API call in the current implementation, though you're free to make it CMS-driven in your rebuild if that helps the owner keep it updated without a developer.
- The internal dashboard has a completely separate `/api/auth/...` login system — you only need a **link** to the login page for existing students/staff, not an integration.

## SEO / meta already established (carry these forward, they're correct and already indexed)

- Title: `Robotrick | Robotics & Technology Company in Syria`
- Meta description: "Robotrick is a professional robotics and technology company in Aleppo, Syria. We provide robotics training, technical projects, 3D printing, STEM lab setup, and technical consultation."
- Keywords: robotics, technology, Syria, Aleppo, arduino, AI, 3D printing, STEM, technical projects, consultation
- Canonical: `https://www.robotrick.net`
- `theme-color`: `#003300`
- Organization JSON-LD (schema.org): name Robotrick, url, logo, description, address (Aleppo, SY)
- Twitter card: `@robotrick_net`, `summary_large_image`
- Google Analytics: `G-JZZ5RPMDBG` (confirm reuse with owner)

**Known bug to actually fix, not carry forward:** the current site declares `hreflang="ar"` pointing at `https://www.robotrick.net/ar`, but no such URL actually exists — the language switch is a pure client-side toggle with no distinct Arabic URL. This is invisible SEO damage (search engines may be crawling a 404/duplicate). In your rebuild, either (a) give Arabic real distinct URLs (e.g. `/ar/...` or a subdomain) and drop the client-side-only toggle, or (b) remove the incorrect hreflang tags. Pick (a) if you want proper bilingual SEO — it's the more correct long-term approach for a bilingual business trying to rank in both Arabic and English search.

- **`og-image.jpg` referenced in meta tags does not actually exist in the current codebase** — social share previews have likely been broken. Make sure your rebuild actually ships a real 1200×630 OG image.

## Performance patterns worth keeping

- Split font loading: Arabic web fonts (Cairo/Tajawal) only load when the visitor's language is Arabic; English-only visitors never download them. Saves meaningful weight.
- A static "app shell" (nav + spinner) is inlined directly in `index.html` so something paints before JS/React even loads — avoids a blank white screen on slow connections. Worth doing for this audience: expect a meaningful share of visitors on slower mobile connections in the region.
- LCP (largest contentful paint) images are `<link rel="preload">`'d per-breakpoint (different image preloaded for mobile vs desktop hero).

## Analytics / conversion tracking

Only Google Analytics (GA4) is currently wired up, tracking pageviews generically. There is **no event-level conversion tracking** (e.g., no distinct event for "contact form submitted," "WhatsApp clicked," "program enrolled"). Given the business goal is lead generation (see file 08), set up real conversion events in your rebuild — this is a gap in the current site that's actively costing the owner visibility into what's working.
