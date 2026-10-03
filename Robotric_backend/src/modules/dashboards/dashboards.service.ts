import type { PasswordHasher } from '../../shared/auth/password-hasher';
import { isValidId } from '../../shared/db/ids';
import { AppError, BadRequestError, ConflictError } from '../../shared/http/errors';
import type { AssignmentRepository } from '../assignments/assignments.repository';
import type { AttendanceRepository } from '../attendance/attendance.repository';
import type { CourseRepository } from '../courses/courses.repository';
import type { Enrollment, EnrollmentRepository } from '../enrollments/enrollments.repository';
import { participationScore, performanceScore } from '../evaluations/evaluation-score';
import type { EvaluationRepository } from '../evaluations/evaluations.repository';
import type { GroupActivityReader } from '../groups/groups.ports';
import type { GroupRepository } from '../groups/groups.repository';
import type { QuizRepository } from '../quizzes/quizzes.repository';
import type { ReceiptRepository } from '../receipts/receipts.repository';
import type { ResourceRepository } from '../resources/resources.repository';
import { atTime, autoStatus } from '../sessions/session-time';
import type { Session, SessionRepository } from '../sessions/sessions.repository';
import type { StudentCourseService } from '../student-courses/student-courses.service';
import type { User, UserRepository } from '../users/users.repository';
import type { DashboardRepository } from './dashboards.repository';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysAgo = (now: Date, n: number) => new Date(now.getTime() - n * DAY);
const oneDecimal = (n: number) => Number.parseFloat(n.toFixed(1));
const periodDays = (v: string | undefined) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 3650) : 30;
};

// ═══════════════════════════ CLO ═══════════════════════════

