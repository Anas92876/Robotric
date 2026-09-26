import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let rec: Record<string, string>;
let clo: Record<string, string>;
let trainerId: string;
const api = () => request(t.app);

beforeAll(async () => {
  t = await createTestApp();
  rec = (await signIn(t, 'reception')).headers;
  clo = (await signIn(t, 'clo')).headers;
  trainerId = (await signIn(t, 'trainer')).user.id;
});
afterAll(async () => {
  await t.close();
});

async function course(price = 200, extra: Record<string, unknown> = {}) {
  const c = (await api().post('/api/clo/courses').set(clo).send({ title: `C${Math.random()}`, category: 'x', description: 'd', price, ...extra })).body.data;
  await api().put(`/api/clo/courses/${c._id}`).set(clo).send({ status: 'published' });
  return c._id as string;
}
async function group(courseId: string, maxStudents = 30) {
  return (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId, startDate: '2030-01-01', endDate: '2030-06-01', maxStudents })).body.data._id as string;
}
const student = async () => signIn(t, 'student');
const enroll = async (body: Record<string, unknown>) => api().post('/api/reception/enrollments').set(rec).send(body);

describe('creating enrollments', () => {
  it('applies the discount, builds a one-payment plan, adds the student to the group, and returns the old shape', async () => {
    const courseId = await course(200);
    const groupId = await group(courseId);
    const s = await student();
    const res = await enroll({ studentId: s.user.id, courseId, groupId, discount: '25', notes: 'VIP' });
    expect(res.status).toBe(201);
    const e = res.body.data;
    expect(e).toMatchObject({
      student: { _id: s.user.id },
      course: { _id: courseId, price: 200 },
      status: 'active',
      notes: 'VIP',
      enrollmentSource: 'direct',
      payment: { totalAmount: 150, paidAmount: 0, remainingAmount: 150, discount: 25 },
      transportation: { enabled: false, totalAmount: 0, remainingAmount: 0, installments: [] },
    });
    expect(e.payment.installments).toHaveLength(1);
    expect(e.payment.installments[0]).toMatchObject({ amount: 150, status: 'pending' });

    const members = await api().get(`/api/clo/groups/${groupId}/students`).set(clo);
    expect(members.body.data[0]).toMatchObject({ _id: s.user.id, enrollment: { status: 'active' } });

    const again = await enroll({ studentId: s.user.id, courseId });
    expect(again.body.message).toBe('Student is already enrolled in this course');
  });

  it('splits an installment plan monthly and sets up transportation', async () => {
    const courseId = await course(300);
    const s = await student();
    const res = await enroll({
      studentId: s.user.id,
      courseId,
      installmentPlan: { numberOfInstallments: 3, startDate: '2030-01-15' },
      transportation: { enabled: true, totalAmount: 90000, paidNow: 30000 },
    });
    const e = res.body.data;
    expect(e.payment.installments.map((i: { amount: number }) => i.amount)).toEqual([100, 100, 100]);
    expect(e.payment.installments.map((i: { dueDate: string }) => i.dueDate.slice(0, 7))).toEqual(['2030-01', '2030-02', '2030-03']);
    expect(e.transportation).toMatchObject({ enabled: true, totalAmount: 90000, paidAmount: 30000, remainingAmount: 60000 });
    expect(e.transportation.installments[0]).toMatchObject({ amount: 60000, status: 'pending' });
  });

  it('rejects non-students and unknown courses', async () => {
    const courseId = await course();
    expect((await enroll({ studentId: trainerId, courseId })).body.message).toBe('Student not found');
    expect((await enroll({ studentId: (await student()).user.id, courseId: '000000000000000000000000' })).body.message).toBe('Course not found');
    expect((await enroll({ courseId })).body.message).toBe('Student and course are required');
  });
});

