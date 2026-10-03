# Open Decisions — resolve these before/while building

These are real gaps and inconsistencies found in the current live site's content. The developer should **not** silently copy them into the rebuild — they need a decision or real input from the business owner first. This file is written so both the owner and the developer can work through it together.

## 1. Fake team section — needs real data or should be cut

The current "Team" section shows unmodified template placeholder data: "Amélie Laurent — Founder & CEO," "Nikolas Gibbons — Engineering Manager," etc., with bios referencing Spotify, Figma, Linear, Coinbase — companies with zero connection to Robotrick. This is leftover from a UI template and was never replaced with real staff info.

**Decision needed:** Provide real team member names, titles, short bios, and headshots — or instruct the developer to remove the team section entirely for launch and add it later.

## 2. Testimonials — verify these are real, attributable, and consented

Three testimonials are shown (Ahmad AlHassan, Sara Mahmoud, Mohammed Ali), but the exact same quote ("Robotrick gave me the tools to turn my ideas into reality...") is also used, differently attributed, as a floating quote in the Hero section. This pattern suggests the content may be placeholder/seed data rather than genuinely collected customer feedback.

**Decision needed:** Confirm whether these are real customers who consented to being quoted publicly. If not, collect 3–5 real testimonials (with permission, ideally with a name + photo) before launch, or mark the section as "coming soon."

## 3. Inconsistent business stats across the current site

Different sections state different numbers for the same facts:

| Stat | Values found | Where |
|---|---|---|
| Years in business | "3 Years" / "3 years of delivering quality results" / "6 Years of Experience" | About section, Why Choose Us, Social Proof bar |
| Students trained | "2,200+" / "2,600+" / "2600 happy students" | Services section, Social Proof bar, Testimonials |
| Founded year | 2022 (most authoritative, from About page SEO + story) | AboutPage |

**Decision needed:** Pick one accurate, current set of numbers (as of today) and use it consistently everywhere. Suggested approach: agree on founded-year (2022) as fixed, then recompute "years in business" live (don't hardcode a number that goes stale), and get one verified current total for students trained.

## 4. FAQ — Arabic and English answers don't match on 2 of 5 questions

- Question 1 ("What services does Robotrick offer?"): the English answer only mentions training/projects/3D printing; the Arabic answer additionally mentions curriculum design, STEM lab setup, and technical consultation for universities — a materially different (more complete) answer.
- Question 4: the English version asks about 3D printing materials; the Arabic version asks an entirely different question about graduation/innovation project support. These aren't translations of each other.

**Decision needed:** Decide the real, complete answer to each FAQ in one language, then have it properly translated into the other — don't let the two language versions drift into different content again.

## 5. No published pricing — confirm this is intentional

Every service page routes to "contact us" / "book a consultation" with no visible price ranges, not even indicative "starting from" figures. This is common for consultation-driven B2B services (curriculum design, STEM lab setup, custom projects) but less common for consumer training programs, where many competitors do show at least a price range to reduce friction for parents comparing options.

**Decision needed:** Confirm whether to keep everything quote-based, or publish at least indicative pricing/ranges for the more standardized offerings (e.g., year-round training program levels) to reduce drop-off from price-shopping parents.

## 6. Missing real case studies for Technical Projects

The Technical Projects page shows three generic example categories (Industrial Automation, Smart Agriculture, Educational Robotics) with no named, real client work shown.

**Decision needed:** Can the owner share 2–4 real completed projects (with client permission if needed) — photos + a short problem/solution description — to replace the generic categories? This meaningfully strengthens the B2B trust case.

## 7. Job listings — confirm which are still actually open

Six job postings currently exist on the site. Job listings that stay up after a role is filled damage trust and waste applicants' time.

**Decision needed:** Confirm current status of: Robotics Trainer (Kids), Robotics Trainer (Teens), Mechatronics Engineer, Social Media Manager, Content Creator, Robotics & Programming Trainer.

## 8. Missing assets

- `og-image.jpg` (social share preview image) is referenced in meta tags but doesn't exist as a file — needs to be designed (1200×630px).
- Confirm whether the `@robotrick_net` Twitter/X account referenced in meta tags is real/active before linking it anywhere visible.
- The "Summer — Comprehensive Tech Club for Teens" program was marked "coming soon"/unavailable — confirm current availability.

## 9. Bilingual URL strategy for SEO

The current site claims (via `hreflang` tags) that Arabic content lives at `robotrick.net/ar`, but no such URL actually exists — language switching is client-side only, with no distinct crawlable Arabic URL. This likely hurts Arabic-language search visibility, which matters a lot given the primary local market is Arabic-speaking.

**Decision needed:** Discuss with the developer whether to invest in real separate URLs per language (better long-term SEO, more setup work) or accept the toggle-only approach short term (less work, weaker Arabic SEO).