export class CloDashboardService {
  constructor(
    private readonly stats: DashboardRepository,
    private readonly groups: Pick<GroupRepository, 'list'>,
    private readonly courses: Pick<CourseRepository, 'list'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview() {
    const now = this.now();
    const [totalTrainers, activeTrainers, totalCourses, publishedCourses, totalGroups, activeGroups, totalStudents, totalEnrollments, activeEnrollments, recentEnrollments, completedEnrollments, attendance, groupAttendance, groups, courses] =
      // In batches no bigger than the connection pool: firing all fifteen at once
      // stalled on the Supabase transaction pooler.
      [
        ...(await Promise.all([
          this.stats.countUsers(['trainer']),
          this.stats.countUsers(['trainer'], 'active'),
          this.stats.countCourses(),
          this.stats.countCourses('published'),
          this.stats.countGroups(),
        ])),
        ...(await Promise.all([
          this.stats.countGroups('active'),
          this.stats.countUsers(['student']),
          this.stats.countEnrollments(),
          this.stats.countEnrollments({ status: 'active' }),
          this.stats.countEnrollments({ since: daysAgo(now, 30) }),
        ])),
        ...(await Promise.all([this.stats.countEnrollments({ status: 'completed' }), this.stats.attendanceTotals()])),
        await this.stats.activeGroupAttendance(),
        await this.groups.list({ sortBy: 'createdAt', order: 'desc' }),
        await this.courses.list({ includeSubCourses: true, sortBy: 'createdAt', order: 'desc' }),
      ] as const;

    // Top trainers by the mean attendance of their active groups (a group without marks counts as 0%).
    const byTrainer = new Map<string, { trainerName: string; trainerEmail: string; rates: number[] }>();
    for (const g of groupAttendance) {
      const entry = byTrainer.get(g.trainerId) ?? { trainerName: g.trainerName, trainerEmail: g.trainerEmail, rates: [] };
      entry.rates.push(g.records > 0 ? (g.attended / g.records) * 100 : 0);
      byTrainer.set(g.trainerId, entry);
    }
    const topTrainers = [...byTrainer.entries()]
      .map(([id, t]) => ({ _id: id, trainerName: t.trainerName, trainerEmail: t.trainerEmail, totalGroups: t.rates.length, avgAttendance: t.rates.reduce((a, b) => a + b, 0) / t.rates.length }))
      .sort((a, b) => b.avgAttendance - a.avgAttendance)
      .slice(0, 5);

    return {
      stats: {
        trainers: { total: totalTrainers, active: activeTrainers, inactive: totalTrainers - activeTrainers },
        courses: { total: totalCourses, published: publishedCourses, draft: totalCourses - publishedCourses },
        groups: { total: totalGroups, active: activeGroups, completed: totalGroups - activeGroups },
        students: { total: totalStudents },
        enrollments: { total: totalEnrollments, active: activeEnrollments, recent: recentEnrollments },
        performance: {
          attendanceRate: attendance.records > 0 ? oneDecimal((attendance.attended / attendance.records) * 100) : 0,
          completionRate: totalEnrollments > 0 ? oneDecimal((completedEnrollments / totalEnrollments) * 100) : 0,
        },
      },
      topTrainers,
      recentGroups: groups.slice(0, 5),
      recentCourses: courses.slice(0, 5),
    };
  }

  async analytics(period: string | undefined) {
    const days = periodDays(period);
    const since = daysAgo(this.now(), days);
    const [enrollmentTrends, attendanceTrends, popularity, workload] = await Promise.all([
      this.stats.enrollmentsPerDay(since),
      this.stats.attendancePerDay(since),
      this.stats.coursePopularity(10),
      this.stats.trainerWorkload(),
    ]);
    return {
      period: days,
      enrollmentTrends: enrollmentTrends.map((r) => ({ _id: r.day, count: r.count })),
      attendanceTrends: attendanceTrends.map((r) => ({ _id: r.day, total: r.total, present: r.present, late: r.late, absent: r.absent })),
      coursePopularity: popularity.map((c) => ({
        _id: c.courseId,
        courseTitle: c.title,
        courseCategory: c.category,
        enrollmentCount: c.total,
        activeCount: c.active,
        completedCount: c.completed,
        completionRate: c.total > 0 ? (c.completed / c.total) * 100 : 0,
      })),
      trainerWorkload: workload.map((w) => ({ _id: w.trainerId, trainerName: w.name, trainerEmail: w.email, totalGroups: w.groups, totalStudents: w.students })),
    };
  }
}

/** /api/clo/trainers — trainer accounts, their course authorisations and performance. */
export class CloTrainerService {
  constructor(
    private readonly stats: DashboardRepository,
    private readonly users: Pick<UserRepository, 'findById' | 'emailExists' | 'emailTakenByOther' | 'create' | 'update'>,
    private readonly groups: Pick<GroupRepository, 'list' | 'membersOf'>,
    private readonly courses: Pick<CourseRepository, 'findById'>,
    private readonly hasher: PasswordHasher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(q: Record<string, string | undefined>) {
    return this.stats.trainers({ status: q.status || undefined, search: q.search || undefined, sortBy: q.sortBy ?? 'createdAt', order: q.order === 'asc' ? 'asc' : 'desc' });
  }

  private async trainer(id: string): Promise<User> {
    const user = isValidId(id) ? await this.users.findById(id) : null;
    if (!user || user.role !== 'trainer') throw new AppError('Trainer not found', 404, 'NOT_FOUND');
    return user;
  }

  async create(body: { name?: unknown; email?: unknown; password?: unknown; profile?: unknown }) {
    const { name, email, password } = body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      throw new BadRequestError('Name, email, and password are required');
    }
    if (password.length < 6) throw new BadRequestError('Password must be at least 6 characters');
    if (await this.users.emailExists(email)) throw new ConflictError('User with this email already exists');
    const profile = (body.profile && typeof body.profile === 'object' ? body.profile : {}) as Record<string, unknown>;
    return this.users.create({
      name: name.trim(),
      email,
      passwordHash: await this.hasher.hash(password),
      role: 'trainer',
      profile: { ...profile, isActive: true, specialization: String(profile.specialization || ''), bio: String(profile.bio || ''), phone: String(profile.phone || '') },
    });
  }

