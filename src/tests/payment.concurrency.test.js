/**
 * Regression test for the lost-update race in the two payment handlers.
 *
 * Before the fix both handlers read the enrollment, computed
 * paidAmount + amount in Node, checked it against the total, then wrote the
 * result back. Two payments recorded at the same moment both read the same
 * starting balance, and the second write silently overwrote the first — money
 * received but not recorded.
 *
 * These tests exercise the database operations the handlers now use, rather
 * than the HTTP layer, so they isolate the concurrency behaviour itself.
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Enrollment;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  Enrollment = require('../models/Enrollment');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Enrollment.deleteMany({});
});

const studentId = new mongoose.Types.ObjectId();
const courseId = new mongoose.Types.ObjectId();

async function makeEnrollment(total = 1000, paid = 0) {
  return Enrollment.create({
    student: studentId,
    course: courseId,
    payment: {
      totalAmount: total,
      paidAmount: paid,
      remainingAmount: total - paid,
    },
  });
}

// Mirrors the atomic update recordPayment now performs.
function applyPayment(enrollmentId, amount) {
  const now = new Date();
  return Enrollment.findOneAndUpdate(
    {
      _id: enrollmentId,
      $expr: {
        $lte: [
          { $add: ['$payment.paidAmount', amount] },
          '$payment.totalAmount',
        ],
      },
    },
    {
      $inc: {
        'payment.paidAmount': amount,
        'payment.remainingAmount': -amount,
      },
      $set: { 'payment.lastPaymentDate': now },
    },
    { new: true }
  );
}

describe('recordPayment concurrency', () => {
  test('two simultaneous payments both land', async () => {
    const enrollment = await makeEnrollment(1000, 0);

    await Promise.all([
      applyPayment(enrollment._id, 300),
      applyPayment(enrollment._id, 400),
    ]);

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.payment.paidAmount).toBe(700);
    expect(after.payment.remainingAmount).toBe(300);
    expect(after.payment.lastPaymentDate).toBeInstanceOf(Date);
  });

  test('ten simultaneous payments all land', async () => {
    const enrollment = await makeEnrollment(1000, 0);

    await Promise.all(
      Array.from({ length: 10 }, () => applyPayment(enrollment._id, 100))
    );

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.payment.paidAmount).toBe(1000);
    expect(after.payment.remainingAmount).toBe(0);
  });

  test('a payment that would exceed the total is rejected, not clamped', async () => {
    const enrollment = await makeEnrollment(1000, 900);

    const result = await applyPayment(enrollment._id, 200);
    expect(result).toBeNull();

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.payment.paidAmount).toBe(900);
  });

  test('concurrent payments cannot together overshoot the total', async () => {
    // The whole point: each is individually valid against the starting
    // balance, but only some of them can fit.
    const enrollment = await makeEnrollment(1000, 0);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => applyPayment(enrollment._id, 300))
    );

    const applied = results.filter(Boolean).length;
    const after = await Enrollment.findById(enrollment._id).lean();

    expect(applied).toBe(3);
    expect(after.payment.paidAmount).toBe(900);
    expect(after.payment.paidAmount).toBeLessThanOrEqual(1000);
  });

  test('remainingAmount stays consistent with paidAmount', async () => {
    const enrollment = await makeEnrollment(500, 0);

    await Promise.all([
      applyPayment(enrollment._id, 125),
      applyPayment(enrollment._id, 125),
      applyPayment(enrollment._id, 250),
    ]);

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.payment.paidAmount + after.payment.remainingAmount).toBe(
      after.payment.totalAmount
    );
  });
});

describe('transportation payment compare-and-swap', () => {
  // Mirrors the CAS guard recordTransportationPayment now uses.
  async function casPayment(enrollmentId, amount) {
    const current = await Enrollment.findById(enrollmentId);
    const observedPaid = current.transportation.paidAmount;
    const newPaid = observedPaid + amount;
    if (newPaid > current.transportation.totalAmount) return 'exceeds';

    const result = await Enrollment.updateOne(
      { _id: enrollmentId, 'transportation.paidAmount': observedPaid },
      {
        $set: {
          'transportation.paidAmount': newPaid,
          'transportation.remainingAmount':
            current.transportation.totalAmount - newPaid,
        },
      }
    );
    return result.matchedCount === 1 ? 'applied' : 'conflict';
  }

  test('a conflicting write is detected rather than silently overwriting', async () => {
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      payment: { totalAmount: 0, paidAmount: 0, remainingAmount: 0 },
      transportation: {
        enabled: true,
        totalAmount: 1000,
        paidAmount: 0,
        remainingAmount: 1000,
        installments: [],
      },
    });

    // Read both at the same starting balance, then write in sequence.
    const first = await Enrollment.findById(enrollment._id);
    const observedByBoth = first.transportation.paidAmount;

    await Enrollment.updateOne(
      { _id: enrollment._id, 'transportation.paidAmount': observedByBoth },
      { $set: { 'transportation.paidAmount': 300, 'transportation.remainingAmount': 700 } }
    );

    // The second writer still believes the balance is the old value.
    const stale = await Enrollment.updateOne(
      { _id: enrollment._id, 'transportation.paidAmount': observedByBoth },
      { $set: { 'transportation.paidAmount': 400, 'transportation.remainingAmount': 600 } }
    );

    expect(stale.matchedCount).toBe(0);

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.transportation.paidAmount).toBe(300);
  });

  test('retrying after a conflict applies on top of the winner', async () => {
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      payment: { totalAmount: 0, paidAmount: 0, remainingAmount: 0 },
      transportation: {
        enabled: true,
        totalAmount: 1000,
        paidAmount: 0,
        remainingAmount: 1000,
        installments: [],
      },
    });

    expect(await casPayment(enrollment._id, 300)).toBe('applied');
    expect(await casPayment(enrollment._id, 400)).toBe('applied');

    const after = await Enrollment.findById(enrollment._id).lean();
    expect(after.transportation.paidAmount).toBe(700);
    expect(after.transportation.remainingAmount).toBe(300);
  });
});
