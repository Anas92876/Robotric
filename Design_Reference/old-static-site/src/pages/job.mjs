// Job position page — job.html?slug=<slug>. The role is loaded from GET /public/jobs/:slug (same as robotrick.net).
// The application form posts multipart data to /jobs/apply with the live site's exact field names and values.
export const file = 'job.html';

export function render(ctx) {
  const { s, esc, icon } = ctx;
  const t = s.job;
  const f = t.form;

  const body = `
    <section class="page-hero">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">${esc(s.nav.home)}</a><span>/</span><a href="join-us.html">${esc(s.nav.joinUs)}</a><span>/</span><span data-job-crumb>${esc(t.positionPage)}</span></nav>
      </div>
    </section>

    <section class="section section--tight">
      <div class="container">
        <div data-job data-lang="${ctx.lang}"
          data-label-duties="${esc(t.duties)}" data-label-requirements="${esc(t.requirements)}" data-label-perks="${esc(t.perks)}" data-label-details="${esc(t.details)}"
          data-label-apply-now="${esc(t.applyNow)}" data-label-apply-whatsapp="${esc(t.applyWhatsapp)}" data-wa-message="${esc(t.whatsappMessage)}"
          data-label-new="${esc(s.join.new)}" data-label-not-found="${esc(t.notFound)}" data-label-not-found-lead="${esc(t.notFoundLead)}" data-label-all="${esc(t.allPositions)}">
          <p class="jobs__status">${esc(s.join.loading)}</p>
        </div>

        <form class="card form job-form" id="apply" data-job-form hidden novalidate enctype="multipart/form-data"
          data-msg-name="${esc(f.nameRequired)}" data-msg-phone="${esc(f.phoneInvalid)}" data-msg-email="${esc(f.emailInvalid)}"
          data-msg-cv="${esc(f.cvTooBig)}" data-msg-error="${esc(f.error)}" data-msg-success="${esc(f.success)}" data-msg-success-lead="${esc(f.successLead)}" data-msg-sending="${esc(f.submitting)}">
          <h2 class="form__title">${esc(f.title)}</h2>
          <input type="hidden" name="position">

          <fieldset>
            <legend>${esc(f.personal)}</legend>
            <div class="form__row">
              <div class="field"><label for="j-name">${esc(f.fullName)} *</label><input id="j-name" name="fullName" required autocomplete="name" placeholder="${esc(f.fullNamePh)}"></div>
              <div class="field"><label for="j-phone">${esc(f.phone)} *</label><input id="j-phone" name="phone" type="tel" required autocomplete="tel" placeholder="09xx xxx xxx"></div>
            </div>
            <div class="form__row">
              <div class="field"><label for="j-email">${esc(f.email)} <small>(${esc(f.optional)})</small></label><input id="j-email" name="email" type="email" autocomplete="email"></div>
              <div class="field"><label for="j-age">${esc(f.age)}</label><input id="j-age" name="age" type="number" min="14" max="80" inputmode="numeric"></div>
            </div>
            <div class="form__row">
              <div class="field"><label for="j-gender">${esc(f.gender)}</label><select id="j-gender" name="gender"><option value="">${esc(f.select)}</option><option value="male">${esc(f.male)}</option><option value="female">${esc(f.female)}</option></select></div>
              <div class="field"><label for="j-loc">${esc(f.location)}</label><input id="j-loc" name="location" placeholder="${esc(f.locationPh)}"></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>${esc(f.experience)}</legend>
            <div class="field"><label for="j-exp">${esc(f.experienceLevel)}</label><select id="j-exp" name="experienceLevel"><option value="">${esc(f.select)}</option>${Object.entries(f.levels).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
            <div class="field"><label for="j-expd">${esc(f.experienceDetails)}</label><textarea id="j-expd" name="experienceDetails" placeholder="${esc(f.experienceDetailsPh)}"></textarea></div>
            <div class="field">
              <label for="j-skill">${esc(f.skills)}</label>
              <div class="tags-input" data-skills><input id="j-skill" placeholder="${esc(f.skillsPh)}" autocomplete="off"></div>
            </div>
          </fieldset>

          <fieldset>
            <legend>${esc(f.work)}</legend>
            <div class="form__row">
              <div class="field"><label for="j-avail">${esc(f.availability)}</label><select id="j-avail" name="availability"><option value="">${esc(f.select)}</option>${Object.entries(f.availabilityOptions).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div>
              <div class="field"><label for="j-port">${esc(f.portfolio)} <small>(${esc(f.optional)})</small></label><input id="j-port" name="portfolioLink" type="url" placeholder="${esc(f.portfolioPh)}"></div>
            </div>
            <div class="field"><label for="j-cv">${esc(f.cv)} <small>${esc(f.cvHint)}</small></label><input id="j-cv" name="cv" type="file" accept="application/pdf"></div>
          </fieldset>

          <fieldset>
            <legend>${esc(f.about)}</legend>
            <div class="field"><label for="j-why">${esc(f.whyUs)}</label><textarea id="j-why" name="whyUs" placeholder="${esc(f.whyUsPh)}"></textarea></div>
            <div class="field"><label for="j-add">${esc(f.additional)}</label><textarea id="j-add" name="additionalInfo" rows="3"></textarea></div>
          </fieldset>

          <button class="btn btn--primary btn--lg" type="submit">${icon('arrowUpRight')} ${esc(f.submit)}</button>
          <div class="form__status" role="status" aria-live="polite"></div>
        </form>
      </div>
    </section>`;

  return { title: t.seoTitle, description: s.join.seoDescription, body, noindex: false };
}
