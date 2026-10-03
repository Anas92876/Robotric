import type { SessionRow, SessionStatus } from './sessions.table';

type Timed = Pick<SessionRow, 'scheduledDate' | 'startTime' | 'endTime' | 'status'>;

/** Minutes since midnight for "HH:MM". */
export const minutesOf = (hhmm: string): number => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The scheduled day combined with a time of day (local server time, Asia/Damascus). */
export function atTime(day: Date | null, hhmm: string | null): Date | null {
  if (!day || !hhmm) return null;
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Status from the clock: cancelled stays cancelled; otherwise completed after
 * the end time, in progress between start and end, scheduled before.
 */
export function autoStatus(s: Timed, now = new Date()): SessionStatus {
  if (s.status === 'cancelled') return 'cancelled';
  const start = atTime(s.scheduledDate, s.startTime);
  const end = atTime(s.scheduledDate, s.endTime);
  if (!start || !end) return s.status;
  if (now > end) return 'completed';
  if (now >= start) return 'in_progress';
  return 'scheduled';
}

/** The Mongoose virtuals the old API included in every session document. */
export function sessionVirtuals(s: SessionRow, now = new Date()) {
  const start = atTime(s.scheduledDate, s.startTime);
  const end = atTime(s.scheduledDate, s.endTime);
  return {
    scheduledStartDateTime: start,
    scheduledEndDateTime: end,
    isToday: s.scheduledDate ? new Date(s.scheduledDate).toDateString() === now.toDateString() : false,
    isUpcoming: start ? start > now && s.status === 'scheduled' : false,
    isPast: end ? end < now : false,
    actualDuration: s.actualStartTime && s.actualEndTime ? Math.round((s.actualEndTime.getTime() - s.actualStartTime.getTime()) / 60000) : null,
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Where the next session of a group falls when the trainer doesn't pick a
 * date: cycle through the weekly slots, one week per full cycle, starting
 * this week and never in the past (same rule as before).
 */
export function nextScheduledSlot(
  schedule: { day: string; startTime: string; endTime: string }[],
  existingSessions: number,
  now = new Date(),
): { scheduledDate: Date; startTime: string; endTime: string; duration: number } {
  if (schedule.length === 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return { scheduledDate: d, startTime: '10:00', endTime: '12:00', duration: 120 };
  }
  const slot = schedule[existingSessions % schedule.length]!;
  const duration = minutesOf(slot.endTime) - minutesOf(slot.startTime) || 120;
  const week = Math.floor(existingSessions / schedule.length);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  // First upcoming occurrence of this slot's weekday, then one week per full
  // cycle. (The old code added the "not in the past" week after the cycle
  // offset, so on the slot's own weekday two sessions could share a date.)
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + WEEKDAYS.indexOf(slot.day));
  if (date < now) date.setDate(date.getDate() + 7);
  date.setDate(date.getDate() + week * 7);
  date.setHours(0, 0, 0, 0);
  return { scheduledDate: date, startTime: slot.startTime, endTime: slot.endTime, duration };
}

/** Day / week / month window around a reference date, for the calendar. */
export function calendarRange(view: string, ref: Date): { startDate: Date; endDate: Date } {
  if (view === 'day') {
    const startDate = new Date(ref);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(ref);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  if (view === 'week') {
    const startDate = new Date(ref);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }
  const startDate = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}
