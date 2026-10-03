import type { Request, Response } from 'express';
import { z } from 'zod';
import { NotFoundError } from '../../shared/http/errors';
import { paginationMeta, parsePagination } from '../../shared/http/pagination';
import { parse } from '../../shared/http/validate';
import type { Contact, ContactRepository } from './contacts.repository';
import { CONTACT_STATUSES, CONTACT_WHO } from './contacts.table';

// Joi-style messages, as the old validation middleware produced them.
const optional = (field: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `"${field}" length must be less than or equal to ${max} characters long`)
    .nullish()
    .transform((v) => v ?? '');

export const submitContactBody = z.object({
  name: z
    .string({ error: '"name" is required' })
    .trim()
    .min(2, '"name" length must be at least 2 characters long')
    .max(100, '"name" length must be less than or equal to 100 characters long'),
  phone: z
    .string({ error: '"phone" is required' })
    .trim()
    .regex(/^[0-9+\-\s()]{8,}$/, 'Invalid phone number format'),
  email: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Invalid email address format')
    .transform((v) => v ?? ''),
  location: optional('location', 200),
  who: z.enum(CONTACT_WHO, { error: '"who" must be one of [student, parent, business-owner, other]' }).or(z.literal('')).nullish().transform((v) => v || null),
  otherType: optional('otherType', 100),
  subject: z
    .string({ error: '"subject" is required' })
    .trim()
    .min(3, '"subject" length must be at least 3 characters long')
    .max(200, '"subject" length must be less than or equal to 200 characters long'),
  message: optional('message', 5000),
});

const updateContactBody = z.object({
  status: z.enum(CONTACT_STATUSES, { error: '"status" must be one of [new, read, replied, archived]' }).optional(),
  convertedToLead: z.string().nullish(),
});

const listQuery = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  fromDate: z.coerce.date().optional().catch(undefined),
  toDate: z.coerce.date().optional().catch(undefined),
});

function contactDoc(c: Contact) {
  return {
    _id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    location: c.location,
    who: c.who,
    otherType: c.otherType,
    subject: c.subject,
    message: c.message,
    status: c.status,
    convertedToLead: c.convertedToLead
      ? { _id: c.convertedToLead.id, fullName: c.convertedToLead.fullName, mobileNumber: c.convertedToLead.mobileNumber }
      : null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/**
 * Website contact-form messages. Plain CRUD with no business rules, so the
 * controller uses the repository interface directly.
 */
export class ContactController {
  constructor(private readonly contacts: ContactRepository) {}

  /** POST /api/contact — public. Validation failures answer "Validation failed" with every field listed. */
  submit = async (req: Request, res: Response) => {
    const input = parse(submitContactBody, req.body, 'Validation failed');
    const contact = await this.contacts.create({ ...input, status: 'new' });
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      data: { id: contact.id, name: contact.name, phone: contact.phone, subject: contact.subject, createdAt: contact.createdAt },
    });
  };

  list = async (req: Request, res: Response) => {
    const page = parsePagination(req.query);
    const [{ items, total }, stats] = await Promise.all([
      this.contacts.list(parse(listQuery, req.query), page),
      this.contacts.counts(),
    ]);
    res.json({ success: true, data: items.map(contactDoc), pagination: paginationMeta(total, page), stats });
  };

  get = async (req: Request<{ id: string }>, res: Response) => {
    const contact = await this.contacts.findById(req.params.id);
    if (!contact) throw new NotFoundError('Contact');
    res.json({ success: true, data: contactDoc(contact) });
  };

  update = async (req: Request<{ id: string }>, res: Response) => {
    const { status, convertedToLead } = parse(updateContactBody, req.body);
    const changes = { ...(status ? { status } : {}), ...(convertedToLead ? { convertedToLeadId: convertedToLead } : {}) };
    const found = Object.keys(changes).length > 0 ? await this.contacts.update(req.params.id, changes) : Boolean(await this.contacts.findById(req.params.id));
    if (!found) throw new NotFoundError('Contact');
    res.json({ success: true, message: 'Contact updated successfully', data: contactDoc((await this.contacts.findById(req.params.id))!) });
  };

  delete = async (req: Request<{ id: string }>, res: Response) => {
    if (!(await this.contacts.delete(req.params.id))) throw new NotFoundError('Contact');
    res.json({ success: true, message: 'Contact deleted successfully' });
  };
}
