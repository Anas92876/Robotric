// Daily transport trip scheduler.
//
// What it does
// ────────────
// Once a day at 00:01 Damascus time, look at every driver who has at least
// one student assigned. For each driver:
//   1. Find which of their students actually have a class session today
//      (based on Group.schedule — the source of truth for who attends when).
//   2. If nobody has a session → skip the driver entirely. No empty trips.
//   3. Otherwise, create one to_academy trip + one from_academy trip,
//      snapshotting only the students who need a ride.
//
// The scheduler is idempotent: if a non-cancelled trip already exists for
// (driver, direction, date) we skip rather than duplicate.
//
// Why no startup-time run anymore
// ───────────────────────────────
// Previously this module also ran scheduleDailyTrips() once on server boot
// "to catch any missed trips". Combined with how Render/Railway redeploy
// servers multiple times a day, that meant every deploy created today's
// trips with ALL students — exactly the bug reception complained about.
// Now the only trigger is the daily cron. If you need to backfill, call
// POST /api/reception/transport/trips/generate manually.

const cron = require('node-cron');
const DriverStudent  = require('../models/DriverStudent');
const TransportTrip  = require('../models/TransportTrip');
const { buildTripSnapshot, buildInitialStudentStatuses } = require('./transport.service');
const { dayNameForDate, getStudentScheduleDays } = require('./transport.schedule');

/**
 * Generate trips for all active drivers on a given date.
 *
 * Returns:
 *   { created, skipped, driversWithoutSessions, errors }
 *     - created: number of TransportTrip rows actually written
 *     - skipped: idempotency hits (trip already existed)
 *     - driversWithoutSessions: drivers whose entire roster had no class today
 *     - errors: per-driver, per-direction error messages
 */
async function scheduleDailyTrips(targetDate = new Date()) {
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay   = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const dayName = dayNameForDate(startOfDay);

  const summary = {
    created: 0,
    skipped: 0,
    driversWithoutSessions: 0,
    errors: [],
  };

  // Every distinct driver who has at least one active assignment.
  const driverIds = await DriverStudent.distinct('driverId', { isActive: true });

  for (const driverId of driverIds) {
    try {
      const driverStudents = await DriverStudent
        .find({ driverId, isActive: true })
        .populate('studentId', 'name')
        .lean();

      if (!driverStudents.length) { summary.skipped++; continue; }

      // Filter to students whose group has a session on this weekday. If
      // nobody qualifies, the driver has no trip today — don't create
      // empty / all-absent snapshots.
      const studentIds = driverStudents.map(ds => ds.studentId?._id || ds.studentId);
      const scheduleByStudent = await getStudentScheduleDays(studentIds);

      const scheduledStudents = driverStudents.filter(ds => {
        const sid = String(ds.studentId?._id || ds.studentId);
        return scheduleByStudent.get(sid)?.has(dayName);
      });

      if (scheduledStudents.length === 0) {
        summary.driversWithoutSessions++;
        continue;
      }

      // Enrich shape for the snapshot builder.
      const enriched = scheduledStudents.map(ds => ({
        ...ds,
        studentId: ds.studentId?._id || ds.studentId,
        _studentName: ds.studentId?.name || '',
      }));

      for (const direction of ['to_academy', 'from_academy']) {
        try {
          // Idempotency: don't duplicate a trip that's already on the books.
          const existing = await TransportTrip.findOne({
            driverId,
            direction,
            date: { $gte: startOfDay, $lt: endOfDay },
            status: { $ne: 'cancelled' },
          });

          if (existing) { summary.skipped++; continue; }

          await TransportTrip.create({
            driverId,
            date: new Date(startOfDay),
            direction,
            status: 'scheduled',
            studentsSnapshot: buildTripSnapshot(enriched, direction),
            studentStatuses:  buildInitialStudentStatuses(enriched),
            createdBy: null, // system-generated
          });

          summary.created++;
        } catch (err) {
          summary.errors.push({ driverId, direction, error: err.message });
        }
      }
    } catch (err) {
      summary.errors.push({ driverId, error: err.message });
    }
  }

  console.log(
    `[transport.scheduler] ${dayName} ${startOfDay.toDateString()} — ` +
    `created: ${summary.created}, skipped: ${summary.skipped}, ` +
    `no-session drivers: ${summary.driversWithoutSessions}, errors: ${summary.errors.length}`
  );

  return summary;
}

/**
 * Register the daily 00:01 Damascus cron. Does NOT run immediately on
 * startup — see the module header for why.
 */
function startTripScheduler() {
  cron.schedule('1 0 * * *', () => {
    scheduleDailyTrips().catch(err =>
      console.error('[transport.scheduler] cron run failed:', err.message)
    );
  }, { timezone: 'Asia/Damascus' });

  console.log('[transport.scheduler] Daily trip scheduler registered (00:01 Damascus time)');
}

module.exports = { scheduleDailyTrips, startTripScheduler };
