import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signIn } from './helpers/auth';
import { createTestApp, type TestContext } from './helpers/test-app';

let t: TestContext;
let clo: Record<string, string>;
let reception: Record<string, string>;
let student: Record<string, string>;
let trainerId: string;

beforeAll(async () => {
  t = await createTestApp();
  clo = (await signIn(t, 'clo')).headers;
  reception = (await signIn(t, 'reception')).headers;
  student = (await signIn(t, 'student')).headers;
  trainerId = (await signIn(t, 'trainer')).user.id;
});
afterAll(async () => {
  await t.close();
});

const api = () => request(t.app);

describe('area access', () => {
  it('rejects other roles with the old CLO / reception messages, in both error shapes', async () => {
    const res = await api().get('/api/clo/courses').set(student);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied. CLO privileges required.');
    expect(res.body.error.message).toBe('Access denied. CLO privileges required.');

    const r2 = await api().get('/api/reception/interests').set(student);
    expect(r2.body.message).toBe('Access denied. Reception privileges required.');
  });

  it('requires login', async () => {
    expect((await api().get('/api/clo/courses')).status).toBe(401);
  });
});

describe('subscription plans', () => {
  it('runs full CRUD with the old validation messages', async () => {
    const bad = await api().post('/api/clo/subscription-plans').set(clo).send({ name: '  ', monthlyHours: 10, price: 5 });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toBe('Plan name is required');

    const range = await api().post('/api/clo/subscription-plans').set(clo).send({ name: 'X', monthlyHours: 0, price: 5 });
    expect(range.body.message).toBe('Monthly hours must be between 1 and 1000');

    const created = await api()
      .post('/api/clo/subscription-plans')
      .set(clo)
      .send({ name: ' Basic ', monthlyHours: '20', price: 50, description: 'Starter' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'Basic', monthlyHours: 20, price: 50, isActive: true, description: 'Starter' });
    const id = created.body.data._id as string;
    expect(created.body.data.id).toBe(id);

    const dup = await api().post('/api/clo/subscription-plans').set(clo).send({ name: 'Basic', monthlyHours: 5, price: 1 });
    expect(dup.status).toBe(400);
    expect(dup.body.message).toBe('A subscription plan with this name already exists');

    await api().post('/api/clo/subscription-plans').set(clo).send({ name: 'Hidden', monthlyHours: 5, price: 1, isActive: false });

    const list = await api().get('/api/clo/subscription-plans').set(clo);
    expect(list.body.data.plans.map((p: { name: string }) => p.name)).toEqual(['Hidden', 'Basic']);

    const active = await api().get('/api/reception/subscription-plans/active').set(reception);
    expect(active.body.data.plans.map((p: { name: string }) => p.name)).toEqual(['Basic']);

    const upd = await api().put(`/api/clo/subscription-plans/${id}`).set(clo).send({ price: 60 });
    expect(upd.body).toMatchObject({ success: true, message: 'Subscription plan updated successfully' });
    expect(upd.body.data.price).toBe(60);

    const del = await api().delete(`/api/clo/subscription-plans/${id}`).set(clo);
    expect(del.body).toEqual({ success: true, message: 'Subscription plan deleted successfully' });
    const gone = await api().get(`/api/clo/subscription-plans/${id}`).set(clo);
    expect(gone.status).toBe(404);
    expect(gone.body.message).toBe('Subscription plan not found');
  });
});

