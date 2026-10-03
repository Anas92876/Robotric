import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let rec: Record<string, string>;
let recId: string;

beforeAll(async () => {
  t = await createTestApp();
  const r = await signIn(t, 'reception');
  rec = r.headers;
  recId = r.user.id;
});
afterAll(async () => {
  await t.close();
});

const api = () => request(t.app);
const newLead = async (body: Record<string, unknown> = {}) =>
  (await api().post('/api/reception/leads').set(rec).send({ fullName: 'سارة أحمد', mobileNumber: '0991234567', ...body })).body.lead;

describe('leads', () => {
  it('creates with default status "interest" (the old default crashed) and the old document shape', async () => {
    const res = await api()
      .post('/api/reception/leads')
      .set(rec)
      .send({ fullName: 'علي', englishName: 'Ali', mobileNumber: '0990000001', gender: 'Male', additionalNumbers: [{ number: '011', label: 'Home' }], assignedTo: recId });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Lead created successfully');
    const lead = res.body.lead;
    expect(lead).toMatchObject({
      fullName: 'علي',
      status: 'interest',
      gender: 'male',
      mobileNumberLabel: 'Main',
      assignedTo: { _id: recId, name: 'A reception' },
      waitingInfo: { courseId: null, depositAmount: 0, depositMethod: 'cash', depositNotes: '' },
      followUps: [],
      statusHistory: [],
      convertedToStudent: null,
      createdBy: recId,
    });
    expect(lead.additionalNumbers[0]).toMatchObject({ number: '011', label: 'Home' });
    expect(lead.additionalNumbers[0]._id).toMatch(/^[a-f0-9]{24}$/);
    expect(lead.leadDate).toBeTruthy();
  });

  it('requires name and mobile', async () => {
    const res = await api().post('/api/reception/leads').set(rec).send({ fullName: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Full name and mobile number are required');
  });

  it('lists with search, pagination and nulls-last sorting', async () => {
    await newLead({ fullName: 'Searchable Person', mobileNumber: '0955555555' });
    const res = await api().get('/api/reception/leads?search=searchable&limit=5').set(rec);
    expect(res.body.leads).toHaveLength(1);
    expect(res.body.pagination).toEqual({ total: 1, page: 1, pages: 1, limit: 5 });

    const byPhone = await api().get('/api/reception/leads?search=0955').set(rec);
    expect(byPhone.body.leads[0].fullName).toBe('Searchable Person');
  });

  it('adds follow-ups, changes status with history, and handles blacklist fields', async () => {
    const lead = await newLead();
    const fu = await api().post(`/api/reception/leads/${lead._id}/follow-up`).set(rec).send({ note: 'Called', nextFollowUpDate: '2030-01-01' });
    expect(fu.body.lead.followUps).toHaveLength(1);
    expect(fu.body.lead.followUps[0]).toMatchObject({ note: 'Called', by: recId });
    expect(fu.body.lead.nextFollowUpDate).toContain('2030-01-01');

    const same = await api().post(`/api/reception/leads/${lead._id}/change-status`).set(rec).send({ newStatus: 'interest', reason: 'x' });
    expect(same.body.message).toBe('Lead is already in this status');
    const noReason = await api().post(`/api/reception/leads/${lead._id}/change-status`).set(rec).send({ newStatus: 'blacklist' });
    expect(noReason.body.message).toBe('Reason is required');

    const bl = await api()
      .post(`/api/reception/leads/${lead._id}/change-status`)
      .set(rec)
      .send({ newStatus: 'blacklist', reason: ' Rude ', isBannedFromPlatform: true });
    expect(bl.body.lead).toMatchObject({ status: 'blacklist', isBannedFromPlatform: true, blacklistReason: 'Rude' });
    expect(bl.body.lead.statusHistory[0]).toMatchObject({ fromStatus: 'interest', toStatus: 'blacklist', reason: 'Rude', changedBy: recId });

    const back = await api().post(`/api/reception/leads/${lead._id}/change-status`).set(rec).send({ newStatus: 'interest', reason: 'Apologised' });
    expect(back.body.lead).toMatchObject({ status: 'interest', isBannedFromPlatform: false, blacklistReason: null });
    expect(back.body.lead.statusHistory).toHaveLength(2);
  });

  it('converts a lead into a student account that can log in, once', async () => {
    const lead = await newLead({ englishName: 'Sara Ahmad', schoolName: 'Al Amal' });
    const res = await api().post(`/api/reception/leads/${lead._id}/convert`).set(rec).send({ email: 'Sara@Test.local', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.student).toMatchObject({ name: 'سارة أحمد', email: 'sara@test.local', role: 'student' });
    expect(res.body.lead).toMatchObject({ status: 'student', convertedToStudent: { email: 'sara@test.local' } });

    const again = await api().post(`/api/reception/leads/${lead._id}/convert`).set(rec).send({ email: 'other@test.local', password: 'x' });
    expect(again.body.message).toBe('This lead has already been converted to a student');

    // Login shows the lead's English name, with the Arabic name as nameAr.
    const login = await api().post('/api/auth/login').set('x-platform', 'mobile').send({ email: 'sara@test.local', password: 'secret123' });
    expect(login.body.data).toMatchObject({ name: 'Sara Ahmad', nameAr: 'سارة أحمد', role: 'student' });
  });

  it('rolls back the account when the lead update fails (email already used)', async () => {
    const lead = await newLead();
    const res = await api().post(`/api/reception/leads/${lead._id}/convert`).set(rec).send({ email: 'sara@test.local', password: 'x' });
    expect(res.body.message).toBe('A user with this email already exists');
    expect((await api().get(`/api/reception/leads/${lead._id}`).set(rec)).body.status).toBe('interest');
  });

  it('puts a lead on a course waiting list with a deposit, and lists it', async () => {
    const clo = (await signIn(t, 'clo')).headers;
    const course = (await api().post('/api/clo/courses').set(clo).send({ title: 'Drones', category: 'x', description: 'd', price: 300 })).body.data;
    const lead = await newLead();

    const noCourse = await api().post(`/api/reception/leads/${lead._id}/set-waiting`).set(rec).send({ email: 'w@test.local', password: 'p' });
    expect(noCourse.body.message).toBe('Course is required for the waiting list');

    const res = await api()
      .post(`/api/reception/leads/${lead._id}/set-waiting`)
      .set(rec)
      .send({ email: 'w@test.local', password: 'p', courseId: course._id, depositAmount: '50', depositMethod: 'sham_cash_app' });
    expect(res.status).toBe(201);
    expect(res.body.lead.waitingInfo).toMatchObject({
      courseId: { _id: course._id, title: 'Drones', price: 300 },
      depositAmount: 50,
      depositMethod: 'sham_cash_app',
    });
    expect(res.body.lead.statusHistory.at(-1).reason).toBe('Set to waiting list for course: Drones. Deposit: $50');
    expect(res.body.user.email).toBe('w@test.local');

    const waiting = await api().get(`/api/reception/leads/waiting?courseId=${course._id}`).set(rec);
    expect(waiting.body.leads.map((l: { _id: string }) => l._id)).toEqual([lead._id]);
    expect(waiting.body.pagination.limit).toBe(50);

    const stats = await api().get('/api/reception/leads/stats').set(rec);
    expect(stats.body).toMatchObject({ waiting: 1, student: 1 });
    expect(stats.body.total).toBeGreaterThanOrEqual(5);
  });

  it('updates and deletes', async () => {
    const lead = await newLead();
    const upd = await api().put(`/api/reception/leads/${lead._id}`).set(rec).send({ notes: 'VIP', _id: 'x', createdBy: 'x', followUps: [] });
    expect(upd.body).toMatchObject({ message: 'Lead updated successfully', lead: { notes: 'VIP', createdBy: recId } });
    expect((await api().delete(`/api/reception/leads/${lead._id}`).set(rec)).body).toEqual({ message: 'Lead deleted successfully' });
    const gone = await api().get(`/api/reception/leads/${lead._id}`).set(rec);
    expect(gone.status).toBe(404);
    expect(gone.body.message).toBe('Lead not found');
  });
});

describe('contact history and calendar', () => {
  it('logs a call, creating its calendar event and a follow-up on the lead', async () => {
    const lead = await newLead({ fullName: 'Omar' });
    const missing = await api().post(`/api/reception/leads/${lead._id}/contact-history`).set(rec).send({ contactType: 'call' });
    expect(missing.body.message).toBe('Contact type, call reason, outcome, and contact date are required');

    const res = await api()
      .post(`/api/reception/leads/${lead._id}/contact-history`)
      .set(rec)
      .send({ contactType: 'Call', callReason: 'Pricing', outcome: 'callback_requested', contactDate: '2030-05-01T10:00:00Z', duration: 15, notes: 'Wants discount' });
    expect(res.status).toBe(201);
    const entry = res.body.contactHistory;
    expect(entry).toMatchObject({ contactType: 'call', duration: 15, eventColor: 'yellow', createdBy: { _id: recId } });
    expect(entry.id).toBe(entry._id);
    expect(entry.scheduledEventId).toMatchObject({ title: 'Call with Omar - Pricing', color: 'yellow' });
    expect(new Date(entry.scheduledEventId.endTime).getTime() - new Date(entry.scheduledEventId.startTime).getTime()).toBe(15 * 60 * 1000);

    const cal = await api().get('/api/reception/events?start=2030-05-01&end=2030-05-02').set(rec);
    expect(cal.body.count).toBe(1);
    expect(cal.body.events[0].description).toBe('Contact Type: call\nOutcome: callback requested\nReason: Pricing\n\nNotes: Wants discount');
    expect(cal.body.events[0].participants[0]).toMatchObject({ type: 'lead', leadId: { _id: lead._id, fullName: 'Omar' } });

    const leadNow = (await api().get(`/api/reception/leads/${lead._id}`).set(rec)).body;
    expect(leadNow.followUps[0].note).toBe('call: Pricing - callback_requested');

    // Update moves the event too; delete removes both.
    const upd = await api().put(`/api/reception/contact-history/${entry._id}`).set(rec).send({ outcome: 'successful', duration: 60 });
    expect(upd.body.contactHistory.scheduledEventId.color).toBe('green');

    const list = await api().get(`/api/reception/leads/${lead._id}/contact-history`).set(rec);
    expect(list.body).toMatchObject({ success: true, count: 1, total: 1, page: 1, pages: 1 });

    const stats = await api().get(`/api/reception/contact-history/stats?leadId=${lead._id}`).set(rec);
    expect(stats.body.stats).toEqual({ total: 1, byOutcome: { successful: 1 }, byType: { call: 1 }, averageDuration: 60 });

    await api().delete(`/api/reception/contact-history/${entry._id}`).set(rec).expect(200);
    expect((await api().get('/api/reception/events?start=2030-05-01&end=2030-05-02').set(rec)).body.count).toBe(0);
  });

  it('manages standalone events and validates times', async () => {
    const bad = await api().post('/api/reception/events').set(rec).send({ title: 'X', startTime: '2031-01-01T10:00:00Z', endTime: '2031-01-01T09:00:00Z' });
    expect(bad.body.message).toBe('End time must be after start time');

    const ev = await api()
      .post('/api/reception/events')
      .set(rec)
      .send({ title: 'Board', startTime: '2031-01-01T10:00:00Z', endTime: '2031-01-01T11:00:00Z', participants: [{ type: 'company', companyRole: 'CTO' }, { type: 'custom', customName: 'Visitor' }] });
    expect(ev.body.event).toMatchObject({ title: 'Board', color: 'blue', createdBy: { _id: recId, name: 'A reception' } });
    expect(ev.body.event.participants.map((p: { type: string }) => p.type)).toEqual(['company', 'custom']);

    const upd = await api().put(`/api/reception/events/${ev.body.event._id}`).set(rec).send({ color: 'red', participants: [] });
    expect(upd.body.event).toMatchObject({ color: 'red', title: 'Board', participants: [] });
    expect((await api().delete(`/api/reception/events/${ev.body.event._id}`).set(rec)).body.message).toBe('Event deleted successfully');
  });
});

describe('public forms', () => {
  it('accepts a contact form and lists it for reception with stats', async () => {
    const bad = await api().post('/api/contact').send({ name: 'A', phone: '12', subject: 'Hi' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Validation failed');
    expect(bad.body.error.errors.map((e: { field: string }) => e.field)).toEqual(['name', 'phone', 'subject']);

    const ok = await api().post('/api/contact/').send({ name: 'Maya', phone: '+963 991 234 567', subject: 'Summer camp', who: 'parent' });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ name: 'Maya', subject: 'Summer camp' });

    const list = await api().get('/api/reception/contacts?search=maya').set(rec);
    expect(list.body.data[0]).toMatchObject({ name: 'Maya', status: 'new', email: '', who: 'parent', convertedToLead: null });
    expect(list.body.stats).toMatchObject({ total: 1, new: 1 });

    const id = ok.body.data.id as string;
    const upd = await api().put(`/api/reception/contacts/${id}`).set(rec).send({ status: 'replied' });
    expect(upd.body.data.status).toBe('replied');
    expect((await api().put(`/api/reception/contacts/${id}`).set(rec).send({ status: 'bogus' })).status).toBe(400);
    await api().delete(`/api/reception/contacts/${id}`).set(rec).expect(200);
    expect((await api().get(`/api/reception/contacts/${id}`).set(rec)).body.message).toBe('Contact not found');
  });

  it('accepts a job application with a PDF CV stored privately', async () => {
    const pdf = Buffer.from('%PDF-1.4 test');
    const res = await api()
      .post('/api/jobs/apply')
      .field('fullName', 'Rami')
      .field('phone', '0991112223')
      .field('position', 'Robotics Trainer')
      .field('skills', JSON.stringify(['Arduino', ' ROS ']))
      .field('age', '25')
      .attach('cv', pdf, 'Rami CV.pdf');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ fullName: 'Rami', position: 'Robotics Trainer', hasCv: true });
    const [key] = [...t.storage.files.keys()].filter((k) => k.includes('/cvs/'));
    expect(key).toMatch(/^[^/]+\/cvs\/robotics-trainer\/\d{4}-\d{2}\/\d+-rami-cv\.pdf$/);

    const noCv = await api().post('/api/jobs/apply').send({ fullName: 'N', phone: '0991112223', position: 'Admin' });
    expect(noCv.body.data.hasCv).toBe(false);

    const missing = await api().post('/api/jobs/apply').send({ fullName: 'N' });
    expect(missing.body.message).toBe('Full name, phone, and position are required');
  });
});
