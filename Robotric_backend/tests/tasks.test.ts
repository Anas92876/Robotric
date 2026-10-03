import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let rec: Record<string, string>;
let trainer: { headers: Record<string, string>; user: { id: string } };
let courseId: string;
let groupId: string;
let students: { headers: Record<string, string>; user: { id: string } }[];
const api = () => request(t.app);
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const future = () => new Date(Date.now() + 7 * 86400000).toISOString();

const questions = [
  { questionText: 'Pick the motor', answerType: 'mcq', type: 'single_choice', options: ['servo', 'led'], correctAnswers: [0], points: 5, order: 0, required: true },
  { questionText: 'Explain', answerType: 'text', points: 5, order: 1, maxLength: 50 },
  { questionText: 'Photo', answerType: 'image', points: 10, order: 2, maxImages: 1 },
];

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  rec = (await signIn(t, 'reception')).headers;
  trainer = await signIn(t, 'trainer');
  courseId = (await api().post('/api/clo/courses').set(clo).send({ title: 'Bots', category: 'x', description: 'd', price: 10 })).body.data._id;
  groupId = (await api().post('/api/clo/groups').set(clo).send({ name: 'G', courseId, trainerId: trainer.user.id, startDate: '2020-01-01', endDate: '2040-01-01' })).body.data._id;
  students = [];
  for (let i = 0; i < 2; i++) {
    const s = await signIn(t, 'student');
    await api().post('/api/reception/enrollments').set(rec).send({ studentId: s.user.id, courseId, groupId });
    students.push(s);
  }
});
afterAll(async () => {
  await t.close();
});

describe('trainer tasks', () => {
  it('validates questions, creates draft/open tasks, publishes and lists', async () => {
    const bad = await api()
      .post('/api/trainer/tasks/')
      .set(trainer.headers)
      .send({ groupId, title: 'X', description: 'd', deadline: future(), questions: [{ questionText: 'q', answerType: 'mcq', type: 'single_choice', options: ['a', 'b'], correctAnswers: [0, 1], points: 1, order: 0 }] });
    expect(bad.body.message).toBe('Single choice question 1 can only have one correct answer');

    const draft = await api().post('/api/trainer/tasks/').set(trainer.headers).send({ groupId, title: 'Draft', description: 'd', deadline: future(), questions, status: 'draft' });
    expect(draft.status).toBe(201);
    expect(draft.body.message).toBe('Task saved as draft');
    expect(draft.body.data).toMatchObject({ status: 'draft', hasQuestions: true, courseId, groupIds: [groupId] });
    expect(draft.body.data.questions[0]._id).toMatch(/^[a-f0-9]{24}$/);

    const pub = await api().patch(`/api/trainer/tasks/${draft.body.data._id}/publish`).set(trainer.headers);
    expect(pub.body.data.status).toBe('open');
    expect((await api().patch(`/api/trainer/tasks/${draft.body.data._id}/publish`).set(trainer.headers)).body.message).toBe('Only draft tasks can be published');

    const list = await api().get(`/api/trainer/tasks/group/${groupId}`).set(trainer.headers);
    expect(list.body.data[0]).toMatchObject({ courseId: { _id: courseId, title: 'Bots' }, createdBy: { _id: trainer.user.id } });

    const other = await signIn(t, 'trainer');
    expect((await api().get(`/api/trainer/tasks/${draft.body.data._id}`).set(other.headers)).body.error.code).toBe('GROUP_OWNERSHIP_REQUIRED');
    expect((await api().get(`/api/trainer/tasks/group/${groupId}`).set(students[0]!.headers)).status).toBe(403);
  });
});