describe('interests', () => {
  it('answers without a success field, like the old API', async () => {
    const created = await api().post('/api/clo/interests').set(clo).send({ name: 'Robotics', description: 'Bots' });
    expect(created.status).toBe(201);
    expect(created.body.message).toBe('Interest created successfully');
    expect(created.body.interest).toMatchObject({ name: 'Robotics', status: 'active', createdBy: { name: 'A clo' } });
    expect(created.body.interest.createdBy._id).toMatch(/^[a-f0-9]{24}$/);
    const id = created.body.interest._id as string;

    const dup = await api().post('/api/clo/interests').set(clo).send({ name: 'Robotics' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_INTEREST');

    await api().post('/api/clo/interests').set(clo).send({ name: 'Coding' });
    const search = await api().get('/api/reception/interests?search=bot').set(reception);
    expect(search.body.total).toBe(1);
    expect(search.body.interests[0].name).toBe('Robotics');

    const archived = await api().put(`/api/clo/interests/${id}/archive`).set(clo);
    expect(archived.body.interest.status).toBe('archived');
    const onlyActive = await api().get('/api/clo/interests?status=active').set(clo);
    expect(onlyActive.body.interests.map((i: { name: string }) => i.name)).toEqual(['Coding']);

    expect((await api().delete(`/api/clo/interests/${id}`).set(clo)).body).toEqual({ message: 'Interest deleted successfully' });
  });

  it('treats search text literally', async () => {
    const res = await api().get('/api/clo/interests?search=%25').set(clo);
    expect(res.body.total).toBe(0);
  });
});

describe('courses and bundles', () => {
  const base = { title: 'Arduino 101', category: 'robotics', description: 'Intro', duration: '24', price: 100 };

  it('creates a draft course with the old document shape', async () => {
    const res = await api().post('/api/clo/courses').set(clo).send({ ...base, instructor: trainerId, syllabus: [{ title: 'Week 1' }] });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Course created successfully');
    expect(res.body.data).toMatchObject({
      title: 'Arduino 101',
      status: 'draft',
      level: 'beginner',
      duration: '24',
      totalHours: 24,
      type: 'single',
      bundleCourses: [],
      modules: [],
      parentBundle: null,
      instructor: { _id: trainerId, name: 'A trainer' },
    });
    expect(res.body.data.syllabus[0]._id).toMatch(/^[a-f0-9]{24}$/);
  });

  it('rejects an instructor who is not a trainer', async () => {
    const res = await api().post('/api/clo/courses').set(clo).send({ ...base, instructor: (await signIn(t, 'student')).user.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid instructor');
  });

  it('manages bundles: pricing, nesting rules, listing and detaching', async () => {
    const noPrice = await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'B', type: 'bundle' });
    expect(noPrice.body.message).toBe('Bundle price is required for bundle courses');

    const bundle = (await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'Summer Pack', type: 'bundle', bundlePrice: 150 })).body.data;
    expect(bundle.price).toBe(0);
    const a = (await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'Part A', price: 100, parentBundle: bundle._id })).body.data;
    const b = (await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'Part B', price: 100 })).body.data;

    const add = await api().post(`/api/clo/courses/${bundle._id}/sub-courses`).set(clo).send({ courseId: b._id });
    expect(add.body.message).toBe('Sub-course added to bundle');
    expect(add.body.data.bundleCourses.map((c: { title: string }) => c.title)).toEqual(['Part A', 'Part B']);

    const nest = await api().post(`/api/clo/courses/${bundle._id}/sub-courses`).set(clo).send({ courseId: bundle._id });
    expect(nest.body.message).toBe('Cannot nest a bundle inside a bundle');

    const view = await api().get(`/api/clo/courses/${bundle._id}/sub-courses`).set(clo);
    expect(view.body.data.pricing).toEqual({ individualTotal: 200, bundlePrice: 150, savings: 50, discountPct: 25 });
    expect(view.body.data.subCourses[0].stats).toEqual({ totalGroups: 0, activeEnrollments: 0 });

    // Default list hides sub-courses; the bundle carries them with stats.
    const list = await api().get('/api/clo/courses?type=bundle').set(clo);
    const listed = list.body.data.find((c: { _id: string }) => c._id === bundle._id);
    expect(listed.stats).toMatchObject({ individualTotal: 200, savings: 50, discountPct: 25, subCourseCount: 2, completionRate: 0 });
    const all = await api().get('/api/clo/courses').set(clo);
    expect(all.body.data.some((c: { _id: string }) => c._id === a._id)).toBe(false);
    const withSubs = await api().get('/api/clo/courses?includeSubCourses=true').set(clo);
    expect(withSubs.body.data.some((c: { _id: string }) => c._id === a._id)).toBe(true);

    const toSingle = await api().put(`/api/clo/courses/${bundle._id}`).set(clo).send({ type: 'single' });
    expect(toSingle.status).toBe(400);

    await api().delete(`/api/clo/courses/${bundle._id}/sub-courses/${a._id}`).set(clo).expect(200);
    const details = await api().get(`/api/clo/courses/${bundle._id}`).set(clo);
    expect(details.body.data.course.bundleCourses).toEqual([b._id]);
    expect(details.body.data.stats).toMatchObject({ totalGroups: 0, totalEnrollments: 0, avgProgress: 0 });

    // Deleting the bundle leaves its courses as standalone courses.
    await api().delete(`/api/clo/courses/${bundle._id}`).set(clo).expect(200);
    const orphan = await api().get(`/api/clo/courses/${b._id}`).set(clo);
    expect(orphan.body.data.course.parentBundle).toBeNull();
  });

  it('updates, archives and only deletes drafts', async () => {
    const c = (await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'To archive' })).body.data;

    const upd = await api().put(`/api/clo/courses/${c._id}`).set(clo).send({ duration: '30', status: 'published', _id: 'ignored', createdAt: 'ignored' });
    expect(upd.body.data).toMatchObject({ duration: '30', totalHours: 30, status: 'published' });

    const del = await api().delete(`/api/clo/courses/${c._id}`).set(clo);
    expect(del.body.message).toBe('Only draft courses can be deleted. Please archive published courses instead.');

    const arch = await api().put(`/api/clo/courses/${c._id}/archive`).set(clo).send({ action: 'archive' });
    expect(arch.body).toEqual({ success: true, message: 'Course archived successfully', data: { _id: c._id, title: 'To archive', status: 'archived' } });
    const un = await api().put(`/api/clo/courses/${c._id}/archive`).set(clo).send({ action: 'unarchive' });
    expect(un.body.data.status).toBe('published');

    const stats = await api().get(`/api/clo/courses/${c._id}/statistics?period=7`).set(clo);
    expect(stats.body.data).toMatchObject({ period: 7, enrollmentTrends: [], groupPerformance: [] });
  });

  it('filters by search and sorts', async () => {
    await api().post('/api/clo/courses').set(clo).send({ ...base, title: 'Zeta Drones', category: 'drones' });
    const res = await api().get('/api/clo/courses?search=zeta').set(clo);
    expect(res.body.data.map((c: { title: string }) => c.title)).toEqual(['Zeta Drones']);
    const byCat = await api().get('/api/clo/courses?category=drones&sortBy=title&order=asc').set(clo);
    expect(byCat.body.data).toHaveLength(1);
  });

  it('404s unknown courses with the old message', async () => {
    const res = await api().get('/api/clo/courses/000000000000000000000000').set(clo);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Course not found');
  });
});

