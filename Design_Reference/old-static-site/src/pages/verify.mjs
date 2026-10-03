// Certificate verification — GET /certificates/verify/:NUMBER (upper-cased, as on robotrick.net).
// Works both from the form and from shared links: verify.html?cert=NUMBER (and /verify/NUMBER via a host rewrite).
export const file = 'verify.html';

export function render(ctx) {
  const { s, esc, icon, pageHero } = ctx;
  const v = s.verify;

  const body = `
    ${pageHero({ crumbs: [{ label: v.badge }], badge: v.badge, t: v.title, hl: v.titleHighlight, lead: v.lead })}

    <section class="section section--tight">
      <div class="container container--narrow">
        <form class="card form" data-verify
          data-label-checking="${esc(v.checking)}" data-label-verified="${esc(v.verified)}" data-label-not-found="${esc(v.notFound)}"
          data-label-not-found-lead="${esc(v.notFoundLead)}" data-label-id-prefix="${esc(v.idPrefix)}" data-label-error="${esc(v.error)}"
          data-label-completed="${esc(v.completed)}" data-label-course="${esc(v.course)}" data-label-totaling="${esc(v.totaling)}" data-label-hours="${esc(v.hours)}"
          data-label-number="${esc(v.number)}" data-label-issued="${esc(v.issued)}" data-label-issuer="${esc(v.issuer)}" data-label-issuer-name="${esc(v.issuerName)}">
          <label class="label" for="cert">${esc(v.label)}</label>
          <div class="verify">
            <input class="input" id="cert" name="cert" required placeholder="${esc(v.placeholder)}" autocomplete="off" spellcheck="false">
            <button class="btn btn--primary btn--lg" type="submit">${icon('search')} ${esc(v.button)}</button>
          </div>
          <div class="form__status" role="status" aria-live="polite"></div>
        </form>
        <div class="certificate" id="certificate" aria-live="polite"></div>
      </div>
    </section>`;

  return { title: v.seoTitle, description: v.seoDescription, body };
}
