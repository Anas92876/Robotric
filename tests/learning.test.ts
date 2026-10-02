import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { assignments } from '../src/modules/assignments/assignments.table';
import { courseModules } from '../src/modules/course-modules/course-modules.table';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let rec: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let student: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
const api = () => request(t.app);

const quizBody = (extra: Record<string, unknown> = {}) => ({
  courseId,
  title: 'Motors quiz',
  passingScore: 60,
  maxAttempts: 2,
  questions: [
    { question: 'Q1', options: [{ text: 'right', isCorrect: true }, { text: 'wrong' }], points: 1 },
    { question: 'Q2', type: 'multiple', options: [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }, { text: 'c' }], points: 2, explanation: 'a and b' },
    { question: 'Q3', options: [{ text: 'x' }, { text: 'y', isCorrect: true }], points: 2 },
  ],
  ...extra,
});

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  student = await signIn(t, 'student');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Robotics', category: 'x', description: 'd', price: 100, instructor: trainer.user.id })).body.data._id;
  await api().post('/api/reception/enrollments').set(rec).send({ studentId: student.user.id, courseId });
});
afterAll(async () => {
  await t.close();
});

describe('trainer quizzes', () => {
  it('creates a quiz (auto-creating its module), validates questions, lists, updates, duplicates and deletes', async () => {
    const bad = await api().post('/api/trainer/quizzes').set(trainer.headers).send(quizBody({ questions: [{ question: 'Q', options: [{ text: 'a' }, { text: 'b' }] }] }));
    expect(bad.body.message).toBe('Question 1 must have at least one correct answer');

    const res = await api().post('/api/trainer/quizzes/').set(trainer.headers).send(quizBody());
    expect(res.status).toBe(201);
    const quiz = res.body.data;
    expect(quiz).toMatchObject({ title: 'Motors quiz', course: { _id: courseId }, module: { title: 'Quiz Module: Motors quiz', order: 999 }, passingScore: 60 });
    expect(quiz.questions[0]._id).toMatch(/^[a-f0-9]{24}$/);

    // The course now lists the new module.
    const course = await api().get(`/api/clo/courses/${courseId}`).set(clo);
    expect(course.body.data.course.modules).toEqual([quiz.module._id]);

    const other = await signIn(t, 'trainer');
    expect((await api().get(`/api/trainer/quizzes/${quiz._id}`).set(other.headers)).status).toBe(403);
    expect((await api().get('/api/trainer/quizzes').set(student.headers)).status).toBe(403);

    expect((await api().get('/api/trainer/quizzes').set(trainer.headers)).body.count).toBe(1);
    expect((await api().get(`/api/trainer/quizzes/course/${courseId}`).set(trainer.headers)).body.data[0].course).toBe(courseId);

    const upd = await api().put(`/api/trainer/quizzes/${quiz._id}`).set(trainer.headers).send({ timeLimit: 15 });
    expect(upd.body.data.timeLimit).toBe(15);
    const dup = await api().post(`/api/trainer/quizzes/${quiz._id}/duplicate`).set(trainer.headers);
    expect(dup.body.data.title).toBe('Motors quiz (Copy)');
    expect(dup.body.data.questions[0]._id).not.toBe(quiz.questions[0]._id);
    await api().delete(`/api/trainer/quizzes/${dup.body.data._id}`).set(trainer.headers).expect(200);

    // The copy shares the module with the original, so the module stays
    const moduleOf = async (m: string | { _id: string }) => (await t.db.select().from(courseModules).where(eq(courseModules.id, typeof m === "string" ? m : m._id))).length;
    expect(await moduleOf(quiz.module)).toBe(1);

    // A quiz alone in its automatic module takes the module with it
    const alone = (await api().post('/api/trainer/quizzes').set(trainer.headers).send(quizBody({ title: 'Alone' }))).body.data;
    expect(await moduleOf(alone.module)).toBe(1);
    await api().delete(`/api/trainer/quizzes/${alone._id}`).set(trainer.headers).expect(200);
    expect(await moduleOf(alone.module)).toBe(0);
  });
});