  async update(id: string, body: { name?: unknown; email?: unknown; profile?: unknown; password?: unknown }) {
    const trainer = await this.trainer(id);
    if (typeof body.email === 'string' && body.email && (await this.users.emailTakenByOther(body.email, id))) throw new ConflictError('Email already in use');
    const password = typeof body.password === 'string' && body.password ? body.password : null;
    if (password && password.length < 6) throw new BadRequestError('Password must be at least 6 characters');
    const updated = await this.users.update(
      id,
      {
        ...(typeof body.name === 'string' && body.name.trim() && { name: body.name.trim() }),
        ...(typeof body.email === 'string' && body.email && { email: body.email }),
        ...(body.profile && typeof body.profile === 'object' ? { profile: { ...(trainer.profile ?? {}), ...(body.profile as Record<string, unknown>) } } : {}),
        ...(password && { passwordHash: await this.hasher.hash(password) }),
      },
      Boolean(password),
    );
    return updated!;
  }

  /** Marks the trainer inactive (or active again). It is a label for the CLO's lists; it does not block sign-in. */
  async setActive(id: string, action: unknown) {
    const trainer = await this.trainer(id);
    const status = action === 'activate' ? 'active' : 'inactive';
    await this.users.update(id, { profile: { ...(trainer.profile ?? {}), status } }, false);
    return { trainer, status, activated: status === 'active' };
  }

  async performance(id: string, period: string | undefined) {
    const trainer = await this.trainer(id);
    const days = periodDays(period);
    const [groups, trends] = await Promise.all([this.groups.list({ trainerId: id }), this.stats.attendancePerDay(daysAgo(this.now(), days), id)]);
    const members = await this.groups.membersOf(groups.map((g) => g.id));
    const totalRecords = trends.reduce((s, d) => s + d.total, 0);
    const attended = trends.reduce((s, d) => s + d.present + d.late, 0);
    const courses = new Map<string, { id: string; title: string; category: string }>();
    for (const g of groups) if (g.course) courses.set(g.course.id, { id: g.course.id, title: g.course.title, category: g.course.category });
    return {
      trainer,
      days,
      groups,
      members,
      courses: [...courses.values()],
      trends,
      totalStudents: groups.reduce((s, g) => s + (members.get(g.id)?.length ?? 0), 0),
      overallAttendanceRate: totalRecords > 0 ? oneDecimal((attended / totalRecords) * 100) : 0,
    };
  }

  /** Adds a course to the trainer's authorised courses (kept in their profile, as before). */
  async assignCourse(id: string, courseId: unknown) {
    if (!courseId) throw new BadRequestError('Course ID is required');
    const trainer = await this.trainer(id);
    const course = isValidId(courseId) ? await this.courses.findById(courseId) : null;
    if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND');
    const authorized = Array.isArray(trainer.profile?.authorizedCourses) ? (trainer.profile.authorizedCourses as string[]) : [];
    if (!authorized.includes(course.id)) await this.users.update(id, { profile: { ...(trainer.profile ?? {}), authorizedCourses: [...authorized, course.id] } }, false);
    return { trainer, course };
  }

