/**
 * Seed Users Script
 *
 * Creates (or updates) staff accounts in MongoDB.
 * Passwords are bcrypt-hashed exactly as the auth system expects.
 * Safe to re-run — uses upsert so existing users are updated, not duplicated.
 *
 * Usage:
 *   node src/scripts/seedUsers.js
 *
 * Requires .env with MONGO_URI (and optionally MONGO_URI_2 as fallback).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

// ─── Users to seed ──────────────────────────────────────────────────────────
const PLAIN_PASSWORD = '123456';

const USERS = [
  {
    email: 'fedaa@robotrick.net',
    name:  'Fedaa',
    role:  'clo',
  },
  {
    email: 'rawan@robotrick.net',
    name:  'Rawan',
    role:  'reception',
  },
];
// ────────────────────────────────────────────────────────────────────────────

async function connectWithFallback() {
  const cluster1 = process.env.MONGO_URI;
  const cluster2 = process.env.MONGO_URI_2;

  const opts = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  for (const [label, uri] of [['Cluster 1', cluster1], ['Cluster 2', cluster2]]) {
    if (!uri) { console.log(`⏭️  ${label} not configured — skipping`); continue; }
    try {
      console.log(`🔄 Connecting to ${label}...`);
      await mongoose.connect(uri, opts);
      console.log(`✅ Connected to ${label}\n`);
      return;
    } catch (err) {
      console.error(`❌ ${label} failed: ${err.message}`);
    }
  }
  throw new Error('All database clusters failed. Check MONGO_URI / MONGO_URI_2 in .env');
}

async function seed() {
  await connectWithFallback();

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(PLAIN_PASSWORD, saltRounds);

  console.log(`🔑 Password "${PLAIN_PASSWORD}" hashed (bcrypt, ${saltRounds} rounds)\n`);
  console.log('─'.repeat(55));

  for (const userData of USERS) {
    const result = await User.findOneAndUpdate(
      { email: userData.email },
      {
        $set: {
          email:        userData.email,
          name:         userData.name,
          role:         userData.role,
          passwordHash: passwordHash,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const action = result.createdAt?.getTime() === result.updatedAt?.getTime()
      ? '🆕 Created'
      : '🔄 Updated';

    console.log(`${action}  ${userData.email}`);
    console.log(`         Name : ${result.name}`);
    console.log(`         Role : ${result.role}`);
    console.log(`         ID   : ${result._id}`);
    console.log('─'.repeat(55));
  }

  console.log('\n✅ Seeding complete.\n');
  console.log('Login credentials:');
  USERS.forEach(u => {
    console.log(`  ${u.role.padEnd(12)} ${u.email}  /  ${PLAIN_PASSWORD}`);
  });
  console.log('');
}

seed()
  .catch(err => {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
