/**
 * Demo data for trying the dashboard: courses, groups, students, enrollments,
 * payments, sessions and attendance, leads, contacts, inventory, posts,
 * competitions and internal work — created through the normal API as each role,
 * so it passes the same checks as real use. The seed accounts (`npm run db:seed`)
 * are linked in: trainer@ teaches two groups, student@ is enrolled, engineer@ has
 * tasks and client@ has a project.
 *
 *   npm run dev                                  # backend must be running
 *   npx tsx scripts/demo-data.ts                 # create
 *   npx tsx scripts/demo-data.ts --remove        # delete everything it created
 *   API_URL=http://localhost:4889 SEED_PASSWORD=... npx tsx scripts/demo-data.ts
 *
 * Everything created is recorded in scripts/.demo-data.json (git-ignored) so
 * --remove can delete it again. Demo people use @demo.robotrick.test emails.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const API = (process.env.API_URL ?? 'http://localhost:4889').replace(/\/$/, '') + '/api';
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123';
const MANIFEST = path.join(__dirname, '.demo-data.json');
const DEMO_DOMAIN = 'demo.robotrick.test';

type Json = Record<string, any>;
interface Created { role: string; deletePath: string; label: string }

const created: Created[] = [];
const tokens: Record<string, string> = {};
const seedIds: Record<string, string> = {};

async function login(role: string): Promise<string> {
  if (tokens[role]) return tokens[role];
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${role}@robotrick.test`, password: SEED_PASSWORD }) });
  const j = (await r.json()) as Json;
  if (!r.ok) throw new Error(`Sign-in as ${role}@robotrick.test failed (${r.status}): ${j.message}. Run "npm run db:seed" first.`);
  seedIds[role] = j.data._id ?? j.data.id;
  return (tokens[role] = j.data.token);
}

async function call(role: string | null, method: string, p: string, body?: unknown): Promise<Json> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (role) headers.Authorization = `Bearer ${await login(role)}`;
  const r = await fetch(API + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  const j = (text ? JSON.parse(text) : {}) as Json;
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${j.message ?? text.slice(0, 120)}`);
  return j;
}

// The old API wraps new records differently per route: data, lead, event, interest, or the bare record.
const idOf = (j: Json): string =>
  j.data?._id ?? j.lead?._id ?? j.event?._id ?? j.interest?._id ?? j._id ?? j.data?.user?._id ?? j.user?._id ?? j.data?.id;

/** Create something and remember how to delete it. */
async function make(role: string, p: string, body: unknown, deletePath: ((id: string) => string) | null, label: string): Promise<string> {
  const j = await call(role, 'POST', p, body);
  const id = idOf(j);
  if (!id) throw new Error(`POST ${p}: no id in response`);
  if (deletePath) created.push({ role, deletePath: deletePath(id), label });
  return id;
}

/** Like make(), but a name that already exists (409) is skipped instead of failing — and never recorded, so --remove won't touch it. */
async function makeOrSkip(role: string, p: string, body: unknown, deletePath: (id: string) => string, label: string): Promise<string | null> {
  try {
    return await make(role, p, body, deletePath, label);
  } catch (e) {
    if (!/→ 409/.test((e as Error).message)) throw e;
    console.log(`  (${label} already exists — skipped)`);
    return null;
  }
}

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const randomPassword = () => randomBytes(12).toString('base64url');
const pick = <T>(arr: T[], i: number) => arr[i % arr.length]!;

const STUDENT_NAMES = [
  'Omar Haddad', 'Lina Khoury', 'Yousef Najjar', 'Maya Sabbagh', 'Karim Aswad', 'Rama Halabi', 'Hadi Zein', 'Tala Mansour',
  'Adam Shami', 'Julia Hakim', 'Sami Darwish', 'Nour Kassab', 'Rami Jabri', 'Leen Rifai', 'Zaid Attar', 'Dana Qassem',
];