  async removeCourse(trainerId: string, courseId: string) {
    const trainer = await this.trainer(trainerId);
    const authorized = Array.isArray(trainer.profile?.authorizedCourses) ? (trainer.profile.authorizedCourses as string[]) : null;
    if (authorized) await this.users.update(trainerId, { profile: { ...trainer.profile, authorizedCourses: authorized.filter((c) => c !== courseId) } }, false);
  }
}

// ═══════════════════════════ Trainer ═══════════════════════════

export interface EvaluationSummary {
  totalEvaluations: number;
  averageRating: string | number;
  averageEngagement: string | number;
  averageObjectivesAchievement: number;
  averageOverallScore: number;
}

/**
 * The trainer's home screen. The old version read "session evaluations" and
 * "trainer resources", which nothing ever wrote; these figures now come from
 * the trainer's student evaluations and the resources assigned to their groups.
 */
export class TrainerDashboardService {
  constructor(
    private readonly groups: Pick<GroupRepository, 'list' | 'memberCounts'>,
    private readonly sessions: Pick<SessionRepository, 'list'>,
    private readonly attendance: Pick<AttendanceRepository, 'findBySession'>,
    private readonly evaluations: Pick<EvaluationRepository, 'list'>,
    private readonly resources: Pick<ResourceRepository, 'assignments' | 'list'>,
    private readonly activity: GroupActivityReader,
    private readonly counts: Pick<DashboardRepository, 'distinctStudents'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async today(trainerId: string): Promise<Session[]> {
    const start = startOfDay(this.now());
    const end = new Date(start.getTime() + DAY - 1);
    const list = await this.sessions.list({ trainerId, startDate: start, endDate: end });
    return list.filter((s) => s.status !== 'cancelled').sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  }

  async stats(trainerId: string) {
    const now = this.now();
    const today = startOfDay(now);
    const weekStart = new Date(today.getTime() - today.getDay() * DAY);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY - 1);
    const [activeGroups, todays, week, upcoming, recent] = await Promise.all([
      this.groups.list({ trainerId, status: 'active' }),
      this.today(trainerId),
      this.sessions.list({ trainerId, startDate: weekStart, endDate: weekEnd }),
      this.sessions.list({ trainerId, startDate: today }),
      this.evaluations.list({ trainerId }, { by: 'evaluationDate', order: 'desc' }, { limit: 5, offset: 0 }),
    ]);
    const totalStudents = await this.counts.distinctStudents(activeGroups.map((g) => g.id));
    const averageRating = recent.length ? oneDecimal(recent.reduce((s, e) => s + e.overallRating, 0) / recent.length) : 0;
    return {
      activeGroups: activeGroups.length,
      todaysSessions: todays,
      completedToday: todays.filter((s) => autoStatus(s, now) === 'completed').length,
      weekSessions: week.filter((s) => s.status !== 'cancelled').length,
      totalStudents,
      upcomingSessions: upcoming.filter((s) => s.status !== 'cancelled' && (atTime(s.scheduledDate, s.startTime) ?? s.scheduledDate!) >= now).length,
      averageRating,
    };
  }

  /** Today's sessions with their group size and whether attendance was taken (the old lookup matched the wrong fields). */
  async schedule(trainerId: string) {
    const sessions = await this.today(trainerId);
    const counts = await this.groups.memberCounts([...new Set(sessions.map((s) => s.groupId))]);
    return Promise.all(
      sessions.map(async (s) => {
        const sheet = await this.attendance.findBySession(s.id);
        return { session: s, studentsCount: counts.get(s.groupId) ?? 0, sheetId: sheet?.id ?? null };
      }),
    );
  }

