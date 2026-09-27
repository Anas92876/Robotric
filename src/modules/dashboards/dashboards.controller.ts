import type { Request, Response } from 'express';
import { currentUser } from '../../shared/http/request-user';
import { autoStatus } from '../sessions/session-time';
import { userDoc } from '../users/users.controller';
import type { CloDashboardService, CloTrainerService, ReceptionDashboardService, StudentDashboardService, TrainerDashboardService } from './dashboards.service';

const query = (req: Request) => req.query as Record<string, string | undefined>;
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;
const limitOf = (v: string | undefined, fallback: number) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : fallback;
};

/** GET /api/clo/dashboard and /api/clo/analytics */
export class CloDashboardController {
  constructor(private readonly dashboard: CloDashboardService) {}

  overview = async (_req: Request, res: Response) => {
    const r = await this.dashboard.overview();
    res.json({
      success: true,
      data: {
        stats: r.stats,
        topTrainers: r.topTrainers,
        recentActivity: {
          groups: r.recentGroups.map((g) => ({
            _id: g.id,
            name: g.name,
            courseId: g.course ? { _id: g.course.id, title: g.course.title } : g.courseId,
            trainerId: g.trainer ? { _id: g.trainer.id, name: g.trainer.name, email: g.trainer.email } : g.trainerId,
            startDate: g.startDate,
            status: g.status,
            createdAt: g.createdAt,
          })),
          courses: r.recentCourses.map((c) => ({ _id: c.id, title: c.title, category: c.category, status: c.status, duration: c.duration, createdAt: c.createdAt })),
        },
      },
    });
  };

  analytics = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.analytics(query(req).period) });
  };
}

type IdReq = Request<{ id: string }>;

/** /api/clo/trainers */
export class CloTrainerController {
  constructor(private readonly trainers: CloTrainerService) {}

  list = async (req: Request, res: Response) => {
    const list = await this.trainers.list(query(req));
    res.json({
      success: true,
      data: list.map((t) => ({
        _id: t.id,
        name: t.name,
        email: t.email,
        role: t.role,
        profile: t.profile,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        stats: {
          totalGroups: t.totalGroups,
          activeGroups: t.activeGroups,
          totalStudents: t.totalStudents,
          coursesCount: t.coursesCount,
          avgAttendance: t.records > 0 ? (t.attended / t.records) * 100 : 0,
        },
      })),
    });
  };

  create = async (req: Request, res: Response) => {
    const trainer = await this.trainers.create(body(req));
    res.status(201).json({ success: true, message: 'Trainer created successfully', data: userDoc(trainer) });
  };

  update = async (req: IdReq, res: Response) => {
    const trainer = await this.trainers.update(req.params.id, body(req));
    res.json({ success: true, message: 'Trainer updated successfully', data: userDoc(trainer) });
  };

  /** DELETE /api/clo/trainers/:id — deactivates (or, with `action: 'activate'`, reactivates). */
  deactivate = async (req: IdReq, res: Response) => {
    const { trainer, status, activated } = await this.trainers.setActive(req.params.id, body(req).action);
    res.json({
      success: true,
      message: `Trainer ${activated ? 'activated' : 'deactivated'} successfully`,
      data: { _id: trainer.id, name: trainer.name, email: trainer.email, status },
    });
  };

  performance = async (req: IdReq, res: Response) => {
    const r = await this.trainers.performance(req.params.id, query(req).period);
    res.json({
      success: true,
      data: {
        trainer: { _id: r.trainer.id, name: r.trainer.name, email: r.trainer.email, profile: r.trainer.profile },
        performance: {
          period: r.days,
          totalGroups: r.groups.length,
          activeGroups: r.groups.filter((g) => g.status === 'active').length,
          totalStudents: r.totalStudents,
          coursesCount: r.courses.length,
          overallAttendanceRate: r.overallAttendanceRate,
        },
        groups: r.groups.map((g) => ({
          _id: g.id,
          name: g.name,
          courseId: g.course ? { _id: g.course.id, title: g.course.title, category: g.course.category } : g.courseId,
          students: (r.members.get(g.id) ?? []).map((m) => m.id),
          status: g.status,
          startDate: g.startDate,
          endDate: g.endDate,
        })),
        courses: r.courses.map((c) => ({ _id: c.id, title: c.title, category: c.category })),
        attendanceTrends: r.trends.map((d) => ({ _id: d.day, totalRecords: d.total, presentCount: d.present, lateCount: d.late, absentCount: d.absent })),
      },
    });
  };