async function create(): Promise<void> {
  for (const role of ['clo', 'reception', 'trainer', 'student', 'cto', 'engineer', 'client', 'admin']) await login(role);
  const step = (name: string) => console.log(`• ${name}`);

  step('trainers');
  const trainers = [seedIds.trainer!];
  for (const [i, [name, spec]] of [['Rania Aziz', 'Arduino'], ['Fadi Sayegh', 'Drones & 3D printing'], ['Hiba Tarek', 'AI & Python']].entries()) {
    // Created by the CLO (keeps the specialization); deleted by reception, because the
    // CLO's delete only marks a trainer inactive.
    const id = await make('clo', '/clo/trainers', { name, email: `trainer${i + 1}@${DEMO_DOMAIN}`, password: randomPassword(), profile: { specialization: spec } }, null, `trainer ${name}`);
    created.push({ role: 'reception', deletePath: `/reception/users/${id}`, label: `trainer ${name}` });
    trainers.push(id);
  }

  step('courses');
  const courseDefs = [
    { title: 'Robotics Fundamentals', category: 'robotics', description: 'Build and program your first robot: sensors, motors and logic.', duration: '3 months', price: 150 },
    { title: 'Arduino Projects', category: 'electronics', description: 'Circuits, microcontrollers and real projects with Arduino.', duration: '2 months', price: 120 },
    { title: 'Drones & 3D Printing', category: 'engineering', description: 'Design parts in 3D, print them and fly your own drone.', duration: '2 months', price: 180 },
    { title: 'AI with Python for Kids', category: 'programming', description: 'Python basics and first steps in machine learning.', duration: '3 months', price: 160 },
  ];
  const courses: string[] = [];
  for (const [i, c] of courseDefs.entries()) courses.push(await make('clo', '/clo/courses', { ...c, instructor: pick(trainers, i) }, (x) => `/clo/courses/${x}`, `course ${c.title}`));

  step('groups');
  const today = new Date().getDay();
  const groupDefs = [
    { name: 'Robotics — Sat/Tue A', course: 0, trainer: 0, days: [today, (today + 3) % 7] },
    { name: 'Arduino — Sun/Wed', course: 1, trainer: 0, days: [(today + 1) % 7, (today + 4) % 7] },
    { name: 'Robotics — Mon/Thu B', course: 0, trainer: 1, days: [(today + 2) % 7, (today + 5) % 7] },
    { name: 'Drones — Weekend', course: 2, trainer: 2, days: [(today + 6) % 7] },
    { name: 'AI Python — Tue', course: 3, trainer: 3, days: [(today + 3) % 7] },
  ];
  const groups: { id: string; course: string; trainer: string }[] = [];
  for (const g of groupDefs) {
    const body = {
      name: g.name, courseId: courses[g.course], trainerId: trainers[g.trainer], startDate: day(-45), endDate: day(60), maxStudents: 12,
      schedule: g.days.map((d) => ({ day: WEEKDAYS[d], startTime: '16:00', endTime: '18:00' })),
    };
    groups.push({ id: await make('clo', '/clo/groups', body, (x) => `/clo/groups/${x}`, `group ${g.name}`), course: courses[g.course]!, trainer: trainers[g.trainer]! });
  }

  step('students');
  const students = [seedIds.student!];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const id = await make('reception', '/reception/users', { name, email: `student${i + 1}@${DEMO_DOMAIN}`, password: randomPassword(), role: 'student', phone: `09${String(41000000 + i * 7331).slice(0, 8)}` }, (x) => `/reception/users/${x}`, `student ${name}`);
    students.push(id);
  }

  step('enrollments and payments');
  const enrolledIn = new Map<string, string[]>(); // groupId → students
  for (const [i, studentId] of students.entries()) {
    const g = groups[i % groups.length]!;
    const e = await make('reception', '/reception/enrollments', { studentId, courseId: g.course, groupId: g.id }, (x) => `/reception/enrollments/${x}`, `enrollment #${i + 1}`);
    enrolledIn.set(g.id, [...(enrolledIn.get(g.id) ?? []), studentId]);
    // Most pay something: full, half or a first installment
    const share = [1, 0.5, 0.3, 0][i % 4]!;
    const price = courseDefs[courses.indexOf(g.course)]!.price;
    if (share > 0) await call('reception', 'POST', `/reception/enrollments/${e}/payment`, { amount: Math.round(price * share), paymentMethod: i % 3 ? 'cash' : 'bank_transfer', notes: 'Demo payment' });
  }
  // The seed student also joins a second group, taught by the seed trainer
  const second = groups[1]!;
  await make('reception', '/reception/enrollments', { studentId: seedIds.student, courseId: second.course, groupId: second.id }, (x) => `/reception/enrollments/${x}`, 'enrollment seed student #2');
  enrolledIn.set(second.id, [...(enrolledIn.get(second.id) ?? []), seedIds.student!]);

  step('sessions and attendance');
  const topics = ['Motors and gears', 'Sensors', 'Line follower', 'Loops and logic', 'Final challenge'];
  for (const g of groups.slice(0, 3)) {
    for (const [k, offset] of [-21, -14, -7, -2, 3, 10].entries()) {
      const sessionId = await make('clo', '/clo/sessions/', { title: pick(topics, k), groupId: g.id, overrideSchedule: true, scheduledDate: day(offset), startTime: '16:00', endTime: '18:00' }, (x) => `/clo/sessions/${x}`, `session ${pick(topics, k)}`);
      const members = enrolledIn.get(g.id) ?? [];
      // Only the seed trainer can be signed in, so attendance is taken for their past sessions
      if (offset < 0 && g.trainer === seedIds.trainer && members.length) {
        const statuses = ['present', 'present', 'present', 'late', 'absent'];
        await call('trainer', 'POST', '/trainer/attendance', { sessionId, records: members.map((s, n) => ({ student: s, status: pick(statuses, n + k) })) });
      }
    }
  }

  step('leads, contacts, events');
  const leadNames = ['Ahmad Saleh', 'Rasha Omari', 'Majd Hamwi', 'Salma Idlibi', 'Bassel Kurdi', 'Yara Nasser', 'Ghaith Hallak', 'Mira Tabbaa'];
  for (const [i, fullName] of leadNames.entries()) {
    await make('reception', '/reception/leads', { fullName, mobileNumber: `0993${String(100000 + i * 1777).slice(0, 6)}`, notes: pick(['Asked about summer camp', 'Wants robotics for 10-year-old', 'Interested in drones', 'Called twice'], i) }, (x) => `/reception/leads/${x}`, `lead ${fullName}`);
  }
  for (const [i, c] of [
    { name: 'Hala Jaber', phone: '+963 944 120 330', subject: 'Summer camp', who: 'parent' },
    { name: 'Nizar Kanaan', phone: '+963 933 551 202', subject: 'School partnership' },
    { name: 'Reem Zaher', phone: '+963 955 700 812', subject: 'Course prices', who: 'parent' },
  ].entries()) {
    const j = await call(null, 'POST', '/contact', c);
    const id = idOf(j);
    if (id) created.push({ role: 'reception', deletePath: `/reception/contacts/${id}`, label: `contact #${i + 1}` });
  }
  for (const [i, title] of ['Open day for parents', 'Robotics competition prep'].entries()) {
    await make('reception', '/reception/events', { title, startTime: `${day(5 + i * 4)}T10:00:00Z`, endTime: `${day(5 + i * 4)}T12:00:00Z` }, (x) => `/reception/events/${x}`, `event ${title}`);
  }

  step('interests and subscription plans');
  for (const [name, description] of [['Robotics', 'Robots, sensors and motors'], ['Programming', 'Python, Scratch and web'], ['3D Design', 'Modeling and printing']]) {
    await makeOrSkip('clo', '/clo/interests', { name, description }, (x) => `/clo/interests/${x}`, `interest ${name}`);
  }
  for (const [name, monthlyHours, price] of [['Starter — 8 h/month', 8, 60], ['Pro — 16 h/month', 16, 110]] as const) {
    await makeOrSkip('clo', '/clo/subscription-plans', { name, monthlyHours, price }, (x) => `/clo/subscription-plans/${x}`, `plan ${name}`);
  }

  step('inventory: parts, stock, orders, project');
  const parts: string[] = [];
  for (const [i, [name, category, sku, qty]] of ([
    ['Servo motor SG90', 'motors', 'MOT-SG90', 40], ['DC motor 6V', 'motors', 'MOT-DC6', 25], ['Ultrasonic sensor HC-SR04', 'sensors', 'SEN-HCSR04', 30],
    ['IR line sensor', 'sensors', 'SEN-IR', 18], ['Arduino Uno R3', 'boards', 'BRD-UNO', 15], ['Breadboard 830', 'prototyping', 'PRO-BB830', 50],
    ['Jumper wires (pack)', 'prototyping', 'PRO-JMP', 60], ['LiPo battery 7.4V', 'power', 'PWR-LIPO', 4],
  ] as const).entries()) {
    const id = await make('admin', '/parts/', { name, category, sku }, (x) => `/parts/${x}`, `part ${name}`);
    parts.push(id);
    await call('admin', 'POST', '/stock/adjust', { partId: id, qtyChange: qty, reason: 'purchase', notes: `Demo stock #${i + 1}` });
  }
  const order1 = idOf(await call('trainer', 'POST', '/orders/', { items: [{ partId: parts[0], qty: 6 }, { partId: parts[2], qty: 4 }] }));
  await call('admin', 'POST', `/orders/${order1}/approve`);
  idOf(await call('trainer', 'POST', '/orders/', { items: [{ partId: parts[4], qty: 3 }] }));
  await make('admin', '/projects/', { title: 'Line-follower robot kit' }, (x) => `/projects/${x}`, 'inventory project');

  step('posts, competition, teams');
  await makeOrSkip('admin', '/posts/', { slug: 'summer-camp-2026', title: 'Summer camp 2026 is open', body: 'Registration for our robotics summer camp is now open for ages 8–16.' }, (x) => `/posts/${x}`, 'post summer camp');
  await makeOrSkip('admin', '/posts/', { slug: 'wro-results', title: 'Our WRO results', body: 'Our junior team reached the national final this year.' }, (x) => `/posts/${x}`, 'post WRO');
  const comp = await make('admin', '/competitions/', { title: 'WRO Syria 2026', description: 'World Robot Olympiad — national round', startDate: day(40), endDate: day(41) }, (x) => `/competitions/${x}`, 'competition WRO');
  for (const [name, members] of [['Aleppo Bots', ['Omar', 'Lina', 'Yousef']], ['Circuit Breakers', ['Maya', 'Karim']]] as const) {
    await make('admin', '/teams/', { competitionId: comp, name, members }, (x) => `/teams/${x}`, `team ${name}`);
  }

  step('internal work: projects and tasks');
  const proj1 = await make('cto', '/cto/internal/projects', { name: 'School lab setup — Al-Amal School', priority: 1, assignedEngineers: [seedIds.engineer], clients: [seedIds.client] }, (x) => `/cto/internal/projects/${x}`, 'CTO project lab');
  const proj2 = await make('cto', '/cto/internal/projects', { name: 'New website content', priority: 2, assignedEngineers: [seedIds.engineer] }, (x) => `/cto/internal/projects/${x}`, 'CTO project website');
  const taskDefs = [
    { projectId: proj1, title: 'Order lab equipment', priority: 1, dueDate: day(4) },
    { projectId: proj1, title: 'Install workstations', priority: 2, dueDate: day(12) },
    { projectId: proj1, title: 'Train the school teachers', priority: 2, dueDate: day(20) },
    { projectId: proj2, title: 'Write course pages', priority: 3, dueDate: day(7) },
    { projectId: proj2, title: 'Photo shoot in the lab', priority: 3, dueDate: day(-2) },
  ];
  const taskIds: string[] = [];
  for (const t of taskDefs) taskIds.push(await make('cto', '/cto/internal/tasks', { ...t, assignedTo: [seedIds.engineer] }, (x) => `/cto/internal/tasks/${x}`, `task ${t.title}`));
  // A task moves todo → in_progress → done (it can't skip a step)
  const setStatus = (taskId: string, status: string) =>
    call('engineer', 'PATCH', `/engineer/tasks/${taskId}/status`, { status }).catch((e) => console.log(`  (task status: ${(e as Error).message})`));
  await setStatus(taskIds[0]!, 'in_progress');
  await setStatus(taskIds[0]!, 'done');
  await setStatus(taskIds[1]!, 'in_progress');
}