  async activities(trainerId: string, limit: number) {
    const now = this.now();
    const [recentSessions, evaluations] = await Promise.all([
      this.sessions.list({ trainerId, startDate: startOfDay(daysAgo(now, 7)), endDate: now }),
      this.evaluations.list({ trainerId }, { by: 'evaluationDate', order: 'desc' }, { limit: 5, offset: 0 }),
    ]);
    const completed = recentSessions
      .filter((s) => autoStatus(s, now) === 'completed')
      .map((s) => ({ s, at: s.actualEndTime ?? atTime(s.scheduledDate, s.endTime) ?? s.updatedAt }))
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 10);
    const items = [
      ...completed.map(({ s, at }) => ({
        type: 'session_completed',
        icon: 'CheckCircle',
        title: 'Session Completed',
        description: `${s.title} - ${s.group?.name ?? 'Unknown Group'}`,
        timestamp: at,
        link: `/trainer/sessions/${s.id}`,
      })),
      ...evaluations.map((e) => ({
        type: 'evaluation_submitted',
        icon: 'FileText',
        title: 'Session Evaluated',
        description: `${e.session?.title ?? 'Session'} - Rating: ${e.overallRating}/5`,
        timestamp: e.evaluationDate,
        link: `/trainer/evaluations/${e.id}`,
      })),
    ];
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  async notifications(trainerId: string) {
    const now = this.now();
    const [todays, recent, activeGroups] = await Promise.all([
      this.today(trainerId),
      this.sessions.list({ trainerId, startDate: startOfDay(daysAgo(now, 3)), endDate: now }),
      this.groups.list({ trainerId, status: 'active' }),
    ]);
    const notes: { type: string; priority: 'high' | 'medium' | 'low'; icon: string; title: string; message: string; data: Record<string, string>; createdAt: Date }[] = [];

    for (const s of todays.filter((x) => autoStatus(x, now) === 'scheduled').slice(0, 5)) {
      notes.push({ type: 'upcoming_session', priority: 'high', icon: 'Clock', title: 'Upcoming Session', message: `${s.title} at ${s.startTime}`, data: { sessionId: s.id }, createdAt: now });
    }

    // Sessions that ended in the last three days and have no evaluation yet.
    const ended = recent.filter((s) => autoStatus(s, now) === 'completed');
    const evaluated = new Set(
      (await Promise.all(ended.map(async (s) => ((await this.evaluations.list({ sessionId: s.id }, undefined, { limit: 1, offset: 0 })).length ? s.id : null)))).filter(Boolean),
    );
    for (const s of ended.filter((x) => !evaluated.has(x.id)).slice(0, 5)) {
      notes.push({
        type: 'evaluation_pending',
        priority: 'medium',
        icon: 'AlertCircle',
        title: 'Evaluation Pending',
        message: `Please evaluate: ${s.title}`,
        data: { sessionId: s.id },
        createdAt: atTime(s.scheduledDate, s.endTime) ?? s.updatedAt,
      });
    }

    const summaries = await this.activity.summarize(activeGroups.slice(0, 10).map((g) => g.id));
    for (const g of activeGroups.slice(0, 10)) {
      const rate = summaries.get(g.id)?.averageAttendance ?? 0;
      if (rate > 0 && rate < 70) {
        notes.push({ type: 'low_attendance', priority: 'medium', icon: 'Users', title: 'Low Attendance Alert', message: `${g.name} has ${rate}% attendance`, data: { groupId: g.id }, createdAt: now });
      }
    }

    const order = { high: 1, medium: 2, low: 3 };
    return notes.sort((a, b) => order[a.priority] - order[b.priority] || b.createdAt.getTime() - a.createdAt.getTime());
  }