describe('payments and receipts', () => {
  it('records a payment atomically with a numbered receipt, and refuses overpayment', async () => {
    const courseId = await course(100);
    const s = await student();
    const e = (await enroll({ studentId: s.user.id, courseId })).body.data;

    const pay = await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 40, paymentMethod: 'cash', notes: 'first' });
    expect(pay.status).toBe(200);
    expect(pay.body.data.payment).toMatchObject({ paidAmount: 40, remainingAmount: 60 });
    expect(pay.body.receipt.receiptNumber).toMatch(/^REC-\d{4}-\d{4}$/);
    expect(pay.body.receipt.downloadUrl).toBe(`/api/reception/receipts/${pay.body.receipt.receiptId}/download`);

    const over = await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 61 });
    expect(over.status).toBe(400);
    expect(over.body.message).toBe('Payment amount exceeds remaining balance. Remaining: 60');
    expect((await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 'abc' })).body.message).toBe('Valid payment amount is required');

    // Simultaneous payments can never together exceed the balance.
    const results = await Promise.all([30, 30, 30].map((amount) => api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(2);
    const final = await api().get(`/api/reception/enrollments/${e._id}`).set(rec);
    expect(final.body.data.payment).toMatchObject({ paidAmount: 100, remainingAmount: 0 });

    const receipts = await api().get(`/api/reception/receipts/enrollment/${e._id}`).set(rec);
    expect(receipts.body.data).toHaveLength(3);
    const numbers = receipts.body.data.map((r: { receiptNumber: string }) => r.receiptNumber);
    expect(new Set(numbers).size).toBe(3);
    const first = receipts.body.data.find((r: { billing: { paidNow: number } }) => r.billing.paidNow === 40);
    expect(first).toMatchObject({ type: 'course', payment: { amount: 40, method: 'cash', notes: 'first' }, billing: { totalAmount: 100, paidBefore: 0, remainingBalance: 60 } });

    const detail = await api().get(`/api/reception/receipts/${first._id}`).set(rec);
    expect(detail.body.data).toMatchObject({ student: { _id: s.user.id }, enrollment: { _id: e._id }, issuedBy: { name: 'A reception' } });

    const pdf = await api().get(`/api/reception/receipts/${first._id}/download`).set(rec);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toBe(`attachment; filename="${first.receiptNumber}.pdf"`);
    const html = t.pdf.rendered.at(-1)!;
    expect(html).toContain(first.receiptNumber);
    expect(html).toContain('Course Payment Receipt');
    expect(html).toContain('$40.00 USD');
  });

  it('prints the Syrian-pound amount on the receipt when paid in S.P.', async () => {
    const e = (await enroll({ studentId: (await student()).user.id, courseId: await course(100) })).body.data;
    const pay = await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 10, paymentCurrency: 'sp', amountInSP: 130000 });
    await api().get(`/api/reception/receipts/${pay.body.receipt.receiptId}/download`).set(rec);
    expect(t.pdf.rendered.at(-1)).toContain('130,000 S.P. (equivalent to $10.00 USD)');
  });

  it('spreads a transportation payment over installments oldest-first, splitting a partly paid one', async () => {
    const e = (
      await enroll({
        studentId: (await student()).user.id,
        courseId: await course(),
        transportation: { enabled: true, totalAmount: 300, installments: [{ amount: 100, dueDate: '2030-01-01' }, { amount: 200, dueDate: '2030-02-01' }] },
      })
    ).body.data;
    const pay = await api().post(`/api/reception/enrollments/${e._id}/transportation-payment`).set(rec).send({ amount: 150 });
    expect(pay.body.message).toBe('Transportation payment recorded successfully');
    const inst = pay.body.data.enrollment.transportation.installments;
    expect(inst.map((i: { amount: number; status: string }) => [i.amount, i.status])).toEqual([
      [100, 'paid'],
      [50, 'paid'],
      [150, 'pending'],
    ]);
    expect(pay.body.data.enrollment.transportation).toMatchObject({ paidAmount: 150, remainingAmount: 150 });

    const list = await api().get(`/api/reception/enrollments/${e._id}/transportation-receipts`).set(rec);
    expect(list.body.data[0]).toMatchObject({ type: 'transportation', billing: { paidNow: 150, remainingBalance: 150 } });

    const over = await api().post(`/api/reception/enrollments/${e._id}/transportation-payment`).set(rec).send({ amount: 151 });
    expect(over.body.message).toBe('Payment amount exceeds remaining balance. Remaining: 150 S.P.');

    const del = await api().delete(`/api/reception/enrollments/${e._id}/transportation`).set(rec);
    expect(del.body.data.transportation).toMatchObject({ enabled: false, totalAmount: 0, installments: [] });
    expect((await api().get(`/api/reception/enrollments/${e._id}/transportation-receipts`).set(rec)).body.data).toEqual([]);
  });

  it('marks overdue transportation installments', async () => {
    await enroll({
      studentId: (await student()).user.id,
      courseId: await course(),
      transportation: { enabled: true, totalAmount: 50, installments: [{ amount: 50, dueDate: '2020-01-01' }] },
    });
    const res = await api().post('/api/reception/enrollments/mark-overdue-transportation').set(rec);
    expect(res.body.data.installmentsMarked).toBeGreaterThanOrEqual(1);
  });
});

