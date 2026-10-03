import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import { leads } from '../leads/leads.table';
import { users } from '../users/users.table';
import { type EventRow, events, eventParticipants, type NewEventRow, type ParticipantInput } from './events.table';

export interface Participant {
  id: string;
  type: (typeof eventParticipants.$inferSelect)['type'];
  lead: { id: string; fullName: string; mobileNumber: string; status: string } | null;
  customName: string | null;
  customPhone: string | null;
  companyRole: (typeof eventParticipants.$inferSelect)['companyRole'];
}

export interface CalendarEvent extends EventRow {
  createdBy: { id: string; name: string } | null;
  participants: Participant[];
}

export interface EventRepository {
  list(range: { start?: Date; end?: Date }): Promise<CalendarEvent[]>;
  findById(id: string): Promise<CalendarEvent | null>;
  create(data: NewEventRow, participants: ParticipantInput[]): Promise<string>;
  /** `participants` replaces the whole list when given. Returns false if no such event. */
  update(id: string, data: Partial<NewEventRow>, participants?: ParticipantInput[]): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

export class DrizzleEventRepository implements EventRepository {
  constructor(private readonly db: DbExecutor) {}

  private async load(where: ReturnType<typeof and>): Promise<CalendarEvent[]> {
    const rows = await this.db
      .select({ event: events, creator: { id: users.id, name: users.name } })
      .from(events)
      .leftJoin(users, eq(users.id, events.createdById))
      .where(where)
      .orderBy(asc(events.startTime));
    if (rows.length === 0) return [];

    const parts = await this.db
      .select({
        p: eventParticipants,
        lead: { id: leads.id, fullName: leads.fullName, mobileNumber: leads.mobileNumber, status: leads.status },
      })
      .from(eventParticipants)
      .leftJoin(leads, eq(leads.id, eventParticipants.leadId))
      .where(inArray(eventParticipants.eventId, rows.map((r) => r.event.id)))
      .orderBy(asc(eventParticipants.position));

    const byEvent = new Map<string, Participant[]>();
    for (const { p, lead } of parts) {
      const list = byEvent.get(p.eventId) ?? [];
      list.push({
        id: p.id,
        type: p.type,
        lead: lead?.id ? lead : null,
        customName: p.customName,
        customPhone: p.customPhone,
        companyRole: p.companyRole,
      });
      byEvent.set(p.eventId, list);
    }
    return rows.map((r) => ({
      ...r.event,
      createdBy: r.creator?.id ? r.creator : null,
      participants: byEvent.get(r.event.id) ?? [],
    }));
  }

  list({ start, end }: { start?: Date; end?: Date }): Promise<CalendarEvent[]> {
    return this.load(and(start ? gte(events.startTime, start) : undefined, end ? lte(events.startTime, end) : undefined));
  }

  async findById(id: string): Promise<CalendarEvent | null> {
    const [event] = await this.load(and(eq(events.id, id)));
    return event ?? null;
  }

  private async replaceParticipants(eventId: string, participants: ParticipantInput[]): Promise<void> {
    await this.db.delete(eventParticipants).where(eq(eventParticipants.eventId, eventId));
    if (participants.length > 0) {
      await this.db.insert(eventParticipants).values(participants.map((p, position) => ({ ...p, eventId, position })));
    }
  }

  async create(data: NewEventRow, participants: ParticipantInput[]): Promise<string> {
    const [row] = await this.db.insert(events).values(data).returning({ id: events.id });
    if (!row) throw new Error('Insert returned no row');
    await this.replaceParticipants(row.id, participants);
    return row.id;
  }

  async update(id: string, data: Partial<NewEventRow>, participants?: ParticipantInput[]): Promise<boolean> {
    const [row] =
      Object.keys(data).length > 0
        ? await this.db.update(events).set(data).where(eq(events.id, id)).returning({ id: events.id })
        : await this.db.select({ id: events.id }).from(events).where(eq(events.id, id));
    if (!row) return false;
    if (participants) await this.replaceParticipants(id, participants);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
    return rows.length > 0;
  }
}
