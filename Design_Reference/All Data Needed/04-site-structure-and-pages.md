# Site Structure & Pages

Full list of public pages on the current site, with purpose and real copy. Use this as your sitemap starting point — you don't have to keep the exact URL structure, but every page/purpose below should have a home in the rebuild.

## Sitemap

| Page | Current URL | Purpose |
|---|---|---|
| Home | `/` | Full-funnel landing page: hero, about teaser, services, why-us, methodology, achievements, stats, programs teaser, testimonials, gallery teaser, FAQ, contact CTA |
| About | `/about` | Company story, vision, mission, values, "our space" photo gallery |
| Services overview | `/services` | Index of all 6 services |
| Training | `/services/training` | Full training catalog (see file 02) |
| Training → department detail | `/services/training/yearround/:deptIndex` | One of the 8 year-round departments, drilled in |
| Training → program detail | `/services/training/:trackId/:programIndex` | One specific program's full detail page |
| Technical Projects | `/services/technical-projects` | Custom robotics/automation/IoT service page |
| Technical Consultation | `/services/technical-consultation` | Lightweight consultation-booking funnel page |
| Curriculum Design | `/services/curriculum-design` | B2B/school curriculum service page |
| 3D Printing | `/services/3d-printing` | 3D printing service page |
| STEM Lab Setup | `/services/stem-lab-setup` | B2B/school lab-setup service page |
| Gallery | `/gallery` | Photo gallery, filterable by Training / Projects / 3D Printing / Competitions |
| Blog | `/blog`, `/blog/:slug` | Currently empty ("coming soon") — build fresh, no legacy content to migrate |
| Join Us (careers) | `/join-us`, `/join-us/:slug` | Job listings + application flow |
| Contact | `/contact` | Contact form + map + direct contact info |
| Certificate Verify | `/verify/:certNumber` | Public tool: look up a student certificate by number, confirm authenticity |
| Download App | `/download-app` | Auto-triggers Android beta app APK download |

Everything else (`/dashboard`, `/student/*`, `/trainer/*`, `/reception/*`, `/clo/*`, `/admin`, login, etc.) is the **internal LMS/CRM** — out of scope for this rebuild. The new public site does need a way to link **to** the login/dashboard for existing users (a "Login" link somewhere, likely in the header), even though you're not building that system.

## Home page — section by section (this is the highest-value page; get it right)

1. **Header/Nav** — Logo (language-specific), links: About Us / Services (dropdown of all 6) / Blog / Join Us / Contact Us, language switcher (AR/EN), primary CTA button ("Book Consultation"), Login link for existing dashboard users.

2. **Hero**
   - Badge: "Syria's Leading Robotics & Tech Hub" (AR: "المركز الرائد في سوريا للروبوتات والتكنولوجيا")
   - Headline: "Turn Curiosity" + emphasized "Into Innovation" (AR: "حوّل الفضول" / "إلى ابتكار")
   - Rotating/typing sub-headline options: "Launch into the Smart Future" / "Start Your Journey in Robotics" / "Launch by Building Educational Labs" / "Adopt Technology in Your Educational System"
   - Body: "At Robotrick, we build robotics solutions for education and industry, combining smart systems with advanced training for the next generation of innovators."
   - Primary CTA: "Book a Consultation"
   - Visual: 3D/animated robot hero image (see file 03)

3. **About teaser** — Badge "About Us" · "Syria's Complete **Robotics & Tech Solution**" · Body: "At Robotrick, we develop integrated robotic and technical solutions that combine education, design, and manufacturing. We provide ready-made and customized systems for educational and industrial institutions, alongside advanced training programs that prepare the next generation to lead digital transformation and technical innovation." · Links to full About page.

4. **Services grid** — Badge "What We Offer" · "Our Services" · all 6 services as cards with short description + feature bullets + link (see file 02 for full copy). Closing CTA: "Have a unique project in mind?" → "Get in Touch"

5. **Why Choose Robotrick** — Badge "Our Strengths" · 3–4 cards: Proven Excellence (track record + numbers) · Expert Team (trainers/engineers/designers) · Cutting-Edge Technology (latest tools/kits/printers) · Results-Driven Approach (tangible outcomes).

6. **Methodology / "The Robotrick Journey"** — 3-step process: **Learn Fundamentals** (electronics + coding basics, hands-on kits) → **Build Projects** (real robots/drones/smart systems, personal portfolio) → **Compete & Win** (elite teams, national/international tournaments).

7. **Achievements / "Proven Impact"** — Real competition results by year (see file 02). This is a trust/credibility section — keep it prominent, not buried.

8. **Social proof stats bar** — Big numbers: Students, Training Hours, Training Programs, Years of Experience, Projects, Technical Studies & Consultations. ⚠️ Reconcile exact figures with owner first (see file 09).

9. **Programs teaser** — Badge "6 Specialized Tracks" · "Our Training Programs" · category cards (Robotics/AI/VR/3D Printing/Drones/Web Dev/Competitions/Engineering Design) with age ranges → links into full Training page.

10. **Testimonials** — 3 quotes + stats block (see file 02/09 — verify these are real before reuse). "What Our Members Say" / "Opinions and Reviews." CTA: "Add Your Opinion."