describe('student submissions and grading', () => {
  it('hides correct answers, submits mixed answers with a private image, then gets graded', async () => {
    const task = (await api().post('/api/trainer/tasks/').set(trainer.headers).send({ groupId, title: 'Build', description: 'd', deadline: future(), questions })).body.data;
    const [s1] = students;

    const mine = await api().get('/api/student/tasks/').set(s1!.headers);
    const listed = mine.body.data.find((x: { _id: string }) => x._id === task._id);
    expect(listed.questions[0].correctAnswers).toBeUndefined();
    expect(listed.submission).toBeNull();

    const missing = await api()
      .post(`/api/student/tasks/${task._id}/submit`)
      .set(s1!.headers)
      .field('answers', JSON.stringify([{ questionId: task.questions[1]._id, answerType: 'text', textAnswer: 'x' }]));
    expect(missing.body.error.code).toBe('MISSING_REQUIRED_ANSWER');

    const answers = [
      { questionId: task.questions[0]._id, answerType: 'mcq', selectedAnswers: [0] },
      { questionId: task.questions[1]._id, answerType: 'text', textAnswer: ' because ' },
      { questionId: task.questions[2]._id, answerType: 'image', imageFileIndices: [0] },
    ];
    const sub = await api().post(`/api/student/tasks/${task._id}/submit`).set(s1!.headers).field('answers', JSON.stringify(answers)).attach('files', png, 'bot.png');
    expect(sub.status).toBe(201);
    expect(sub.body.data).toMatchObject({ status: 'pending_review', score: 5, isLate: false });
    const image = sub.body.data.answers[2].imageAnswers[0];
    expect(image.cloudinaryUrl).toMatch(/^https:\/\/storage\.test\/signed\/.+\/task-submissions\//);
    expect(sub.body.data.answers[1].textAnswer).toBe('because');

    // Trainer grades; the student then sees the correct answers.
    const details = await api().get(`/api/trainer/tasks/${task._id}`).set(trainer.headers);
    expect(details.body).toMatchObject({ count: 1, task: { _id: task._id } });
    expect(details.body.data.submissions[0].studentId).toMatchObject({ _id: s1!.user.id });

    const tooHigh = await api().post(`/api/trainer/tasks/${task._id}/submissions/${sub.body.data._id}/grade`).set(trainer.headers).send({ score: 101 });
    expect(tooHigh.body.message).toBe('Score must be between 0 and 100');
    const graded = await api().post(`/api/trainer/tasks/${task._id}/submissions/${sub.body.data._id}/grade`).set(trainer.headers).send({ score: 18, feedback: 'Nice', status: 'graded' });
    expect(graded.body.data).toMatchObject({ score: 18, status: 'graded', gradedBy: trainer.user.id });

    const view = await api().get(`/api/student/tasks/${task._id}`).set(s1!.headers);
    expect(view.body.data.task.questions[0].correctAnswers).toEqual([0]);
    expect(view.body.data.submission.feedback).toBe('Nice');

    // An update is refused once students have submitted.
    const upd = await api().put(`/api/trainer/tasks/${task._id}`).set(trainer.headers).send({ title: 'New' });
    expect(upd.body.error.code).toBe('SUBMISSIONS_EXIST');

    // Deleting removes the submissions and their stored files.
    const before = t.storage.files.size;
    const del = await api().delete(`/api/trainer/tasks/${task._id}`).set(trainer.headers);
    expect(del.body).toMatchObject({ message: 'Task deleted successfully', deletedSubmissions: 1 });
    expect(t.storage.files.size).toBe(before - 1);
  });

  it('auto-grades MCQ-only tasks and blocks late or non-member submissions', async () => {
    const mcq = [questions[0]];
    const task = (await api().post('/api/trainer/tasks/').set(trainer.headers).send({ groupId, title: 'Quick', description: 'd', deadline: future(), questions: mcq })).body.data;
    const sub = await api().post(`/api/student/tasks/${task._id}/submit`).set(students[1]!.headers).send({ answers: [{ questionId: task.questions[0]._id, answerType: 'mcq', selectedAnswers: [1] }] });
    expect(sub.body.data).toMatchObject({ status: 'graded', score: 0 });

    const outsider = await signIn(t, 'student');
    const no = await api().post(`/api/student/tasks/${task._id}/submit`).set(outsider.headers).send({ answers: [] });
    expect(no.body.error.code).toBe('NOT_GROUP_MEMBER');

    const late = (await api().post('/api/trainer/tasks/').set(trainer.headers).send({ groupId, title: 'Late', description: 'd', deadline: new Date(Date.now() - 86400000).toISOString(), questions: mcq })).body.data;
    const lateSub = await api().post(`/api/student/tasks/${late._id}/submit`).set(students[1]!.headers).send({ answers: [{ questionId: late.questions[0]._id, answerType: 'mcq', selectedAnswers: [0] }] });
    expect(lateSub.body.error.code).toBe('DEADLINE_PASSED');
  });
});

describe('CLO tasks', () => {
  it('attaches tasks to sessions, hides them from students until the session day, and reports results', async () => {
    const future10 = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const session = (await api().post('/api/clo/sessions/').set(clo).send({ title: 'Later', groupId, overrideSchedule: true, scheduledDate: future10, startTime: '10:00', endTime: '11:00' })).body.data;

    expect((await api().post('/api/clo/tasks/').set(clo).send({ title: 'X', description: 'd', deadline: future(), questions })).body.error.code).toBe('SESSION_REQUIRED');
    const task = (await api().post('/api/clo/tasks/').set(clo).send({ sessionIds: [session._id], title: 'Linked', description: 'd', deadline: future(), questions })).body.data;
    expect(task).toMatchObject({ sessionId: session._id, sessionIds: [session._id], groupIds: [groupId], courseIds: [courseId] });

    // Not visible before the session day.
    const mine = await api().get('/api/student/tasks/').set(students[0]!.headers);
    expect(mine.body.data.some((x: { _id: string }) => x._id === task._id)).toBe(false);
    const locked = await api().get(`/api/student/tasks/${task._id}`).set(students[0]!.headers);
    expect(locked.status).toBe(403);
    expect(locked.body.locked).toBe(true);

    const list = await api().get(`/api/clo/tasks/?sessionId=${session._id}`).set(clo);
    expect(list.body.data[0]).toMatchObject({ _id: task._id, sessionIds: [{ _id: session._id, title: 'Later' }] });
    expect(list.body.pagination).toMatchObject({ total: 1, page: 1 });

    const dup = await api().post(`/api/clo/tasks/${task._id}/duplicate`).set(clo);
    expect(dup.body.data).toMatchObject({ title: 'Linked (Copy)', status: 'draft', sessionIds: [session._id] });

    const results = await api().get(`/api/clo/tasks/${task._id}/results`).set(clo);
    expect(results.body.data.statistics).toMatchObject({ totalSubmissions: 0, totalStudents: 2, completionRate: 0 });
  });
});
