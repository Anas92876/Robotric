import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { certificateHtml } from '../src/modules/certificates/certificate-html';
import { courseHours } from '../src/modules/certificates/certificates.service';
import { leads } from '../src/modules/leads/leads.table';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let courseId: string;
let groupId: string;
let named: { headers: Record<string, string>; user: { id: string } };
let unnamed: { headers: Record<string, string>; user: { id: string } };
const api = () => request(t.app);

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  const rec = (await signIn(t, 'reception')).headers;
  const trainer = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10, duration: '24 hours', level: 'beginner' })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  named = await signIn(t, 'student');
  unnamed = await signIn(t, 'student');
  for (const s of [named, unnamed]) await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId });
  await t.db.insert(leads).values({ fullName: 'سارة', englishName: ' Sara Ali ', gender: 'female', mobileNumber: '0999', convertedToStudentId: named.user.id });
});
afterAll(async () => {
  await t.close();
});

describe('certificates', () => {
  it('reads training hours from the course', () => {
    expect(courseHours({ totalHours: 0, duration: '24 hours' })).toBe(24);
    expect(courseHours({ totalHours: 30, duration: '24 hours' })).toBe(30);
    expect(courseHours({ totalHours: 0, duration: 'soon' })).toBe(0);
  });

  it('prints the right pronouns', () => {
    const html = certificateHtml({ certificateNumber: 'CERT-2030-000001', studentName: 'Sara <b>', courseName: 'Bots', courseLevel: '', trainingHours: 24, issuedAt: new Date('2030-01-01'), gender: 'female' });
    expect(html).toContain('Sara &lt;b&gt;');
    expect(html).toContain('wish her a distinguished');
    expect(html).toContain('24 training hours');
  });

  it('issues once per student, skips students without an English name, and verifies publicly', async () => {
    const issued = await api().post(`/api/clo/certificates/generate-group/${groupId}`).set(clo);
    expect(issued.status).toBe(201);
    expect(issued.body).toMatchObject({ issued: 1, skipped: 1 });
    const cert = issued.body.certificates.find((c: { studentId: string }) => c.studentId === named.user.id);
    expect(cert).toMatchObject({ studentName: 'Sara Ali', alreadyExisted: false });
    expect(cert.certificateNumber).toMatch(/^CERT-\d{4}-000001$/);
    expect(issued.body.certificates.find((c: { studentId: string }) => c.studentId === unnamed.user.id).skippedReason).toBe('No English name found in Lead records');

    const again = await api().post(`/api/clo/certificates/generate-group/${groupId}`).set(clo);
    expect(again.body).toMatchObject({ issued: 0, skipped: 2 });

    const mine = await api().get('/api/student/certificates/').set(named.headers);
    expect(mine.body.data[0]).toMatchObject({ studentName: 'Sara Ali', gender: 'female', trainingHours: 24, course: { _id: courseId, title: 'Bots' } });

    const pdf = await api().get(`/api/student/certificates/${cert.certificateNumber}/pdf`).set(named.headers);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(t.pdf.rendered.at(-1)).toContain('Sara Ali');
    expect((await api().get(`/api/student/certificates/${cert.certificateNumber}/pdf`).set(unnamed.headers)).status).toBe(404);

    const verified = await api().get(`/api/certificates/verify/${cert.certificateNumber.toLowerCase()}`);
    expect(verified.body).toMatchObject({ valid: true, certificate: { studentName: 'Sara Ali', courseName: 'Bots', issuedBy: expect.any(String) } });
    expect((await api().get('/api/certificates/verify/CERT-1999-000009')).body).toMatchObject({ valid: false, message: 'Certificate not found' });

    expect((await api().delete(`/api/clo/certificates/group/${groupId}`).set(clo)).body).toMatchObject({ deleted: 1, message: '1 certificate(s) deleted' });
  });
});
