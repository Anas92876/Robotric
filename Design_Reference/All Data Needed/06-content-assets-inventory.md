# Content Assets Inventory

What real media already exists (ask the owner to hand these over as files, don't recreate them), and what's genuinely missing.

## Already exists — reuse these

All paths below are relative to `Robotrick-Frontend/public/` in the current codebase — ask the owner to export/copy this folder to you directly rather than re-deriving it from the live site.

- **Logos:** `logo.png`, `assets/logo.png`, `images/header/header-logo-en.{png,webp}`, `images/header/header-logo-ar.{png,webp}` (separate Arabic lockup), `favicon.png`
- **Hero robot mascot image** ("Lori"): `lori.png`, `lori.webp` — used as the mobile hero visual
- **About page photos:** `images/about/` — 6 real lab/facility photos
- **Job listing photos:** `images/job/` — `image.png` (hero) + 4 numbered photos
- **Service icons/photos:** `images/services/3d-printing.png`, `images/services/tech.png`
- **Training category photos:** `images/training/image-drone.jpeg`, `image-eng.jpeg`, `image-kids.jpeg`, `image-vr.jpeg`
- **General gallery photos:** `images/image-1.jpg` through `image-17.jpg` (17 real photos — training sessions, competitions, team, projects, 3D prints)
- **Icon set** (line icons for stats/features): `icons/3d-printer.png`, `biotechnology.png`, `calendar.png`, `clock.png`, `consulting.png`, `evaluation.png`, `learning.png`, `project-management.png`, `student.png`, `task-management.png`, `teach.png`
- **Certificate assets:** `assets/bg-paper.jpg`, `bottom-corner.png`, `corner.png`, `sig1-nour.png`, `sig1.png`, `sig2.png`, `stamp-new.png`, `stamp.png` — real signature/stamp graphics used to render official certificates
- **Video:** `images/video.mp4` (context/usage not confirmed — check with owner what this shows)
- **Android beta app:** `beta-app.apk`

## Missing / needs to be sourced fresh from the owner

- **`og-image.jpg`** — referenced in the current site's meta tags (`https://www.robotrick.net/og-image.jpg`) but the file does not actually exist in the codebase. The social-share preview image has likely never worked. Needs a real 1200×630 image designed for this.
- **Real team photos and bios** — the current "Team" section uses unmodified placeholder/template data (fake Silicon Valley names and bios). See file 09 — get real names, titles, and headshots from the owner.
- **Real, attributable testimonials** — current testimonials read as plausible but unverified/possibly seed content (a suspiciously identical quote is reused for two different "people" in two different sections). Ask the owner for actual parent/student/client quotes with permission to publish, ideally with names and (with consent) photos.
- **Real project case studies** — the Technical Projects page currently shows generic example categories (Industrial Automation, Smart Agriculture, Educational Robotics) with no actual named client work. If Robotrick has completed real projects that can be shown publicly, get 2–4 real case studies (photos + a sentence on the problem/solution) — this is much stronger than generic category cards for a B2B trust page.
- **Blog content** — currently zero posts exist. Not urgent for launch, but plan the content system.

## Fonts, colors, external services

- Fonts: Inter (Latin), Cairo/Tajawal (Arabic) — see file 03.
- Google Analytics ID: `G-JZZ5RPMDBG` — confirm with owner whether to keep using it.
- No CMS currently backs the gallery or the static content — it's all hardcoded in the current codebase. If reuse/scale matters (frequent new photos, new testimonials, new blog posts), consider giving the owner a lightweight CMS or admin panel instead of hardcoding again, since they'll want to keep this fresh without needing a developer each time.