describe('student view of payments', () => {
  it('lists own receipts and summary, downloads own receipt only, and cannot pay online', async () => {
    const s = await student();
    const other = await student();
    const courseId = await course(100);
    const e = (await enroll({ studentId: s.user.id, courseId })).body.data;
    const receiptId = (await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 25 })).body.receipt.receiptId;

    const all = await api().get('/api/student/payments/').set(s.headers);
    expect(all.body).toMatchObject({ success: true, count: 1 });
    expect(all.body.data[0]).toMatchObject({ _id: receiptId, amount: 25, status: 'completed', type: 'course' });

    const summary = await api().get('/api/student/payments/summary').set(s.headers);
    expect(summary.body.data).toMatchObject({ totalAmount: 100, paidAmount: 25, remainingAmount: 75, totalPayments: 1, pendingPayments: 1 });

    expect((await api().get(`/api/student/payments/courses/${courseId}`).set(s.headers)).body.count).toBe(1);
    expect((await api().get(`/api/student/payments/courses/${courseId}`).set(other.headers)).status).toBe(403);

    expect((await api().get(`/api/student/payments/${receiptId}/receipt`).set(s.headers)).headers['content-type']).toBe('application/pdf');
    expect((await api().get(`/api/student/payments/${receiptId}/receipt`).set(other.headers)).status).toBe(404);

    for (const path of ['/api/student/payments/initiate', `/api/student/payments/${receiptId}/confirm`]) {
      const res = await api().post(path).set(s.headers).send({ enrollmentId: e._id, amount: 75, paymentMethod: 'cash', transactionId: 'x' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PAYMENTS_AT_RECEPTION');
    }
    expect((await api().get(`/api/reception/enrollments/${e._id}`).set(rec)).body.data.payment.paidAmount).toBe(25);
  });
});

