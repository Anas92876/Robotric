# Robotrick — public website

The design (layout, components, spacing, motion) comes from `../DESIGN.md`. Brand colors, fonts and business facts come from `../All Data Needed/`. **Page content comes from the live robotrick.net.** It was extracted from the site's own code, in English and Arabic, and is stored in `content/`.

## Run it

```
node build.mjs     # renders every page in English (dist/) and Arabic (dist/ar/)
node serve.mjs     # preview at http://localhost:5173
```

Upload the `dist/` folder to your host.

## Pages (each has its own content and layout)

| Page | Template | Content |
|---|---|---|
| Home | `src/pages/index.mjs` | `content/<lang>/home.json` |
| About | `src/pages/about.mjs` | `content/<lang>/site.json` → `about` |
| Training Programs | `src/pages/training.mjs` | `training-intro.json`, `training-map.json` |
| Technical Projects | `src/pages/technical-projects.mjs` | `technical-projects.json` |
| 3D Printing | `src/pages/3d-printing.mjs` | `3d-printing.json` |
| Technical Consultation | `src/pages/technical-consultation.mjs` | `technical-consultation.json` |
| Curriculum Design | `src/pages/curriculum-design.mjs` | `curriculum-design.json` |
| STEM Lab Setup | `src/pages/stem-lab-setup.mjs` | `stem-lab-setup.json` |
| Gallery | `src/pages/gallery.mjs` | `home.json` → `gallery`, `site.json` → `gallery.items` |
| Blog | `src/pages/blog.mjs` | `home.json` → `blog` (live blog has no posts yet) |
| Join Us / job page | `src/pages/join-us.mjs`, `job.mjs` | jobs load **live** from the backend |
| Contact | `src/pages/contact.mjs` | `home.json` → `contact` |
| Verify certificate | `src/pages/verify.mjs` | `site.json` → `verify` |

To change any text, edit the JSON file for that language and run `node build.mjs` again. Shared parts are in `src/layout.mjs` (header and footer), `src/lib.mjs` (helpers), `src/styles.css` and `src/script.js`.

## Backend (same server robotrick.net uses)

`CONFIG.apiBase` in `build.mjs` is `https://robotrick-backend-production.up.railway.app/api`. The site uses these endpoints:
- `POST /contact`: contact and consultation forms, with the same payload and validation rules as the live site.
- `GET /public/jobs` and `GET /public/jobs/:slug`: open positions (managed in the dashboard).
- `POST /jobs/apply`: applications, using the live field names (`fullName`, `experienceDetails`, `whyUs`, `skills` as a JSON array, `cv`…).
- `GET /certificates/verify/:NUMBER`: certificate lookup.

The backend must allow the new site's domain in CORS. It already allows `http://localhost:5173`.

## Data decisions (please confirm with the owner)

- **Students trained:** the live site says both 2,200+ and 2,600+. The number is left out until one is confirmed.
- **Years of experience:** the live site says "6" and "3". The site calculates it from the 2022 founding year instead.
- **Testimonials:** not shown. The owner brief marks them as unverified, and the same quote is used for two people.
- **English FAQ:** answers 1 and 4 differed from the Arabic. The Arabic version is used as the source, translated.
- **Achievements (2024–2025 Olympiad results):** from `All Data Needed/02`. They are not on the live site.
- **Gallery photo 4:** missing on the live server, so it is left out.
- **Job "Robotics Trainer":** some duties and perks have only Arabic text in the dashboard. Fill in the English fields there.
- **Photos:** converted to optimized WebP (40 MB down to about 8 MB).
