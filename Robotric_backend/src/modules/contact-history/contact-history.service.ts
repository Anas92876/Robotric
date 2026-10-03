import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { Page } from '../../shared/http/pagination';
import type { EventRepository } from '../events/events.repository';
import type { EventColor } from '../events/events.table';
import type { LeadRepository } from '../leads/leads.repository';
import type {
  ContactHistoryEntry,
  ContactHistoryRepository,
  HistorySort,
  HistoryStats,
  HistoryStatsFilter,
} from './contact-history.repository';
import type { ContactHistoryRow, ContactOutcome, ContactType, NewContactHistoryRow } from './contact-history.table';

export interface CrmRepos {
  history: ContactHistoryRepository;
  events: EventRepository;
  leads: LeadRepository;
}

export interface ContactInput {
  contactType?: ContactType;
  callReason?: string;
  outcome?: ContactOutcome;
  notes?: string | null;
  contactDate?: Date;
  duration?: number;
  nextFollowUpDate?: Date | null;
  eventTitle?: string;
  eventColor?: EventColor;
}

const OUTCOME_COLORS: Record<ContactOutcome, EventColor> = {
  successful: 'green',
  callback_requested: 'yellow',
  no_answer: 'gray',
  not_interested: 'red',
  converted: 'blue',
  other: 'purple',
};

export const eventColorFor = (outcome: ContactOutcome): EventColor => OUTCOME_COLORS[outcome] ?? 'blue';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The calendar event that mirrors a contact: same wording the old API generated. */
function eventFor(entry: Pick<ContactHistoryRow, 'contactType' | 'outcome' | 'callReason' | 'notes' | 'contactDate' | 'duration'>, leadName: string, title?: string, color?: EventColor) {
  const endTime = new Date(entry.contactDate);
  endTime.setMinutes(endTime.getMinutes() + entry.duration);
  return {
    title: title || `${capitalize(entry.contactType)} with ${leadName} - ${entry.callReason}`,
    description: [
      `Contact Type: ${entry.contactType}`,
      `Outcome: ${entry.outcome.replace(/_/g, ' ')}`,
      `Reason: ${entry.callReason}`,
      entry.notes ? `\nNotes: ${entry.notes}` : '',
    ]
      .join('\n')
      .trim(),
    startTime: entry.contactDate,
    endTime,
    color: color || eventColorFor(entry.outcome),
  };
}

export class ContactHistoryService {
  constructor(
    private readonly repos: CrmRepos,
    private readonly uow: UnitOfWork<CrmRepos>,
  ) {}

  async listByLead(leadId: string, sort: HistorySort, page: Page) {
    if (!(await this.repos.leads.findRow(leadId))) throw new NotFoundError('Lead');
    return this.repos.history.listByLead(leadId, sort, page);
  }

  stats(filter: HistoryStatsFilter): Promise<HistoryStats> {
    return this.repos.history.stats(filter);
  }

  async create(leadId: string, input: ContactInput, byId: string): Promise<ContactHistoryEntry> {
    const { contactType, callReason, outcome, contactDate } = input;
    if (!contactType || !callReason || !outcome || !contactDate) {
      throw new BadRequestError('Contact type, call reason, outcome, and contact date are required');
    }
    const lead = await this.repos.leads.findRow(leadId);
    if (!lead) throw new NotFoundError('Lead');

    const entry = { contactType, callReason, outcome, contactDate, notes: input.notes ?? null, duration: input.duration ?? 30 };
    const id = await this.uow.run(async ({ history, events, leads }) => {
      const eventId = await events.create(
        { ...eventFor(entry, lead.fullName, input.eventTitle, input.eventColor), createdById: byId },
        [{ type: 'lead', leadId, customName: null, customPhone: null, companyRole: null }],
      );
      const historyId = await history.create({
        ...entry,
        leadId,
        scheduledEventId: eventId,
        nextFollowUpDate: input.nextFollowUpDate ?? null,
        createdById: byId,
      });
      if (input.nextFollowUpDate) await leads.update(leadId, { nextFollowUpDate: input.nextFollowUpDate });
      await leads.addFollowUp(leadId, { note: `${contactType}: ${callReason} - ${outcome}`, date: contactDate, byId });
      return historyId;
    });
    return (await this.repos.history.findById(id))!;
  }

  async update(id: string, input: ContactInput): Promise<ContactHistoryEntry> {
    const current = await this.repos.history.findRow(id);
    if (!current) throw new NotFoundError('Contact history');

    const changes: Partial<NewContactHistoryRow> = {};
    if (input.contactType) changes.contactType = input.contactType;
    if (input.callReason) changes.callReason = input.callReason;
    if (input.outcome) changes.outcome = input.outcome;
    if (input.notes !== undefined) changes.notes = input.notes;
    if (input.contactDate) changes.contactDate = input.contactDate;
    if (input.duration !== undefined) changes.duration = input.duration;
    if (input.nextFollowUpDate !== undefined) changes.nextFollowUpDate = input.nextFollowUpDate;
    const merged = { ...current, ...changes };

    await this.uow.run(async ({ history, events, leads }) => {
      await history.update(id, changes);
      if (current.scheduledEventId) {
        const lead = await leads.findRow(current.leadId);
        await events.update(current.scheduledEventId, eventFor(merged, lead?.fullName ?? '', input.eventTitle, input.eventColor));
      }
      if (input.nextFollowUpDate !== undefined) {
        await leads.update(current.leadId, { nextFollowUpDate: input.nextFollowUpDate });
      }
    });
    return (await this.repos.history.findById(id))!;
  }

  /** Removes the contact and the calendar event created for it. */
  async delete(id: string): Promise<void> {
    const current = await this.repos.history.findRow(id);
    if (!current) throw new NotFoundError('Contact history');
    await this.uow.run(async ({ history, events }) => {
      if (current.scheduledEventId) await events.delete(current.scheduledEventId);
      await history.delete(id);
    });
  }
}