describe('status, listing, deletion', () => {
  it('requires a reason to deactivate, keeps history, blocks login when all enrollments are inactive', async () => {
    const s = await student();
    const e = (await enroll({ studentId: s.user.id, courseId: await course() })).body.data;
    expect((await api().put(`/api/reception/enrollments/${e._id}/status`).set(rec).send({ status: 'inactive' })).body.message).toBe(
      'Reason is required when marking enrollment as inactive',
    );
    const res = await api().put(`/api/reception/enrollments/${e._id}/status`).set(rec).send({ status: 'inactive', reason: 'Stopped coming' });
    expect(res.body.data.status).toBe('inactive');
    expect(res.body.data.statusHistory[0]).toMatchObject({ status: 'inactive', reason: 'Stopped coming' });

    const login = await api().post('/api/auth/login').send({ email: s.user.email, password: 'password123' });
    expect(login.status).toBe(401);
    expect(login.body.error.code).toBe('ENROLLMENT_INACTIVE');
  });

  it('filters the list by payment status and student search', async () => {
    const s = await signIn(t, 'student');
    const courseId = await course(100);
    const e = (await enroll({ studentId: s.user.id, courseId })).body.data;
    await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 100 });
    const paid = await api().get(`/api/reception/enrollments?course=${courseId}&paymentStatus=paid`).set(rec);
    expect(paid.body.data.map((x: { _id: string }) => x._id)).toEqual([e._id]);
    expect(paid.body.data[0].course).toMatchObject({ type: 'single' });
    expect((await api().get(`/api/reception/enrollments?course=${courseId}&paymentStatus=unpaid`).set(rec)).body.data).toEqual([]);
    const byEmail = await api().get(`/api/reception/enrollments?student=${encodeURIComponent(s.user.email)}`).set(rec);
    expect(byEmail.body.pagination.total).toBe(1);
  });

  it('deletes an enrollment with its receipts and removes the student from the course groups', async () => {
    const s = await student();
    const courseId = await course(100);
    const groupId = await group(courseId);
    const e = (await enroll({ studentId: s.user.id, courseId, groupId })).body.data;
    await api().post(`/api/reception/enrollments/${e._id}/payment`).set(rec).send({ amount: 10 });
    await api().delete(`/api/reception/enrollments/${e._id}`).set(rec).expect(200);
    expect((await api().get(`/api/reception/receipts/enrollment/${e._id}`).set(rec)).body.data).toEqual([]);
    expect((await api().get(`/api/clo/groups/${groupId}/students`).set(clo)).body.data).toEqual([]);
    expect((await api().get(`/api/reception/enrollments/${e._id}`).set(rec)).status).toBe(404);
  });
});

describe('bundles and the waiting list', () => {
  it('enrolls in a full bundle (one paying enrollment + free sub-enrollments) and cascades status', async () => {
    const bundle = (await api().post('/api/clo/courses').set(clo).send({ title: 'Pack', category: 'x', description: 'd', type: 'bundle', bundlePrice: 250 })).body.data._id;
    const a = await course(150, { parentBundle: bundle });
    await course(150, { parentBundle: bundle });
    const ga = await group(a);
    const s = await student();

    const res = await api().post('/api/reception/enrollments/bundle').set(rec).send({ studentId: s.user.id, bundleId: bundle, discount: 10, groupSelections: [{ courseId: a, groupId: ga }] });
    expect(res.status).toBe(201);
    expect(res.body.data.pricing).toEqual({ bundlePrice: 250, discount: 10, totalCharged: 225 });
    expect(res.body.data.subEnrollments.map((e: { payment: { totalAmount: number } }) => e.payment.totalAmount)).toEqual([0, 0]);
    const bundleEnrollmentId = res.body.data.bundleEnrollment._id;

    // Sub-enrollments are hidden from the main list and shown under the bundle.
    const list = await api().get(`/api/reception/enrollments?student=${encodeURIComponent(s.user.email)}`).set(rec);
    expect(list.body.data.map((e: { _id: string }) => e._id)).toEqual([bundleEnrollmentId]);
    const subs = await api().get(`/api/reception/enrollments/${bundleEnrollmentId}/sub-enrollments`).set(rec);
    expect(subs.body.data).toHaveLength(2);
    expect(subs.body.data.find((x: { course: { _id: string } }) => x.course._id === a).group).toMatchObject({ _id: ga, enrolledCount: 1 });

    const conflict = await api().post('/api/reception/enrollments/bundle').set(rec).send({ studentId: s.user.id, bundleId: bundle });
    expect(conflict.status).toBe(400);
    expect(conflict.body.message).toMatch(/^Student is already enrolled in: /);

    await api().put(`/api/reception/enrollments/${bundleEnrollmentId}/status`).set(rec).send({ status: 'inactive', reason: 'Paused' });
    const after = await api().get(`/api/reception/enrollments/${bundleEnrollmentId}/sub-enrollments`).set(rec);
    expect(after.body.data.every((x: { status: string }) => x.status === 'inactive')).toBe(true);

    // Deleting the bundle enrollment removes the sub-enrollments too, so re-enrolling works.
    await api().delete(`/api/reception/enrollments/${bundleEnrollmentId}`).set(rec).expect(200);
    const redo = await api().post('/api/reception/enrollments/bundle').set(rec).send({ studentId: s.user.id, bundleId: bundle });
    expect(redo.status).toBe(201);
  });

  it('enrolls a waiting-list lead, applying the deposit and marking the lead as student', async () => {
    const courseId = await course(300);
    const groupId = await group(courseId);
    const lead = (await api().post('/api/reception/leads').set(rec).send({ fullName: 'Waiting Kid', mobileNumber: '0990000111' })).body.lead;
    await api()
      .post(`/api/reception/leads/${lead._id}/set-waiting`)
      .set(rec)
      .send({ email: 'waiting.kid@test.local', password: 'pw', courseId, depositAmount: 50, depositMethod: 'sham_cash_app' });

    const wrongGroup = await api().post('/api/reception/enrollments/from-waiting').set(rec).send({ leadId: lead._id, groupId: await group(await course()) });
    expect(wrongGroup.body.message).toBe("Group does not belong to the lead's course interest");

    const res = await api().post('/api/reception/enrollments/from-waiting').set(rec).send({ leadId: lead._id, groupId });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Student enrolled successfully with $50 deposit applied');
    expect(res.body.data.payment).toMatchObject({ totalAmount: 300, paidAmount: 50, remainingAmount: 250 });
    expect(res.body.data.notes).toBe('Enrolled from waiting list. Deposit of $50 applied.');

    const leadNow = (await api().get(`/api/reception/leads/${lead._id}`).set(rec)).body;
    expect(leadNow.status).toBe('student');
    expect(leadNow.statusHistory.at(-1)).toMatchObject({ fromStatus: 'waiting', toStatus: 'student' });
  });
});

