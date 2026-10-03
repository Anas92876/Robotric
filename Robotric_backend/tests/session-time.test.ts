import { describe, expect, it } from 'vitest';
import { autoStatus, nextScheduledSlot } from '../src/modules/sessions/session-time';

const slots = [
  { day: 'Saturday', startTime: '10:00', endTime: '12:00' },
  { day: 'Tuesday', startTime: '16:00', endTime: '17:30' },
];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('nextScheduledSlot', () => {
  it('never gives two sessions the same date, whatever weekday it is today', () => {
    for (let offset = 0; offset < 7; offset++) {
      const now = new Date(2030, 0, 5 + offset, 13, 0); // 2030-01-05 is a Saturday
      const dates = [0, 1, 2, 3, 4, 5].map((n) => ymd(nextScheduledSlot(slots, n, now).scheduledDate));
      expect(new Set(dates).size).toBe(6);
      for (const d of dates) expect(new Date(d).getTime()).toBeGreaterThanOrEqual(new Date(ymd(now)).getTime());
    }
  });

  it('cycles through the slots week by week', () => {
    const now = new Date(2030, 0, 1, 8, 0); // Tuesday morning
    const a = nextScheduledSlot(slots, 0, now);
    const b = nextScheduledSlot(slots, 2, now);
    expect(a).toMatchObject({ startTime: '10:00', endTime: '12:00', duration: 120 });
    expect((b.scheduledDate.getTime() - a.scheduledDate.getTime()) / 86400000).toBe(7);
    expect(nextScheduledSlot(slots, 1, now)).toMatchObject({ startTime: '16:00', duration: 90 });
  });

  it('defaults to tomorrow 10:00–12:00 for a group without a timetable', () => {
    const r = nextScheduledSlot([], 0, new Date(2030, 0, 1, 8));
    expect(ymd(r.scheduledDate)).toBe('2030-01-02');
    expect(r).toMatchObject({ startTime: '10:00', endTime: '12:00', duration: 120 });
  });
});

describe('autoStatus', () => {
  const day = new Date(2030, 0, 10);
  const s = { scheduledDate: day, startTime: '10:00', endTime: '12:00', status: 'scheduled' as const };
  it('follows the clock and keeps cancellations', () => {
    expect(autoStatus(s, new Date(2030, 0, 10, 9))).toBe('scheduled');
    expect(autoStatus(s, new Date(2030, 0, 10, 11))).toBe('in_progress');
    expect(autoStatus(s, new Date(2030, 0, 10, 13))).toBe('completed');
    expect(autoStatus({ ...s, status: 'cancelled' }, new Date(2030, 0, 10, 13))).toBe('cancelled');
  });
});
