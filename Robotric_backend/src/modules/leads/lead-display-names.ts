import type { DisplayNameResolver, DisplayNames } from '../auth/auth.ports';
import type { LeadRepository } from './leads.repository';

/**
 * Supplies the auth module's display names from the CRM: the lead converted
 * into this account (or, failing that, a lead with the same name) gives the
 * English name, with the Arabic full name as `nameAr`.
 * Any failure falls back to the account name — login must never fail on this.
 */
export class LeadDisplayNameResolver implements DisplayNameResolver {
  constructor(private readonly leads: Pick<LeadRepository, 'findForUser'>) {}

  async resolve(user: { id: string; name: string; email: string }): Promise<DisplayNames> {
    try {
      const lead = await this.leads.findForUser(user.id, user.name);
      if (!lead) return { name: user.name, nameAr: null };
      return { name: lead.englishName || lead.fullName || user.name, nameAr: lead.fullName || null };
    } catch {
      return { name: user.name, nameAr: null };
    }
  }
}
