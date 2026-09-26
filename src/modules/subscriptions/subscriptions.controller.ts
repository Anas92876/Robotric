import type { Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { ForbiddenError } from '../../shared/http/errors';
import { currentUser } from '../../shared/http/request-user';
import { numeric, parse } from '../../shared/http/validate';
import type { SessionReport, SessionRequest, UserSubscription } from './subscriptions.repository';
import type { SessionRequestService, UserSubscriptionService } from './subscriptions.service';
import { SESSION_REQUEST_STATUSES } from './subscriptions.table';

// ─── Response shapes ─────────────────────────────────────────────────────────

function subscriptionDoc(s: UserSubscription, now = new Date()) {
  // The old pre-save hook stored "expired" once the end date passed; report it on read too.
  const status = s.status === 'active' && s.endsAt < now ? 'expired' : s.status;
  return {
    _id: s.id,
    userId: s.user ? { _id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role } : s.userId,
    planId: s.plan ? { _id: s.plan.id, name: s.plan.name, monthlyHours: s.plan.monthlyHours, price: s.plan.price } : s.planId,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    remainingHours: s.remainingHours,
    status,
    canceledAt: s.canceledAt,
    canceledBy: s.canceledById,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    isCurrentlyActive: status === 'active' && s.startsAt <= now && s.endsAt > now,
    id: s.id,
  };
}

const person = (p: { id: string; name: string; email: string } | null, withEmail = true) =>
  p ? (withEmail ? { _id: p.id, name: p.name, email: p.email } : { _id: p.id, name: p.name }) : null;

const requestSummary = (r: SessionRequest) => ({
  _id: r.id,
  date: r.date,
  startTime: r.startTime,
  durationHours: r.durationHours,
  description: r.description,
  status: r.status,
});

function reportDoc(r: SessionReport, pdfUrl: string | null, withStudent: boolean) {
  return {
    _id: r.id,
    sessionRequestId: r.request ? r.request.id : null,
    sessionRequest: r.request ? { ...requestSummary(r.request), ...(withStudent ? { userId: person(r.request.user) } : {}) } : null,
    notes: r.notes,
    pdfUrl,
    attendance: r.attendance,
    createdBy: person(r.createdBy),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const assignBody = z.object({ userId: z.string().optional(), planId: z.string().optional(), startsAt: z.string().optional(), endsAt: z.string().optional() });
const updateBody = z.object({ endsAt: z.string().optional(), remainingHours: numeric('Remaining hours must be a number').optional() });
const requestBody = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
  durationHours: numeric('Duration must be a number').optional(),
  description: z.string().optional(),
});

// ─── Reception ───────────────────────────────────────────────────────────────

export class ReceptionSubscriptionController {
  constructor(
    private readonly subscriptions: UserSubscriptionService,
    private readonly sessions: SessionRequestService,
  ) {}

  list = async (req: Request, res: Response) => {
    const q = req.query as Record<string, string | undefined>;
    const status = q.status && ['active', 'expired', 'canceled'].includes(q.status) ? q.status : undefined;
    const list = await this.subscriptions.list({ status, userId: q.userId });
    res.json({ success: true, data: { subscriptions: list.map((s) => subscriptionDoc(s)) } });
  };

  assign = async (req: Request, res: Response) => {
    const s = await this.subscriptions.assign(parse(assignBody, req.body), currentUser(req).id);
    res.status(201).json({ success: true, message: 'Subscription assigned successfully', data: subscriptionDoc(s) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const s = await this.subscriptions.update(req.params.id, parse(updateBody, req.body));
    res.json({ success: true, message: 'Subscription updated successfully', data: subscriptionDoc(s) });
  };

  cancel = async (req: Request<{ id: string }>, res: Response) => {
    const s = await this.subscriptions.cancel(req.params.id, currentUser(req).id);
    res.json({ success: true, message: 'Subscription canceled successfully', data: subscriptionDoc(s) });
  };

  requests = async (req: Request, res: Response) => {
    const raw = req.query.status;
    const status = typeof raw === 'string' && (SESSION_REQUEST_STATUSES as readonly string[]).includes(raw) ? (raw as SessionRequest['status']) : undefined;
    const list = await this.sessions.all(status);
    res.json({
      success: true,
      data: {
        requests: list.map((r) => ({
          ...requestSummary(r),
          userId: person(r.user),
          createdAt: r.createdAt,
          approvedAt: r.approvedAt,
          approvedBy: person(r.approvedBy, false),
          declinedAt: r.declinedAt,
          declinedBy: person(r.declinedBy, false),
          declineReason: r.declineReason,
          canceledAt: r.canceledAt,
          completedAt: r.completedAt,
        })),
      },
    });
  };

  approve = async (req: Request<{ id: string }>, res: Response) => {
    const r = await this.sessions.approve(req.params.id, currentUser(req).id);
    res.json({ success: true, message: 'Session request approved successfully', data: { _id: r.id, status: r.status, approvedAt: r.approvedAt } });
  };

  decline = async (req: Request<{ id: string }>, res: Response) => {
    const { reason } = parse(z.object({ reason: z.string().optional() }), req.body);
    const r = await this.sessions.decline(req.params.id, reason, currentUser(req).id);
    res.json({
      success: true,
      message: 'Session request declined successfully',
      data: { _id: r.id, status: r.status, declinedAt: r.declinedAt, declineReason: r.declineReason },
    });
  };

  report = async (req: Request<{ id: string }>, res: Response) => {
    const body = (req.body ?? {}) as { notes?: string; attendance?: unknown };
    const report = await this.sessions.report(req.params.id, body, req.file, currentUser(req).id);
    res.status(201).json({
      success: true,
      message: 'Session report created successfully',
      data: {
        _id: report.id,
        sessionRequestId: report.sessionRequestId,
        notes: report.notes,
        pdfUrl: await this.sessions.pdfLink(report),
        attendance: report.attendance,
        createdAt: report.createdAt,
      },
    });
  };

  reports = async (req: Request, res: Response) => {
    const list = await this.sessions.receptionReports(currentUser(req).id);
    const reports = await Promise.all(list.map(async (r) => reportDoc(r, await this.sessions.pdfLink(r), true)));
    res.json({ success: true, data: { reports } });
  };
}

// ─── Student (/api/subscriptions) ────────────────────────────────────────────

export class StudentSubscriptionController {
  constructor(
    private readonly subscriptions: UserSubscriptionService,
    private readonly sessions: SessionRequestService,
  ) {}

  /** Gate for booking endpoints, with the old middleware's message. */
  requireActive: RequestHandler = async (req, _res, next) => {
    if (!(await this.subscriptions.current(currentUser(req).id))) {
      throw new ForbiddenError('Active subscription required to access this resource', 'SUBSCRIPTION_REQUIRED');
    }
    next();
  };

  me = async (req: Request, res: Response) => {
    const s = await this.subscriptions.current(currentUser(req).id);
    res.json({
      success: true,
      data: s
        ? {
            hasActiveSubscription: true,
            subscription: {
              _id: s.id,
              plan: s.plan ? { _id: s.plan.id, name: s.plan.name, monthlyHours: s.plan.monthlyHours, price: s.plan.price } : null,
              startsAt: s.startsAt,
              endsAt: s.endsAt,
              remainingHours: s.remainingHours,
              status: s.status,
            },
          }
        : { hasActiveSubscription: false, subscription: null },
    });
  };

  createRequest = async (req: Request, res: Response) => {
    const r = await this.sessions.request(currentUser(req).id, parse(requestBody, req.body));
    res.status(201).json({ success: true, message: 'Session request created successfully', data: { ...requestSummary(r), createdAt: r.createdAt } });
  };

  myRequests = async (req: Request, res: Response) => {
    const list = await this.sessions.mine(currentUser(req).id);
    res.json({
      success: true,
      data: {
        requests: list.map((r) => ({
          ...requestSummary(r),
          createdAt: r.createdAt,
          approvedAt: r.approvedAt,
          declinedAt: r.declinedAt,
          declineReason: r.declineReason,
          canceledAt: r.canceledAt,
          completedAt: r.completedAt,
        })),
      },
    });
  };

  cancelRequest = async (req: Request<{ id: string }>, res: Response) => {
    const r = await this.sessions.cancel(currentUser(req).id, req.params.id);
    res.json({ success: true, message: 'Session request canceled successfully', data: { _id: r.id, status: r.status, canceledAt: r.canceledAt } });
  };

  report = async (req: Request<{ id: string }>, res: Response) => {
    const r = await this.sessions.reportFor(currentUser(req).id, req.params.id);
    res.json({ success: true, data: await reportDoc(r, await this.sessions.pdfLink(r), false) });
  };

  myReports = async (req: Request, res: Response) => {
    const list = await this.sessions.myReports(currentUser(req).id);
    const reports = await Promise.all(list.map(async (r) => reportDoc(r, await this.sessions.pdfLink(r), false)));
    res.json({ success: true, data: { reports } });
  };
}
