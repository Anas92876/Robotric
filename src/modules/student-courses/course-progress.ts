import type { ScheduleSlot } from '../groups/groups.table';
import { atTime, autoStatus, minutesOf } from '../sessions/session-time';
import type { SessionRow } from '../sessions/sessions.table';

type TimedSession = Pick<SessionRow, 'scheduledDate' | 'startTime' | 'endTime' | 'status' | 'duration'>;

/**
 * Course length in hours from its duration text: "40 hours" → 40,
 * "2 months" → 80 (40 h/month), "3 weeks" → 30 (10 h/week), "5 days" → 10.
 * A bare number is taken as hours.
 */
export function parseDurationToHours(duration: string | null | undefined): number {
  if (!duration) return 0;
  const m = duration.match(/(\d+\.?\d*)/);
  if (!m) return 0;
  const value = Number.parseFloat(m[1]!);
  const text = duration.toLowerCase();
  // "month" contains an "h", so it has to be checked before the hour units.
  if (text.includes('month')) return value * 40;
  if (text.includes('week')) return value * 10;
  if (text.includes('day')) return value * 2;
  return value;
}

/** A session's length in hours: from its times, else its `duration` minutes. */
export function sessionHours(s: Pick<SessionRow, 'startTime' | 'endTime' | 'duration'>): number {
  if (s.startTime && s.endTime) return Math.max(0, (minutesOf(s.endTime) - minutesOf(s.startTime)) / 60);
  return (s.duration || 0) / 60;
}

const slotHours = (slot: ScheduleSlot) => (slot.startTime && slot.endTime ? Math.max(0, (minutesOf(slot.endTime) - minutesOf(slot.startTime)) / 60) : 0);

export interface ProgressInput {
  sessions: TimedSession[];
  course: { totalHours: number; duration: string | null };
  /**
   * The group's first session number and weekly schedule. A group that
   * started at session N is credited with the N−1 earlier sessions, each
   * as long as its average scheduled slot.
   */
  group?: { startingSessionNumber: number; schedule: ScheduleSlot[] };
  now?: Date;
}

export interface CourseProgress {
  percentageComplete: number;
  completedSessions: number;
  totalSessions: number;
}

export interface ProgressDetail {
  progress: CourseProgress;
  /** Hours taught so far, including hours credited for earlier sessions. */
  completedHours: number;
  /** Earlier sessions credited to a group that started past session 1. */
  creditedSessions: number;
}

/** Progress as the share of the course's hours already taught (sessions whose end time has passed). */
export function courseProgress(input: ProgressInput): CourseProgress {
  return progressDetail(input).progress;
}

export function progressDetail({ sessions, course, group, now = new Date() }: ProgressInput): ProgressDetail {
  const completed = sessions.filter((s) => autoStatus(s, now) === 'completed');
  let completedHours = completed.reduce((sum, s) => sum + sessionHours(s), 0);

  const starting = group?.startingSessionNumber || 1;
  let previousHours = 0;
  let creditedSessions = 0;
  if (group && starting > 1 && group.schedule.length > 0) {
    const average = group.schedule.reduce((sum, slot) => sum + slotHours(slot), 0) / group.schedule.length;
    creditedSessions = starting - 1;
    previousHours = average * creditedSessions;
    completedHours += previousHours;
  }

  let totalHours = course.totalHours || parseDurationToHours(course.duration);
  if (!totalHours) totalHours = sessions.reduce((sum, s) => sum + sessionHours(s), 0) + previousHours;

  const percentageComplete = totalHours > 0 ? Math.min(100, Math.max(0, Math.round((completedHours / totalHours) * 100))) : 0;
  return { progress: { percentageComplete, completedSessions: completed.length, totalSessions: sessions.length }, completedHours, creditedSessions };
}

/** Whether a session is over: its end time has passed (or it was marked completed when it has no times). */
export function isSessionOver(s: TimedSession, now = new Date()): boolean {
  if (s.scheduledDate && s.endTime && s.status !== 'cancelled') return now > atTime(s.scheduledDate, s.endTime)!;
  return s.status === 'completed';
}

/** Sessions unlock for students on their scheduled day. */
export function isSessionLocked(s: Pick<SessionRow, 'scheduledDate'>, now = new Date()): boolean {
  if (!s.scheduledDate) return false;
  const d = new Date(s.scheduledDate);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return day > today;
}

/** YYYY-MM-DD of a date, as the old API printed it (UTC). */
export const isoDay = (d: Date | null) => (d ? d.toISOString().split('T')[0]! : null);
