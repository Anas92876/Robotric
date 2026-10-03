import type { Request, Response } from 'express';
import { z } from 'zod';
import { parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { numeric, parse } from '../../shared/http/validate';
import { EVENT_COLORS } from '../events/events.table';
import type { ContactHistoryEntry, HistorySort } from './contact-history.repository';
import { type ContactHistoryService, eventColorFor } from './contact-history.service';
import { CONTACT_OUTCOMES, CONTACT_TYPES } from './contact-history.table';

const lower = (v: unknown) => (typeof v === 'string' ? v.toLowerCase() : v);

const contactBody = z.object({
  contactType: z.preprocess(lower, z.enum(CONTACT_TYPES, { error: 'Invalid contact type' })).optional(),
  callReason: z.string().trim().optional(),
  outcome: z.preprocess(lower, z.enum(CONTACT_OUTCOMES, { error: 'Invalid outcome' })).optional(),
  notes: z.string().trim().nullish(),
  contactDate: z.coerce.date({ error: 'Invalid contact date' }).optional(),
  duration: numeric('Duration must be a number').refine((v) => v >= 0, 'Duration cannot be negative').optional(),
  nextFollowUpDate: z.union([z.coerce.date(), z.null()]).optional(),
  eventTitle: z.string().trim().optional(),
  eventColor: z.enum(EVENT_COLORS).optional(),
});

const statsQuery = z.object({
  leadId: z.string().optional(),
  startDate: z.coerce.date().optional().catch(undefined),
  endDate: z.coerce.date().optional().catch(undefined),
});

/** Mongo-style sort string: "-contactDate" (default), "contactDate", "createdAt", "-createdAt". */
function parseSort(raw: unknown): HistorySort {
  const s = typeof raw === 'string' ? raw : '-contactDate';
  const dir = s.startsWith('-') ? 'desc' : 'asc';
  return { field: s.replace(/^[-+]/, '') === 'createdAt' ? 'createdAt' : 'contactDate', dir };
}

/** The model had `toJSON: { virtuals: true }`, so entries also carried `id` and `eventColor`. */
function entryDoc(e: ContactHistoryEntry) {
  return {
    _id: e.id,
    leadId: e.leadId,
    contactType: e.contactType,
    callReason: e.callReason,
    outcome: e.outcome,
    notes: e.notes,
    contactDate: e.contactDate,
    duration: e.duration,
    scheduledEventId: e.scheduledEvent
      ? { _id: e.scheduledEvent.id, title: e.scheduledEvent.title, startTime: e.scheduledEvent.startTime, endTime: e.scheduledEvent.endTime, color: e.scheduledEvent.color }
      : null,
    nextFollowUpDate: e.nextFollowUpDate,
    createdBy: e.createdBy ? { _id: e.createdBy.id, name: e.createdBy.name, email: e.createdBy.email } : null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    eventColor: eventColorFor(e.outcome),
    id: e.id,
  };
}

export class ContactHistoryController {
  constructor(private readonly history: ContactHistoryService) {}

  listByLead = async (req: Request<{ leadId: string }>, res: Response) => {
    const page = parsePagination(req.query);
    const { items, total } = await this.history.listByLead(req.params.leadId, parseSort(req.query.sort), page);
    res.json({
      success: true,
      count: items.length,
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
      contactHistory: items.map(entryDoc),
    });
  };

  create = async (req: Request<{ leadId: string }>, res: Response) => {
    const entry = await this.history.create(req.params.leadId, parse(contactBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: 'Contact history created successfully', contactHistory: entryDoc(entry) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const entry = await this.history.update(req.params.id, parse(contactBody, req.body));
    res.json({ success: true, message: 'Contact history updated successfully', contactHistory: entryDoc(entry) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.history.delete(req.params.id);
    res.json({ success: true, message: 'Contact history deleted successfully' });
  };

  stats = async (req: Request, res: Response) => {
    res.json({ success: true, stats: await this.history.stats(parse(statsQuery, req.query)) });
  };
}
