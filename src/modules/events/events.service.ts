import type { UnitOfWork } from '../../shared/db/unit-of-work';
import { BadRequestError, NotFoundError } from '../../shared/http/errors';
import type { CalendarEvent, EventRepository } from './events.repository';
import type { EventColor, NewEventRow, ParticipantInput } from './events.table';

export interface EventInput {
  title?: string;
  description?: string | null;
  startTime?: Date;
  endTime?: Date;
  color?: EventColor;
  participants?: ParticipantInput[];
}

const notFound = () => new NotFoundError('Event');

function assertTimes(start: Date, end: Date): void {
  if (start >= end) throw new BadRequestError('End time must be after start time');
}

export class EventService {
  constructor(
    private readonly events: EventRepository,
    private readonly uow: UnitOfWork<{ events: EventRepository }>,
  ) {}

  list(range: { start?: Date; end?: Date }): Promise<CalendarEvent[]> {
    return this.events.list(range);
  }

  async create(input: EventInput, createdById: string): Promise<CalendarEvent> {
    if (!input.title || !input.startTime || !input.endTime) {
      throw new BadRequestError('Title, start time, and end time are required');
    }
    assertTimes(input.startTime, input.endTime);
    const { title, startTime, endTime } = input;
    const id = await this.uow.run(({ events }) =>
      events.create(
        { title, description: input.description ?? null, startTime, endTime, color: input.color ?? 'blue', createdById },
        input.participants ?? [],
      ),
    );
    return (await this.events.findById(id))!;
  }

  async update(id: string, input: EventInput): Promise<CalendarEvent> {
    const current = await this.events.findById(id);
    if (!current) throw notFound();
    assertTimes(input.startTime ?? current.startTime, input.endTime ?? current.endTime);

    const { participants, ...fields } = input;
    const changes: Partial<NewEventRow> = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    await this.uow.run(({ events }) => events.update(id, changes, participants));
    return (await this.events.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    if (!(await this.events.delete(id))) throw notFound();
  }
}