11. **Team section** — ⚠️ Currently unmodified placeholder template data (fake names/bios). Needs real team info from the owner, or should be removed until available. See file 09.

12. **Gallery teaser** — "Our Work" — 3 photos → "View All Gallery" link to full gallery page.

13. **FAQ** — 5 Q&As (see file 02 for content; note EN/AR currently diverge on 2 of the 5 — reconcile, see file 09).

14. **Contact CTA banner** — "We Put Our Expertise at Your Disposal" / "Our Team is Ready to Help" — buttons: "Contact Us" and "Request Company Profile."

15. **Footer** — Logo, contact info (address/email/phone), quick links, services links, social icons (Facebook/Instagram/WhatsApp/LinkedIn), copyright.

## Other pages — key content notes

- **About page**: full founding story, vision/mission cards, 5 core values, "our space" photo slider. See file 01 for full copy.
- **Gallery page**: currently static/hardcoded (not a real CMS-backed gallery) — 17 categorized photos (Training/Projects/3D Printing/Competitions). Real photo files exist; consider making this properly dynamic/filterable in the rebuild.
- **Join Us page**: "Your Future Starts Here: Be Part of Our Team" — lists open positions, each with its own detail page. See file 02... actually see file 07 for the application-flow mechanics and file below for the actual job list, which belongs more to "content" than "services" — full listing is in the research notes; ask if you need the raw list re-supplied.
- **Contact page**: form (Name, Phone, Subject dropdown, Message) + WhatsApp quick-connect + embedded map + real contact details (file 05).
- **Certificate Verify page**: enter a certificate number → shows a formatted certificate preview with a verified/not-found result. Public trust feature — no login required.
- **Blog**: empty shell today, "coming soon" message. Build the *system* (categories, individual post pages, SEO metadata per post) but there's no legacy content to port.
- **Download App page**: simple auto-download landing page for an Android beta APK — low priority, minor page, `noindex`.

## Job listings currently open (real, for the Join Us page)

Page hero: "Your Future Starts Here: Be Part of Our Team" / "Join Robotrick and help shape the future of robotics and technology in Syria." How-to-apply (3 steps): (1) Review available positions, (2) Open the role page and apply, (3) "Send us your resume and tell us why you'd be a great fit for Robotrick."

Confirm with the owner which of these 6 are still actually open before publishing — job listings go stale fast.

1. **Robotics Trainer — Kids Category** (apply via WhatsApp) — "We're looking for a passionate trainer to teach kids the fundamentals of robotics and programming in a fun, interactive environment." Duties: Teaching, Class Management, Curriculum contribution. Requirements: experience teaching children, robotics/programming knowledge, high energy. Location: HQ — Baghdad Station.

2. **Robotics Trainer — Teens Category** (apply via WhatsApp) — "We're looking for a trainer to teach teens advanced robotics and engineering skills in an engaging way." Duties: Advanced Teaching, Competition Prep, Creative Projects supervision. Requirements: teen/engineering education experience, advanced robotics/programming level, group leadership. Perks: participation in international competitions.

3. **Mechatronics Engineer** (apply via WhatsApp) — "We're looking for a mechatronics engineer to develop and build integrated robotic systems." Duties: System Design, Programming (controllers/sensors), Technical Documentation. Requirements: mechatronics engineering degree or equivalent, Arduino/Raspberry Pi experience, CAD/3D printing skills a plus. Full time.

4. **Social Media Manager** (apply via WhatsApp) — "We're looking for a creative social media manager to grow and manage Robotrick's presence across all platforms." Duties: Platform Management, Content Creation, Community engagement. Requirements: social media management experience, creative writing/visual design, digital trends familiarity. Flexible hours. Perks: performance-based bonus.

5. **Content Creator** (in-site application form; marked "NEW") — "We're looking for someone passionate who sees the camera as an extension of their eyes — documenting every moment and turning it into inspiring content." Duties: Live Documentation (film workshops/daily ops), Creative Editing (Reels/Stories on mobile), Content & Ideas, Archive Management. Requirements: proficiency in CapCut/VN/InShot, cinematic eye. Work: 7 hrs/day, 1 day off/week. Location: HQ — Baghdad Station, Al-Shalal Street. Perks: reward system with periodic incentives.

6. **Robotics & Programming Trainer** ("Inspire The Next Innovators", in-site application form; marked "NEW") — "We're looking for an innovative trainer with the charisma of a mentor — someone who doesn't just teach technology, but inspires young minds to create, build, and explore." Duties: Hands-on Training (Scratch & Python), Classroom Management, Technical Supervision, Innovation & Learning. Requirements: engineering student/graduate (Mechatronics/Computer Engineering/Electronics), prior training experience with children/teens, Python/Scratch/sensors knowledge. Work: 5 morning hours/day, 1 day off/week. Location: HQ — Baghdad Station, Al-Shalal Street.

**Application form fields** (for in-site-apply roles): Full Name, Phone, Email (optional), Age, Gender, Location, Experience Level (None/Beginner/Intermediate/Professional), Experience Description, Skills (tags), Portfolio Link, Availability (Full/Part-time/Flexible), Why join us, Additional info, CV upload (PDF, max 10MB).