  async overview(trainerId: string) {
    const now = this.now();
    const [activeGroups, allGroups, sessions, evaluations] = await Promise.all([
      this.groups.list({ trainerId, status: 'active' }),
      this.groups.list({ trainerId }),
      this.sessions.list({ trainerId }),
      this.evaluations.list({ trainerId }),
    ]);
    const byCategory: Record<string, number> = {};
    for (const g of activeGroups) byCategory[g.course?.category ?? 'Other'] = (byCategory[g.course?.category ?? 'Other'] ?? 0) + 1;
    const statuses = sessions.map((s) => autoStatus(s, now));
    const completed = statuses.filter((s) => s === 'completed').length;
    const cancelled = statuses.filter((s) => s === 'cancelled').length;

    const n = evaluations.length;
    const avg = (f: (e: (typeof evaluations)[number]) => number) => (n ? evaluations.reduce((s, e) => s + f(e), 0) / n : 0);
    const evaluationStats: EvaluationSummary = {
      totalEvaluations: n,
      averageRating: n ? avg((e) => e.overallRating).toFixed(1) : 0,
      averageEngagement: n ? avg(participationScore).toFixed(1) : 0,
      averageObjectivesAchievement: Math.round(avg(performanceScore)),
      averageOverallScore: Math.round(avg(performanceScore)),
    };

    const assignments = await this.resources.assignments({ groupIds: allGroups.map((g) => g.id), visibleOnly: true });
    const ids = [...new Set(assignments.map((a) => a.resourceId))];
    const resources = ids.length ? await this.resources.list({ ids, status: 'active' }) : [];
    const resourceStats = {
      totalResources: resources.length,
      totalDownloads: 0,
      totalViews: 0,
      totalShares: 0,
      byCategory: {},
      byFileType: resources.length ? { pdf: resources.length } : {},
      totalSize: resources.reduce((s, r) => s + r.fileSize, 0),
    };

    return {
      groups: { total: activeGroups.length, byCategory },
      sessions: { total: sessions.length, completed, cancelled, completionRate: sessions.length ? Math.round((completed / sessions.length) * 100) : 0 },
      evaluations: evaluationStats,
      resources: resourceStats,
      performance: {
        averageRating: evaluationStats.averageRating || 0,
        averageEngagement: evaluationStats.averageEngagement || 0,
        averageObjectivesAchievement: evaluationStats.averageObjectivesAchievement || 0,
      },
    };
  }
}

// ═══════════════════════════ Student ═══════════════════════════

const ACTIVE = new Set(['active', 'completed']);
const priorityFor = (due: Date, now: Date) => {
  const days = Math.ceil((due.getTime() - now.getTime()) / DAY);
  return days <= 1 ? 'high' : days <= 3 ? 'medium' : 'low';
};

export class StudentDashboardService {
  constructor(
    private readonly enrollments: Pick<EnrollmentRepository, 'forStudent'>,
    private readonly courses: Pick<CourseRepository, 'findById'>,
    private readonly studentCourses: Pick<StudentCourseService, 'standing'>,
    private readonly quizzes: Pick<QuizRepository, 'submittedAttemptsOf'>,
    private readonly assignments: Pick<AssignmentRepository, 'submissionsOf' | 'dueBetween'>,
    private readonly receipts: Pick<ReceiptRepository, 'list'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async active(studentId: string): Promise<Enrollment[]> {
    return (await this.enrollments.forStudent(studentId)).filter((e) => ACTIVE.has(e.status) && e.course);
  }

  async stats(studentId: string) {
    const now = this.now();
    const enrollments = await this.active(studentId);
    const stats = {
      totalEnrolledCourses: enrollments.length,
      activeCourses: enrollments.filter((e) => e.status === 'active').length,
      completedCourses: enrollments.filter((e) => (e.status as string) === 'completed').length,
      totalSessionsCompleted: 0,
      totalSessionHours: 0,
      averageProgress: 0,
      averageAttendance: 0,
      totalPaid: 0,
      totalRemaining: 0,
      overduePayments: 0,
      totalQuizzesTaken: 0,
      averageQuizScore: null as number | null,
      totalAssignmentsSubmitted: 0,
      pendingAssignments: 0,
    };
    let progress = 0;
    let attendance = 0;
    for (const e of enrollments) {
      const course = await this.courses.findById(e.courseId);
      if (course) {
        const s = await this.studentCourses.standing(studentId, course, { creditEarlierSessions: true });
        if (s.group) {
          progress += s.progress.percentageComplete;
          attendance += s.attendance;
          stats.totalSessionsCompleted += s.progress.completedSessions + s.creditedSessions;
          stats.totalSessionHours += Math.round(s.completedHours * 10) / 10;
        }
      }
      stats.totalPaid += e.paymentPaid;
      stats.totalRemaining += Math.max(0, e.paymentTotal - e.paymentPaid);
      stats.overduePayments += e.courseInstallments.filter((i) => i.status === 'pending' && i.dueDate < now).length;
    }
    if (enrollments.length) {
      stats.averageProgress = Math.round(progress / enrollments.length);
      stats.averageAttendance = Math.round(attendance / enrollments.length);
    }
    const [attempts, submissions] = await Promise.all([this.quizzes.submittedAttemptsOf(studentId), this.assignments.submissionsOf(studentId)]);
    stats.totalQuizzesTaken = attempts.length;
    if (attempts.length) stats.averageQuizScore = Math.round(attempts.reduce((s, a) => s + (a.score ?? 0), 0) / attempts.length);
    stats.totalAssignmentsSubmitted = submissions.length;
    stats.pendingAssignments = submissions.filter((s) => s.status === 'submitted').length;
    return stats;
  }

  async recentActivity(studentId: string, limit: number) {
    const [enrollments, receipts] = await Promise.all([this.enrollments.forStudent(studentId), this.receipts.list({ studentId })]);
    const items = [
      ...enrollments
        .filter((e) => e.course)
        .slice(0, limit)
        .map((e) => ({
          _id: e.id,
          type: 'module',
          title: `Enrolled in ${e.course!.title}`,
          description: `Started course: ${e.course!.title}`,
          courseTitle: e.course!.title,
          timestamp: e.enrolledAt,
          status: e.status,
        })),
      ...receipts
        .filter((r) => r.course)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit)
        .map((r) => ({
          _id: r.id,
          type: 'payment',
          title: `Payment of $${r.amount}`,
          description: `Paid $${r.amount} for ${r.course!.title}`,
          courseTitle: r.course!.title,
          timestamp: r.createdAt,
          status: 'completed',
        })),
    ];
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  async deadlines(studentId: string, days: number) {
    const now = this.now();
    const until = new Date(now.getTime() + days * DAY);
    const enrollments = (await this.enrollments.forStudent(studentId)).filter((e) => e.status === 'active' && e.course);
    const items: { _id: string; type: string; title: string; courseTitle: string; dueDate: Date; priority: string; status: string }[] = [];
    for (const e of enrollments) {
      for (const i of e.courseInstallments.filter((x) => x.status === 'pending' && x.dueDate >= now && x.dueDate <= until)) {
        items.push({ _id: i.id, type: 'payment', title: `Payment for ${e.course!.title}`, courseTitle: e.course!.title, dueDate: i.dueDate, priority: priorityFor(i.dueDate, now), status: 'pending' });
      }
    }
    const due = await this.assignments.dueBetween(
      enrollments.map((e) => e.courseId),
      now,
      until,
    );
    for (const a of due) {
      items.push({ _id: a.id, type: 'assignment', title: a.title, courseTitle: a.course?.title ?? '', dueDate: a.dueDate, priority: priorityFor(a.dueDate, now), status: 'pending' });
    }
    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  async progress(studentId: string) {
    const enrollments = await this.active(studentId);
    return Promise.all(
      enrollments.map(async (e) => {
        const course = await this.courses.findById(e.courseId);
        const s = course ? await this.studentCourses.standing(studentId, course, { creditEarlierSessions: true }) : null;
        return {
          courseId: e.courseId,
          courseTitle: e.course!.title,
          progress: s?.progress.percentageComplete ?? 0,
          completedSessions: s?.progress.completedSessions ?? 0,
          totalSessions: s?.progress.totalSessions ?? 0,
          status: e.status,
        };
      }),
    );
  }
}

// ═══════════════════════════ Reception ═══════════════════════════

export class ReceptionDashboardService {
  constructor(
    private readonly stats: DashboardRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview() {
    const [totalStudents, totalTrainers, totalEnrollments, recentEnrollments, activeGroups] = await Promise.all([
      this.stats.countUsers(['student']),
      this.stats.countUsers(['trainer', 'teacher']),
      this.stats.countEnrollments(),
      this.stats.countEnrollments({ since: daysAgo(this.now(), 7) }),
      this.stats.countGroups('active'),
    ]);
    return { totalStudents, totalTrainers, totalEnrollments, recentEnrollments, activeGroups };
  }

  /** Payments, lead conversions and new enrollments (last 7 days), newest first. The old endpoint always crashed. */
  async recentActivities(limit: number) {
    const weekAgo = daysAgo(this.now(), 7);
    const [receipts, conversions, enrollments] = await Promise.all([this.stats.recentReceipts(limit), this.stats.recentConversions(limit), this.stats.recentEnrollments(limit)]);
    const items = [
      ...receipts.map((r) => ({
        type: 'payment',
        date: r.createdAt,
        description: `Payment received from ${r.studentName}`,
        details: { amount: r.amount, course: r.courseTitle, receiptNumber: r.receiptNumber, receivedBy: r.issuedByName },
      })),
      ...conversions.map((l) => ({ type: 'lead_converted', date: l.convertedAt, description: `${l.fullName} converted to student`, details: { leadName: l.fullName } })),
      ...enrollments
        .filter((e) => e.createdAt > weekAgo)
        .map((e) => ({
          type: 'enrollment_created',
          date: e.createdAt,
          description: `${e.studentName} enrolled in ${e.courseTitle}`,
          details: { status: e.status, studentName: e.studentName, courseName: e.courseTitle },
        })),
    ];
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit);
  }
}