describe('student quizzes', () => {
  it('hides the answers, grades every question (skipping ones does not help), limits attempts', async () => {
    const quiz = (await api().post('/api/trainer/quizzes').set(trainer.headers).send(quizBody({ title: 'Graded' }))).body.data;
    const view = await api().get(`/api/student/quizzes/${quiz._id}`).set(student.headers);
    expect(view.body.data.questions[0].options).toEqual([{ index: 0, text: 'right' }, { index: 1, text: 'wrong' }]);

    const start = await api().post(`/api/student/quizzes/${quiz._id}/start`).set(student.headers);
    expect(start.status).toBe(201);
    const again = await api().post(`/api/student/quizzes/${quiz._id}/start`).set(student.headers);
    expect(again.body.message).toBe('Quiz attempt already in progress');
    const attemptId = start.body.data.attemptId;

    // Only the easy question, answered twice: 1 of 5 points (the old code gave 100%).
    const q1 = quiz.questions[0]._id;
    const sub = await api()
      .post(`/api/student/quizzes/${quiz._id}/submit`)
      .set(student.headers)
      .send({ attemptId, answers: [{ questionId: q1, selectedOptions: [0] }, { questionId: q1, selectedOptions: [0] }] });
    expect(sub.body.data).toMatchObject({ score: 20, earnedPoints: 1, totalPoints: 5, passed: false });
    expect(sub.body.message).toBe('Quiz completed. Keep trying!');

    const a2 = (await api().post(`/api/student/quizzes/${quiz._id}/start`).set(student.headers)).body.data.attemptId;
    const full = await api()
      .post(`/api/student/quizzes/${quiz._id}/submit`)
      .set(student.headers)
      .send({ attemptId: a2, answers: [{ questionId: q1, selectedOptions: [0] }, { questionId: quiz.questions[1]._id, selectedOptions: [1, 0] }, { questionId: quiz.questions[2]._id, selectedOptions: [0] }] });
    expect(full.body.data).toMatchObject({ score: 60, passed: true });
    expect(full.body.data.detailedResults[1]).toMatchObject({ isCorrect: true, correctOptions: [0, 1], explanation: 'a and b' });

    expect((await api().post(`/api/student/quizzes/${quiz._id}/start`).set(student.headers)).body.message).toBe('Maximum attempts reached for this quiz');
    const attempts = await api().get(`/api/student/quizzes/${quiz._id}/attempts`).set(student.headers);
    expect(attempts.body).toMatchObject({ count: 2, bestScore: 60 });
    const result = await api().get(`/api/student/quizzes/${quiz._id}/results/${a2}`).set(student.headers);
    expect(result.body.data.detailedResults[0].allOptions).toHaveLength(2);

    const outsider = await signIn(t, 'student');
    expect((await api().get(`/api/student/quizzes/${quiz._id}`).set(outsider.headers)).status).toBe(403);
  });
});

