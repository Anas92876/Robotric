# Brand Identity & Design

## Colors

| Role | Value | Notes |
|---|---|---|
| Primary — dark green | `#003300` | Main brand color. Used for header/nav background, headings, `theme-color` meta tag. |
| Accent — cream/khaki gold | `#cccc99` | Secondary brand color. Used for text-on-dark, highlights, card borders/glass effects. |
| Background — off-white/cream | `#f5f5dc`-ish / `#ffffcc` (dropdown bg) | Light sections. |
| Deep background gradient (premium dark sections) | `linear-gradient(135deg, #001a00 0%, #003300 50%, #001f00 100%)` | Used for hero/feature sections that need a premium, techy feel. |

Card/glass patterns used consistently across the current site (carry the *feel*, not necessarily the exact CSS, into your rebuild):
- Gold glass card: `rgba(204,204,153,0.07)` fill, `rgba(204,204,153,0.2)` border.
- Dark card: `rgba(0,30,0,0.8)` fill, `rgba(204,204,153,0.15)` border.
- Text on dark: primary `#cccc99`, muted `rgba(204,204,153,0.75)` / `rgba(204,204,153,0.6)`.

**Do not use pure black-green `#001a00` as a photo overlay** — it reads muddy on photos. Use near-black `rgba(10,10,10,...)` instead when darkening a background photo.

## Logo & favicon

Real logo files exist and should be reused or used as the reference for a redrawn version:
- `Robotrick-Frontend/public/logo.png` — general logo
- `Robotrick-Frontend/public/images/header/header-logo-en.png` / `.webp` — English header logo
- `Robotrick-Frontend/public/images/header/header-logo-ar.png` / `.webp` — **Arabic header logo is a distinct asset**, not just the English one mirrored — the brand maintains separate EN/AR logo lockups.
- `Robotrick-Frontend/public/favicon.png`

## Typography

- **Latin (English) font:** Inter (weights 400/600/700/900), loaded from Google Fonts.
- **Arabic font:** Cairo and/or Tajawal, loaded only when the site language is Arabic (keeps English-only visitors from downloading unused Arabic font weight sets).
- This split-loading approach is a real performance optimization worth keeping in any rebuild — don't force-load Arabic web fonts for English visitors.

## Tone of voice

- Confident, mission-driven, slightly aspirational — "turn ideas into reality," "from spectator to creator," "society that creates technology, not just consumes it."
- Grounded in real proof, not just hype: always pairs bold claims with concrete numbers/results (competition placements, hours trained, certificate counts).
- Bilingual by design, not translation-as-afterthought — Arabic is the primary emotional register (the founding story reads more personally in Arabic); English should feel like a faithful, not literal, translation.
- Avoid generic "kids coding camp" cuteness — the brand explicitly positions itself as *academically rigorous*, not a toy/entertainment brand.

## RTL (right-to-left) requirement — non-negotiable

The site **must** fully support Arabic RTL layout, not just translated strings:
- Arabic is read right-to-left: navigation, icon direction, card layouts, form field order, and margins/padding all need to mirror correctly.
- The current codebase's convention: use the CSS `dir="rtl"|"ltr"` attribute on containers wherever possible (lets the browser handle mirroring automatically) rather than manually reversing flex directions everywhere. This is simpler to get right than per-element overrides.
- Icons that imply direction (arrows, chevrons) must flip in RTL.
- Number formatting, dates, and phone number display should stay LTR even inside RTL text (this is standard practice — Arabic text with embedded Latin numerals/phone numbers doesn't reverse the digits).
- Language switching in the current site is a **client-side toggle**, not a separate URL path (i.e., there's no real working `/ar` route despite an `hreflang` tag claiming one — see file 07 for this SEO inconsistency to fix in the rebuild).

## Visual style patterns from the current site (for inspiration/consistency, not literal reuse)

- **Grid texture overlay** on dark hero/feature sections (a very subtle 1px grid line pattern) plus soft radial "glow orb" accents — gives a techy, lab-like premium feel without being loud.
- **Staggered card entrance animations** (cards fade/slide up as you scroll, offset by ~0.15s each) and **hover lift** (`translateY(-8px) scale(1.02)`) on interactive cards — used throughout.
- **Two design registers** exist in the current app: a "premium dark" register (`#001a00`→`#003300` gradients, gold-on-dark text) for public/marketing pages, and a "clean white card" register for the internal student dashboard. Your rebuild is exclusively public-facing, so lean into the **premium dark + gold accent** register — it's the outward-facing brand identity.
- 3D/interactive hero element: current site uses a Spline 3D robot scene on desktop and falls back to a static robot image (nicknamed "Lori") on mobile for performance. A strong visual "hero robot" moment is part of the brand's first impression — worth preserving in spirit even if you build it differently (e.g., a lighter WebGL/Lottie/video alternative for performance).

## Real photography exists — see file 06

There are real photos from the physical lab, training sessions, and competitions already available (not just stock/AI images). Use these as the visual backbone of the new site rather than defaulting to generic stock photography — they're a credibility asset.