  assignCourse = async (req: IdReq, res: Response) => {
    const { trainer, course } = await this.trainers.assignCourse(req.params.id, body(req).courseId);
    res.json({
      success: true,
      message: 'Trainer assigned to course successfully',
      data: { trainerId: trainer.id, trainerName: trainer.name, courseId: course.id, courseTitle: course.title },
    });
  };

  removeCourse = async (req: Request<{ trainerId: string; courseId: string }>, res: Response) => {
    await this.trainers.removeCourse(req.params.trainerId, req.params.courseId);
    res.json({ success: true, message: 'Trainer removed from course successfully' });
  };
}

/** /api/trainer/dashboard */
export class TrainerDashboardController {
  constructor(private readonly dashboard: TrainerDashboardService) {}

  stats = async (req: Request, res: Response) => {
    const r = await this.dashboard.stats(currentUser(req).id);
    const now = new Date();
    res.json({
      success: true,
      data: {
        activeGroups: r.activeGroups,
        todaysSessions: r.todaysSessions.length,
        completedToday: r.completedToday,
        weekSessions: r.weekSessions,
        totalStudents: r.totalStudents,
        upcomingSessions: r.upcomingSessions,
        averageRating: r.averageRating,
        todaysSessionsList: r.todaysSessions.map((s) => ({
          _id: s.id,
          title: s.title,
          groupName: s.group?.name ?? 'Unknown Group',
          startTime: s.startTime,
          endTime: s.endTime,
          status: autoStatus(s, now),
          location: null,
        })),
      },
    });
  };

  schedule = async (req: Request, res: Response) => {
    const list = await this.dashboard.schedule(currentUser(req).id);
    const now = new Date();
    res.json({
      success: true,
      data: list.map(({ session: s, studentsCount, sheetId }) => ({
        _id: s.id,
        title: s.title,
        description: s.description,
        groupName: s.group?.name ?? 'Unknown',
        courseName: s.course?.title ?? 'Unknown',
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        location: null,
        status: autoStatus(s, now),
        studentsCount,
        attendanceMarked: Boolean(sheetId),
        attendanceId: sheetId,
      })),
    });
  };

  activities = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.activities(currentUser(req).id, limitOf(query(req).limit, 20)) });
  };

  notifications = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.notifications(currentUser(req).id) });
  };

  overview = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.overview(currentUser(req).id) });
  };
}

/** /api/student/dashboard */
export class StudentDashboardController {
  constructor(private readonly dashboard: StudentDashboardService) {}

  stats = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.stats(currentUser(req).id) });
  };

  recentActivity = async (req: Request, res: Response) => {
    const data = await this.dashboard.recentActivity(currentUser(req).id, limitOf(query(req).limit, 10));
    res.json({ success: true, count: data.length, data });
  };

  deadlines = async (req: Request, res: Response) => {
    const data = await this.dashboard.deadlines(currentUser(req).id, limitOf(query(req).days, 7));
    res.json({ success: true, count: data.length, data });
  };

  progress = async (req: Request, res: Response) => {
    const data = await this.dashboard.progress(currentUser(req).id);
    res.json({ success: true, count: data.length, data });
  };
}

/** /api/reception/dashboard and /recent-activities */
export class ReceptionDashboardController {
  constructor(private readonly dashboard: ReceptionDashboardService) {}

  stats = async (_req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.overview() });
  };

  recentActivities = async (req: Request, res: Response) => {
    res.json({ success: true, data: await this.dashboard.recentActivities(limitOf(query(req).limit, 20)) });
  };
}
