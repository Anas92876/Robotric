import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError } from '../../shared/http/errors';
import type { InternalWorkRepository } from './internal-work.repository';

const MAX_SHIFT_HOURS = 12;
const DAY = 86400000;
const PRIORITY_WEIGHT: Record<number, number> = { 1: 15, 2: 10, 3: 5 };
const ON_TIME_BONUS = 5;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e?.cause?.code ?? e?.code) === '23505';
};

/** Clock-in / clock-out for staff paid by the hour; shifts left open over 12 h close themselves. */
export class WorkSessionService {
  constructor(
    private readonly work: InternalWorkRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private range(from: string | undefined, to: string | undefined, daysBack: number) {
    const start = from ? new Date(from) : new Date(this.now().getTime() - daysBack * DAY);
    const end = to ? new Date(new Date(to).getTime() + DAY) : undefined;
    if (Number.isNaN(start.getTime()) || (end && Number.isNaN(end.getTime()))) throw new BadRequestError('Invalid date');
    return { from: start, to: end };
  }

  private closeStale(userId?: string) {
    return this.work.closeStale(this.now(), MAX_SHIFT_HOURS, userId);
  }

  async status(userId: string) {
    await this.closeStale(userId);
    const [isHourly, active] = await Promise.all([this.work.isHourly(userId), this.work.openSession(userId)]);
    return { isHourly, active };
  }

  async start(userId: string) {
    if (!(await this.work.isHourly(userId))) throw new BadRequestError('Hour tracking is not enabled for your account');
    await this.closeStale(userId);
    if (await this.work.openSession(userId)) throw new BadRequestError('You are already clocked in');
    try {
      return await this.work.startSession(userId, this.now());
    } catch (err) {
      // Two clock-ins at once: the database keeps only one open shift.
      if (isUniqueViolation(err)) throw new BadRequestError('You are already clocked in');
      throw err;
    }
  }

  async stop(userId: string) {
    const open = await this.work.openSession(userId);
    if (!open) throw new BadRequestError('You are not clocked in');
    const clockOut = this.now();
    return (await this.work.updateSession(open.id, { clockOut, durationMinutes: Math.max(1, Math.round((clockOut.getTime() - open.clockIn.getTime()) / 60000)) }))!;
  }

  async mine(userId: string, q: Record<string, string | undefined>) {
    await this.closeStale(userId);
    return this.work.sessions({ userId, ...this.range(q.from, q.to, 90) });
  }

  // ---- CTO ----

  async staff() {
    await this.closeStale();
    const [people, open] = await Promise.all([this.work.staff(), this.work.openSessions()]);
    const since = new Map(open.map((o) => [o.userId, o.clockIn]));
    return people.map((u) => ({ ...u, workingSince: since.get(u.id) ?? null }));
  }

  async setHourly(userId: string, isHourly: unknown) {
    if (typeof isHourly !== 'boolean') throw new BadRequestError('isHourly must be a boolean');
    const user = isValidId(userId) ? await this.work.setHourly(userId, isHourly) : null;
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
  }

  async all(q: Record<string, string | undefined>) {
    await this.closeStale();
    return this.work.sessions({ userId: isValidId(q.userId) ? q.userId : undefined, ...this.range(q.from, q.to, 7) });
  }

  async edit(editorId: string, id: string, body: { clockIn?: unknown; clockOut?: unknown }) {
    const session = isValidId(id) ? await this.work.findSession(id) : null;
    if (!session) throw new AppError('Work session not found', 404, 'NOT_FOUND');
    const clockIn = body.clockIn ? new Date(String(body.clockIn)) : session.clockIn;
    const clockOut = body.clockOut !== undefined ? (body.clockOut ? new Date(String(body.clockOut)) : null) : session.clockOut;
    if (Number.isNaN(clockIn.getTime()) || (clockOut && Number.isNaN(clockOut.getTime()))) throw new BadRequestError('Invalid date');
    if (clockOut && clockOut <= clockIn) throw new BadRequestError('Clock-out must be after clock-in');
    await this.work.updateSession(session.id, {
      clockIn,
      clockOut,
      durationMinutes: clockOut ? Math.round((clockOut.getTime() - clockIn.getTime()) / 60000) : 0,
      ...(clockOut ? { autoClosed: false } : {}),
      editedById: editorId,
    });
    return (await this.work.sessions({ userId: session.userId, from: new Date(0) })).find((s) => s.id === session.id)!;
  }

  async delete(id: string) {
    if (!isValidId(id) || !(await this.work.deleteSession(id))) throw new AppError('Work session not found', 404, 'NOT_FOUND');
  }
}

/**
 * Team scores: each finished task earns its assignees 15 / 10 / 5 points by
 * priority, plus 5 when done by its due date. Employee of the month is the
 * top scorer unless the CTO picked someone.
 */
export class CtoAnalyticsService {
  constructor(
    private readonly work: InternalWorkRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview() {
    const now = this.now();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const done = await this.work.doneTasks();

    const scores = new Map<string, { allTime: number; thisMonth: number; tasksAllTime: number; tasksThisMonth: number }>();
    const monthly = new Map<string, { year: number; month: number; completed: number }>();
    for (const t of done) {
      const completedAt = t.completedAt ?? t.updatedAt;
      const points = (PRIORITY_WEIGHT[t.priority] ?? 5) + (t.dueDate && completedAt <= t.dueDate ? ON_TIME_BONUS : 0);
      const thisMonth = completedAt >= startOfMonth;
      for (const userId of t.assignees) {
        const s = scores.get(userId) ?? { allTime: 0, thisMonth: 0, tasksAllTime: 0, tasksThisMonth: 0 };
        s.allTime += points;
        s.tasksAllTime += 1;
        if (thisMonth) {
          s.thisMonth += points;
          s.tasksThisMonth += 1;
        }
        scores.set(userId, s);
      }
      if (completedAt >= sixMonthsAgo) {
        const key = `${completedAt.getFullYear()}-${completedAt.getMonth()}`;
        const m = monthly.get(key) ?? { year: completedAt.getFullYear(), month: completedAt.getMonth(), completed: 0 };
        m.completed += 1;
        monthly.set(key, m);
      }
    }

    const people = await this.work.usersByIds([...scores.keys()]);
    const employeeScores = people
      .map((u) => {
        const s = scores.get(u.id)!;
        return { _id: u.id, name: u.name, email: u.email, role: u.role, allTimeScore: s.allTime, thisMonthScore: s.thisMonth, tasksAllTime: s.tasksAllTime, tasksThisMonth: s.tasksThisMonth };
      })
      .sort((a, b) => b.thisMonthScore - a.thisMonthScore);

    let employeeOfMonth = null;
    const pickedId = await this.work.employeeOfMonth(now.getFullYear(), now.getMonth() + 1);
    const picked = pickedId ? (await this.work.usersByIds([pickedId]))[0] : undefined;
    if (picked) {
      const s = scores.get(picked.id);
      employeeOfMonth = { _id: picked.id, name: picked.name, email: picked.email, role: picked.role, score: s?.thisMonth ?? 0, tasks: s?.tasksThisMonth ?? 0, isManual: true };
    } else if (employeeScores[0]) {
      const top = employeeScores[0];
      employeeOfMonth = { _id: top._id, name: top.name, email: top.email, role: top.role, score: top.thisMonthScore, tasks: top.tasksThisMonth, isManual: false };
    }

    const [byStatus, byPriority, overdueCount, hardDeadlineBreachedCount, totals] = await Promise.all([
      this.work.countsBy('status'),
      this.work.countsBy('priority'),
      this.work.overdue(now, 'dueDate'),
      this.work.overdue(now, 'hardDeadline'),
      this.work.totals(),
    ]);
    const statusBreakdown: Record<string, number> = { todo: 0, in_progress: 0, done: 0 };
    for (const s of byStatus) statusBreakdown[s.key] = s.n;
    const priorityBreakdown: Record<string, number> = { 1: 0, 2: 0, 3: 0 };
    for (const p of byPriority) priorityBreakdown[p.key] = p.n;

    return {
      summary: { ...totals, overdueCount, hardDeadlineBreachedCount, ...statusBreakdown },
      priorityBreakdown,
      monthlyProductivity: [...monthly.values()]
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map((m) => ({ month: `${MONTH_NAMES[m.month]} ${m.year}`, completed: m.completed })),
      statusBreakdown,
      employeeScores,
      topEmployees: employeeScores.slice(0, 8).map((e) => ({ name: e.name.split(' ')[0], fullName: e.name, score: e.thisMonthScore, tasks: e.tasksThisMonth })),
      employeeOfMonth,
    };
  }

  async pick(userId: unknown) {
    const user = isValidId(userId) ? (await this.work.usersByIds([userId]))[0] : undefined;
    if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    const now = this.now();
    await this.work.setEmployeeOfMonth(now.getFullYear(), now.getMonth() + 1, user.id);
    return user;
  }

  async clear() {
    const now = this.now();
    await this.work.clearEmployeeOfMonth(now.getFullYear(), now.getMonth() + 1);
  }
}