/** Deletes demo accounts the manifest doesn't know about (e.g. from an older run). */
async function sweepDemoAccounts(): Promise<number> {
  const list = await call('reception', 'GET', `/reception/users?search=${encodeURIComponent(DEMO_DOMAIN)}&limit=200`);
  const leftovers = ((list.data ?? []) as Json[]).filter((u) => String(u.email).endsWith(`@${DEMO_DOMAIN}`));
  for (const u of leftovers) {
    try { await call('reception', 'DELETE', `/reception/users/${u._id}`); }
    catch (e) { console.log(`  could not delete ${u.email}: ${(e as Error).message}`); }
  }
  return leftovers.length;
}

async function remove(): Promise<void> {
  if (!fs.existsSync(MANIFEST)) {
    const swept = await sweepDemoAccounts();
    return console.log(swept ? `Removed ${swept} leftover demo accounts.` : 'Nothing to remove.');
  }
  const items = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Created[];
  const left: Created[] = [];
  for (const item of [...items].reverse()) {
    try {
      await call(item.role, 'DELETE', item.deletePath);
    } catch (e) {
      const msg = (e as Error).message;
      if (/→ 404/.test(msg)) continue; // already gone (e.g. removed with its parent)
      console.log(`  could not delete ${item.label}: ${msg}`);
      left.push(item);
    }
  }
  if (left.length) fs.writeFileSync(MANIFEST, JSON.stringify(left.reverse(), null, 1));
  else fs.unlinkSync(MANIFEST);
  await sweepDemoAccounts();
  console.log(`Removed ${items.length - left.length} of ${items.length} demo records${left.length ? ' (the rest are listed in scripts/.demo-data.json)' : ''}.`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--remove')) return remove();
  if (fs.existsSync(MANIFEST)) throw new Error('Demo data already exists (scripts/.demo-data.json). Run with --remove first.');
  try {
    await create();
    console.log(`Done: ${created.length} demo records.`);
  } finally {
    // Always save what was created, so a failed run can still be removed
    if (created.length) fs.writeFileSync(MANIFEST, JSON.stringify(created, null, 1));
  }
}

main().catch((e) => {
  console.error(`Demo data failed: ${(e as Error).message}`);
  process.exit(1);
});
