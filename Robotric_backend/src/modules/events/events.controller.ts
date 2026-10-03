import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import type { CalendarEvent } from './events.repository';
import { COMPANY_ROLES, EVENT_COLORS, PARTICIPANT_TYPES } from './events.table';
import type { EventService } from './events.service';

const date = z.coerce.date({ error: 'Invalid date' });

const participant = z
  .object({
    type: z.enum(PARTICIPANT_TYPES, { error: 'Invalid participant type' }),
    // Clients may echo back a populated lead object.
    leadId: z.union([z.string(), z.object({ _id: z.string() }).transform((l) => l._id)]).nullish(),
    customName: z.string().trim().nullish(),
    customPhone: z.string().trim().nullish(),
    companyRole: z.enum(COMPANY_ROLES).nullish(),
  })
  .transform((p) => ({
    type: p.type,
    leadId: p.leadId ?? null,
    customName: p.customName ?? null,
    customPhone: p.customPhone ?? null,
    companyRole: p.companyRole ?? null,
  }));

const eventBody = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().nullish(),
  startTime: date.optional(),
  endTime: date.optional(),
  color: z.enum(EVENT_COLORS, { error: 'Invalid color' }).optional(),
  participants: z.array(participant).optional(),
});

const rangeQuery = z.object({
  start: z.coerce.date().optional().catch(undefined),
  end: z.coerce.date().optional().catch(undefined),
});

export function eventDoc(e: CalendarEvent) {
  return {
    _id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime,
    endTime: e.endTime,
    color: e.color,
    participants: e.participants.map((p) => ({
      _id: p.id,
      type: p.type,
      leadId: p.lead ? { _id: p.lead.id, fullName: p.lead.fullName, mobileNumber: p.lead.mobileNumber, status: p.lead.status } : null,
      customName: p.customName,
      customPhone: p.customPhone,
      companyRole: p.companyRole,
    })),
    createdBy: e.createdBy ? { _id: e.createdBy.id, name: e.createdBy.name } : null,
    createdAt: e.createdAt,
  };
}

export class EventController {
  constructor(private readonly events: EventService) {}

  list = async (req: Request, res: Response) => {
    const list = await this.events.list(parse(rangeQuery, req.query));
    res.json({ success: true, count: list.length, events: list.map(eventDoc) });
  };

  create = async (req: Request, res: Response) => {
    const event = await this.events.create(parse(eventBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: 'Event created successfully', event: eventDoc(event) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const event = await this.events.update(req.params.id, parse(eventBody, req.body));
    res.json({ success: true, message: 'Event updated successfully', event: eventDoc(event) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    await this.events.delete(req.params.id);
    res.json({ success: true, message: 'Event deleted successfully' });
  };
}
