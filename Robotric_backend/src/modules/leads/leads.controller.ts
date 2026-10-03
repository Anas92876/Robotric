import type { Request, Response } from 'express';
import { paginationMeta, parsePagination } from '../../shared/http/pagination';
import { currentUser } from '../../shared/http/request-user';
import { parse } from '../../shared/http/validate';
import type { Lead, PersonRef } from './leads.repository';
import {
  changeStatusBody,
  convertBody,
  createLeadBody,
  followUpBody,
  listLeadsQuery,
  setWaitingBody,
  updateLeadBody,
} from './leads.schemas';
import type { LeadService } from './leads.service';

const person = (p: PersonRef | null) => (p ? { _id: p.id, name: p.name, email: p.email } : null);

/** The lead document exactly as the old API returned it (Mongoose field names and nesting). */
export function leadDoc(l: Lead) {
  return {
    _id: l.id,
    fullName: l.fullName,
    englishName: l.englishName,
    firstName: l.firstName,
    lastName: l.lastName,
    gender: l.gender,
    fatherName: l.fatherName,
    motherName: l.motherName,
    dateOfBirth: l.dateOfBirth,
    age: l.age,
    residence: l.residence,
    schoolName: l.schoolName,
    mobileNumber: l.mobileNumber,
    mobileNumberLabel: l.mobileNumberLabel,
    additionalNumbers: l.additionalNumbers,
    socialMedia: l.socialMedia,
    assignedTo: person(l.assignedTo),
    interestField: l.interestField,
    referralSource: l.referralSource,
    notes: l.notes,
    leadDate: l.leadDate,
    status: l.status,
    waitingInfo: {
      courseId: l.waitingCourse ? { _id: l.waitingCourse.id, title: l.waitingCourse.title, price: l.waitingCourse.price } : null,
      depositAmount: l.depositAmount,
      depositPaidAt: l.depositPaidAt,
      depositMethod: l.depositMethod,
      depositNotes: l.depositNotes,
    },
    statusHistory: l.statusHistory.map((s) => ({
      _id: s.id,
      fromStatus: s.fromStatus,
      toStatus: s.toStatus,
      reason: s.reason,
      changedBy: s.changedById,
      changedAt: s.changedAt,
    })),
    isBannedFromPlatform: l.isBannedFromPlatform,
    blacklistReason: l.blacklistReason,
    followUps: l.followUps.map((f) => ({ _id: f.id, note: f.note, date: f.date, by: f.byId })),
    nextFollowUpDate: l.nextFollowUpDate,
    convertedToStudent: person(l.convertedToStudent),
    convertedAt: l.convertedAt,
    createdBy: l.createdById,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

type IdReq = Request<{ id: string }>;

/** Responses have no `success` field here — that is how the old lead endpoints answered. */
export class LeadController {
  constructor(private readonly leads: LeadService) {}

  list = async (req: Request, res: Response) => {
    const page = parsePagination(req.query);
    const { items, total } = await this.leads.list(parse(listLeadsQuery, req.query), page);
    res.json({ leads: items.map(leadDoc), pagination: paginationMeta(total, page) });
  };

  waiting = async (req: Request, res: Response) => {
    const page = parsePagination(req.query, { defaultLimit: 50 });
    const courseId = typeof req.query.courseId === 'string' && req.query.courseId ? req.query.courseId : undefined;
    const { items, total } = await this.leads.listWaiting(courseId, page);
    res.json({ leads: items.map(leadDoc), pagination: paginationMeta(total, page) });
  };

  stats = async (_req: Request, res: Response) => {
    res.json(await this.leads.stats());
  };

  get = async (req: IdReq, res: Response) => {
    res.json(leadDoc(await this.leads.get(req.params.id)));
  };

  create = async (req: Request, res: Response) => {
    const lead = await this.leads.create(parse(createLeadBody, req.body), currentUser(req).id);
    res.status(201).json({ message: 'Lead created successfully', lead: leadDoc(lead) });
  };

  update = async (req: IdReq, res: Response) => {
    const lead = await this.leads.update(req.params.id, parse(updateLeadBody, req.body));
    res.json({ message: 'Lead updated successfully', lead: leadDoc(lead) });
  };

  delete = async (req: IdReq, res: Response) => {
    await this.leads.delete(req.params.id);
    res.json({ message: 'Lead deleted successfully' });
  };

  addFollowUp = async (req: IdReq, res: Response) => {
    const { note, nextFollowUpDate } = parse(followUpBody, req.body);
    const lead = await this.leads.addFollowUp(req.params.id, note, nextFollowUpDate, currentUser(req).id);
    res.json({ message: 'Follow-up added successfully', lead: leadDoc(lead) });
  };

  changeStatus = async (req: IdReq, res: Response) => {
    const { newStatus, reason, isBannedFromPlatform } = parse(changeStatusBody, req.body);
    const lead = await this.leads.changeStatus(req.params.id, newStatus, reason, isBannedFromPlatform, currentUser(req).id);
    res.json({ message: 'Lead status changed successfully', lead: leadDoc(lead) });
  };

  convert = async (req: IdReq, res: Response) => {
    const { email, password } = parse(convertBody, req.body);
    const { student, lead } = await this.leads.convertToStudent(req.params.id, email, password);
    res.json({
      message: 'Lead converted to student successfully',
      student: { _id: student.id, name: student.name, email: student.email, role: student.role },
      lead: leadDoc(lead),
    });
  };

  setWaiting = async (req: IdReq, res: Response) => {
    const { user, lead } = await this.leads.setWaiting(req.params.id, parse(setWaitingBody, req.body), currentUser(req).id);
    res.status(201).json({
      message: 'Lead set to waiting list successfully',
      lead: leadDoc(lead),
      user: { _id: user.id, name: user.name, email: user.email },
    });
  };
}