describe('enrollment form helpers and CLO course statistics', () => {
  it('lists available courses/groups/students and feeds real numbers into course stats', async () => {
    const courseId = await course(120);
    const groupId = await group(courseId, 2);
    const s = await student();
    await enroll({ studentId: s.user.id, courseId, groupId });

    const courses = await api().get('/api/reception/enrollments/available-courses').set(rec);
    expect(courses.body.data.some((c: { _id: string }) => c._id === courseId)).toBe(true);
    expect(courses.body.data.every((c: { type: string }) => c.type !== 'bundle')).toBe(true);

    const groups = await api().get(`/api/reception/enrollments/available-groups/${courseId}`).set(rec);
    expect(groups.body.data[0]).toMatchObject({ _id: groupId, availableSeats: 1, isFull: false, students: [s.user.id] });

    const students = await api().get(`/api/reception/enrollments/available-students?courseId=${courseId}`).set(rec);
    expect(students.body.data.some((x: { _id: string }) => x._id === s.user.id)).toBe(false);

    const check = await api().get(`/api/reception/enrollments/check?studentId=${s.user.id}&courseId=${courseId}&groupId=${groupId}`).set(rec);
    expect(check.body.data).toMatchObject({ isEnrolledInCourse: true, isEnrolledInGroup: true, groupEnrollment: { groupId } });

    const stats = (await api().get(`/api/clo/courses?search=`).set(clo)).body.data.find((c: { _id: string }) => c._id === courseId).stats;
    expect(stats).toMatchObject({ totalGroups: 1, activeGroups: 1, totalEnrollments: 1, activeEnrollments: 1, trainersCount: 1 });

    const del = await api().delete(`/api/clo/courses/${courseId}`).set(clo);
    expect(del.body.message).toMatch(/Only draft courses can be deleted|Cannot delete course with existing groups/);

    const recent = await api().get('/api/reception/recent-enrollments').set(rec);
    expect(recent.body.data.length).toBeGreaterThan(0);
  });
});