describe('student modules', () => {
  it('opens, starts and completes modules, updating course progress', async () => {
    const quiz = (await api().post('/api/trainer/quizzes').set(trainer.headers).send(quizBody({ title: 'Mod quiz' }))).body.data;
    const moduleId = quiz.module._id;

    const content = await api().get(`/api/student/modules/${moduleId}`).set(student.headers);
    expect(content.body.data.module).toMatchObject({ _id: moduleId, type: 'quiz', course: courseId });
    // The module knows its quiz (the quiz points at the module, not the other way round)
    expect(content.body.data.module.quiz).toMatchObject({ _id: quiz._id, title: 'Mod quiz' });
    expect(content.body.data.progress.status).toBe('not_started');

    expect((await api().post(`/api/student/modules/${moduleId}/start`).set(student.headers)).body.data.status).toBe('in_progress');
    const prog = await api().patch(`/api/student/modules/${moduleId}/progress`).set(student.headers).send({ timeSpent: 30, videoProgress: { currentTime: 10, duration: 60 } });
    expect(prog.body.data).toMatchObject({ timeSpent: 30, videoProgress: { currentTime: 10, duration: 60, completed: false } });

    const done = await api().post(`/api/student/modules/${moduleId}/complete`).set(student.headers);
    expect(done.body.data.enrollment.completedModules).toBe(1);
    expect(done.body.data.progress.status).toBe('completed');

    const next = await api().get(`/api/student/modules/${moduleId}/next`).set(student.headers);
    expect(next.body.data).toBeNull();
    expect((await api().get(`/api/student/modules/${moduleId}/progress`).set(student.headers)).body.data.status).toBe('completed');
  });

  it('marks the course complete (no crash) when the last module is done', async () => {
    const s = await signIn(t, 'student');
    const c = (await api().post('/api/clo/courses').set(clo).send({ title: 'Solo', category: 'x', description: 'd', price: 1, instructor: trainer.user.id })).body.data._id;
    const e = (await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId: c })).body.data;
    const m = (await api().post('/api/trainer/quizzes').set(trainer.headers).send({ ...quizBody(), courseId: c, title: 'Only' })).body.data.module._id;
    await api().post(`/api/student/modules/${m}/start`).set(s.headers);
    const done = await api().post(`/api/student/modules/${m}/complete`).set(s.headers);
    expect(done.status).toBe(200);
    expect(done.body.data.enrollment.percentageComplete).toBe(100);
    const enrollment = (await api().get(`/api/reception/enrollments/${e._id}`).set(rec)).body.data;
    expect(enrollment.status).toBe('active');
    expect(enrollment.completedAt).toBeTruthy();
    expect(enrollment.progress.completedModules).toEqual([m]);
  });
});

describe('student assignments', () => {
  it('submits files (checked and stored privately), blocks resubmission, comments and deletes', async () => {
    const moduleId = (await api().post('/api/trainer/quizzes').set(trainer.headers).send(quizBody({ title: 'For assignment' }))).body.data.module._id;
    const [a] = await t.db
      .insert(assignments)
      .values({ moduleId, courseId, title: 'Build a bot', description: 'Photo of your robot', dueDate: new Date(Date.now() + 86400000), allowedFileTypes: ['png', 'pdf'], maxFiles: 2 })
      .returning();
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

    const view = await api().get(`/api/student/assignments/${a!.id}`).set(student.headers);
    expect(view.body.data).toMatchObject({ canSubmit: true, isOverdue: false, submission: null, assignment: { title: 'Build a bot', module: { _id: moduleId } } });

    const wrongType = await api().post(`/api/student/assignments/${a!.id}/submit`).set(student.headers).attach('files', Buffer.from('hello'), 'notes.txt');
    expect(wrongType.body.message).toBe('File type .txt is not allowed');

    const ok = await api().post(`/api/student/assignments/${a!.id}/submit`).set(student.headers).attach('files', png, 'bot.png');
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ version: 1, status: 'submitted', isLate: false });
    expect(ok.body.data.files[0].fileUrl).toMatch(/^https:\/\/storage\.test\/signed\/.+\/assignments\//);

    const resubmit = await api().post(`/api/student/assignments/${a!.id}/submit`).set(student.headers).attach('files', png, 'bot2.png');
    expect(resubmit.body.message).toBe('You cannot resubmit this assignment');

    const comment = await api().post(`/api/student/assignments/submissions/${ok.body.data._id}/comments`).set(student.headers).send({ text: 'Done!' });
    expect(comment.body.data).toMatchObject({ text: 'Done!', author: student.user.id });

    const status = await api().get(`/api/student/assignments/${a!.id}/submission`).set(student.headers);
    expect(status.body.data).toMatchObject({ hasSubmitted: true, submissionCount: 1 });

    const filesBefore = t.storage.files.size;
    await api().delete(`/api/student/assignments/submissions/${ok.body.data._id}`).set(student.headers).expect(200);
    expect(t.storage.files.size).toBe(filesBefore - 1);
  });
});