describe('training page content', () => {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

  it('validates lang, saves per language and serves both publicly', async () => {
    expect((await api().get('/api/clo/training-content/fr').set(clo)).body.message).toBe('lang must be "ar" or "en"');
    expect((await api().get('/api/clo/training-content/en').set(clo)).body).toEqual({ success: true, data: null });

    const tracks = { summer: { title: 'Summer', programs: [{ title: 'Bots', junk: 'dropped' }] } };
    const saved = await api().put('/api/clo/training-content/en').set(clo).send({ tracks });
    expect(saved.body.message).toBe('Training page content saved');
    expect(saved.body.data.statsValues.studentsTrained).toBe('2200+');
    expect(saved.body.data.tracks.summer.programs[0]).toMatchObject({ title: 'Bots', available: true, images: [] });
    expect(saved.body.data.tracks.summer.programs[0].junk).toBeUndefined();

    await api().put('/api/clo/training-content/ar').set(clo).send({ tracks });
    const pub = await api().get('/api/public/training-content');
    expect(pub.body.data.ar.lang).toBe('ar');
    expect(pub.body.data.en.lang).toBe('en');
  });

  it('adds an image to both languages, then deletes it and the stored file', async () => {
    const up = await api().post('/api/clo/training-content/programs/summer/0/images').set(clo).attach('image', png, 'pic.png');
    expect(up.status).toBe(200);
    const { url, publicId } = up.body.data as { url: string; publicId: string };
    expect(url).toContain(publicId);
    expect(t.storage.files.size).toBe(1);

    for (const lang of ['ar', 'en']) {
      const doc = await api().get(`/api/clo/training-content/${lang}`).set(clo);
      expect(doc.body.data.tracks.summer.programs[0].images).toEqual([{ url, publicId }]);
    }

    await api().delete(`/api/clo/training-content/programs/summer/0/images/${encodeURIComponent(publicId)}`).set(clo).expect(200);
    const after = await api().get('/api/clo/training-content/ar').set(clo);
    expect(after.body.data.tracks.summer.programs[0].images).toEqual([]);
    expect(t.storage.files.size).toBe(0);
  });

  it('rejects files whose bytes are not an image, and bad track ids', async () => {
    const fake = await api()
      .post('/api/clo/training-content/programs/summer/0/images')
      .set(clo)
      .attach('image', Buffer.from('MZ-not-a-png'), 'evil.png');
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('INVALID_FILE_TYPE');

    const track = await api().post('/api/clo/training-content/programs/autumn/0/images').set(clo).attach('image', png, 'p.png');
    expect(track.body.message).toBe('Invalid trackId');

    const none = await api().post('/api/clo/training-content/programs/summer/0/images').set(clo);
    expect(none.body.message).toBe('No image provided');
  });
});
