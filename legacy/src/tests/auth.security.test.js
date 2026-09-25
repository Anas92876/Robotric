/**
 * Characterization + regression tests for the Phase 0 auth security fixes.
 *
 * These cover the three defects fixed together:
 *   1. passwordHash was returned by almost every user query.
 *   2. OTP secrets and pending password hashes lived in the `profile` Mixed
 *      blob, which staff-facing endpoints serialise wholesale.
 *   3. A JWT stayed valid for its full 7-day life with no way to revoke it.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let User;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  User = require('../models/User');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

async function makeUser(overrides = {}) {
  return User.create({
    email: 'student@example.test',
    passwordHash: await bcrypt.hash('correct horse', 10),
    name: 'Test Student',
    role: 'student',
    ...overrides,
  });
}

describe('passwordHash exposure', () => {
  test('is not returned by an ordinary findById', async () => {
    const created = await makeUser();
    const found = await User.findById(created._id);
    expect(found.passwordHash).toBeUndefined();
  });

  test('is not returned by find() — the shape staff endpoints serialise', async () => {
    await makeUser();
    const users = await User.find({}).lean();
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  test('is available when explicitly selected, so login can still verify', async () => {
    await makeUser();
    const found = await User.findOne({ email: 'student@example.test' }).select('+passwordHash');
    expect(found.passwordHash).toBeDefined();
    expect(await bcrypt.compare('correct horse', found.passwordHash)).toBe(true);
  });

  test('can still be written on a document fetched without it', async () => {
    const created = await makeUser();
    const found = await User.findById(created._id);
    found.passwordHash = await bcrypt.hash('new secret', 10);
    await found.save();

    const reloaded = await User.findById(created._id).select('+passwordHash');
    expect(await bcrypt.compare('new secret', reloaded.passwordHash)).toBe(true);
  });
});

describe('OTP secrets exposure', () => {
  test('auth secrets are not returned by an ordinary query', async () => {
    const created = await makeUser();
    created.auth = { forgotOTP: '123456', forgotOTPExpiry: new Date(Date.now() + 600000) };
    await created.save();

    const found = await User.findById(created._id).lean();
    expect(found.auth).toBeUndefined();
  });

  test('a staff-style user listing exposes no OTP and no pending hash', async () => {
    const created = await makeUser();
    created.auth = {
      forgotOTP: '123456',
      passwordOTP: '654321',
      pendingPasswordHash: await bcrypt.hash('attacker-chosen', 10),
      pendingEmail: 'attacker@example.test',
    };
    await created.save();

    // Mirrors reception.controller getAllUsers
    const listed = await User.find({}).select('-passwordHash').lean();
    const serialised = JSON.stringify(listed);

    expect(serialised).not.toContain('123456');
    expect(serialised).not.toContain('654321');
    expect(serialised).not.toContain('attacker@example.test');
    expect(serialised).not.toContain('pendingPasswordHash');
  });

  test('auth secrets are readable when explicitly selected', async () => {
    const created = await makeUser();
    created.auth = { forgotOTP: '123456' };
    await created.save();

    const found = await User.findById(created._id).select('+auth');
    expect(found.auth.forgotOTP).toBe('123456');
  });
});

describe('token revocation', () => {
  test('new users start at version 0', async () => {
    const created = await makeUser();
    expect(created.tokenVersion).toBe(0);
  });

  test('a token carrying a stale version no longer matches the user', async () => {
    const created = await makeUser();
    const issuedVersion = created.tokenVersion ?? 0;

    created.tokenVersion = (created.tokenVersion ?? 0) + 1;
    await created.save();

    const current = await User.findById(created._id).select('tokenVersion').lean();
    expect((issuedVersion ?? 0) !== (current.tokenVersion ?? 0)).toBe(true);
  });

  test('a legacy token with no tokenVersion claim still matches an untouched user', async () => {
    // Tokens issued before this change carry no claim. They must keep working,
    // otherwise deploying this logs out every active user at once.
    const created = await makeUser();
    const legacyClaim = undefined;

    const current = await User.findById(created._id).select('tokenVersion').lean();
    expect((legacyClaim ?? 0) !== (current.tokenVersion ?? 0)).toBe(false);
  });

  test('a legacy token stops working once the user is revoked', async () => {
    const created = await makeUser();
    created.tokenVersion = 1;
    await created.save();

    const current = await User.findById(created._id).select('tokenVersion').lean();
    expect((undefined ?? 0) !== (current.tokenVersion ?? 0)).toBe(true);
  });
});
