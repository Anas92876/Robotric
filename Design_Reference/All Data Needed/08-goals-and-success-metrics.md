# Goals & Success Metrics — what "a good result" means

The site's job is not to look impressive in a portfolio — it's to **generate revenue for a real, operating business**. Every design/content/UX decision should be weighed against: *does this make it more likely a visitor becomes a lead or a customer?*

## The four conversion paths (in rough priority order)

1. **Program enrollment inquiries (B2C, highest volume)** — a parent or student decides to try a training program. Primary CTAs: "Book a Consultation," "Enroll Now," WhatsApp program-inquiry messages, free trial session bookings. This is the volume business — optimize the training pages and program browsing experience hardest.
2. **Consultation / project inquiries (B2B/B2C, higher value, lower volume)** — a business or individual wants a custom technical project, 3D printing job, or technical consultation. Primary CTA: contact form (`/api/contact`) and "Book a Consultation."
3. **Institutional partnerships (B2B/B2G, highest value, lowest volume, longest sales cycle)** — a school wants a STEM lab built or a curriculum designed. These visitors need more trust-building (credentials, results, process clarity) before they'll reach out — the Curriculum Design and STEM Lab Setup pages should read as serious B2B sales pages, not just another service card.
4. **Recruiting (Join Us)** — lower priority commercially, but still real: open roles need visibility and an easy apply flow.

## What makes visitors trust us enough to convert

- **Real competition results** (National Robotics Olympiad, WRO) — concrete, dated, verifiable. Feature prominently, don't bury.
- **Certificate verification** — signals the training is credentialed and taken seriously.
- **Real photos of the actual lab/students/competitions** (not stock photography) — see file 06.
- **Clear, honest process explanations** (the 4-step STEM lab process, the 5-phase curriculum methodology, the 5-step project journey) — B2B buyers especially want to see a competent process before they'll commit budget.
- **Fast, low-friction contact** — WhatsApp as a first-class channel (not buried), a short contact form, clear phone/email/hours.

## What to actively fix versus the current site (these are real gaps, not just nice-to-haves)

- **No event-level conversion tracking today** — the owner currently can't tell which page/CTA/channel drives leads. Wire up analytics events for form submits, WhatsApp clicks, and program-page visits so this can be measured and improved over time (see file 07).
- **No real named case studies on Technical Projects page** — B2B buyers convert better with 2-3 concrete "here's a real problem we solved" stories than generic category cards. Push the owner for these (file 06).
- **Fake team section currently live** — this actively hurts trust if a visitor notices unrelated Silicon Valley names/bios. Fix before launch (file 09).
- **No published pricing anywhere** — intentional (consultation-based sales), but make sure the "contact us to get a quote" path is as frictionless as possible since it's carrying 100% of the commercial weight; a clunky contact form here directly costs revenue.
- **Inconsistent stats** (years in business, student counts) across sections erode credibility on close reading — get one reconciled set of numbers from the owner and use it everywhere (file 09).

## A simple way to think about priority while building

If you have to cut scope, keep — in order: (1) Home page hero + services + contact/WhatsApp working end-to-end, (2) Training program pages (the volume driver), (3) About + Achievements (the trust layer), (4) the two B2B service pages (Curriculum Design, STEM Lab Setup), (5) Contact page + certificate verify, (6) Gallery, Join Us, Blog (lower commercial urgency, can follow after launch).
