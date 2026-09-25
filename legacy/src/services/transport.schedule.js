// Student weekly-schedule lookup for the transport scheduler.
//
// Why this exists
// ───────────────
// The transport scheduler used to generate trips for every weekday and put
// every active student of the driver on each trip — regardless of whether
// the student's course had a session that day. Result: a driver would see
// a Tuesday trip with 5 students even though only 1 of them attends class
// on Tuesdays.
//
// This module looks at the source of truth (Group.schedule) and tells the
// scheduler exactly which students need a ride on which day. The cron then
// generates trips only when there's actually someone to pick up.
//
// Day-name handling
// ─────────────────
// Group.schedule.day is enum-validated as 'Monday'..'Sunday' (capitalized).
// We normalize everything to lowercase here so consumers can do
// `set.has('monday')` regardless of stored casing.

const Group = require('../models/Group');

/** JS Date.getDay() is 0..6 with Sunday=0. Map to the lowercase enum value. */
const JS_DAY_TO_NAME = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dayNameForDate(date) {
  return JS_DAY_TO_NAME[date.getDay()];
}

/**
 * For each studentId, return the set of weekday-names they have at least
 * one group session on. Days are lowercase strings like 'monday'.
 *
 * Multiple groups per student are unioned — if Course A meets Mon/Wed and
 * Course B meets Tue, the student needs a ride on Mon/Tue/Wed.
 *
 * @param {Array<string|ObjectId>} studentIds
 * @returns {Promise<Map<string, Set<string>>>} keyed by studentId.toString()
 */
async function getStudentScheduleDays(studentIds) {
  const result = new Map();
  if (!studentIds || studentIds.length === 0) return result;

  // Seed every requested student with an empty set so callers can rely on
  // map.get(id) returning a Set rather than undefined.
  studentIds.forEach(id => result.set(String(id), new Set()));

  // Find all groups that contain any of these students. The Group.schedule
  // field is small (one entry per weekly session), so projecting students +
  // schedule keeps the response light.
  const groups = await Group.find({ students: { $in: studentIds } })
    .select('students schedule')
    .lean();

  for (const group of groups) {
    if (!Array.isArray(group.schedule)) continue;
    const days = new Set(
      group.schedule
        .map(s => typeof s.day === 'string' ? s.day.toLowerCase() : null)
        .filter(Boolean)
    );
    if (days.size === 0) continue;

    for (const studentId of group.students || []) {
      const key = String(studentId);
      const set = result.get(key);
      if (!set) continue; // not in the requested list
      days.forEach(d => set.add(d));
    }
  }

  return result;
}

/**
 * Filter a list of student ids to those who have a group session on the
 * given Date. Convenience wrapper around getStudentScheduleDays.
 */
async function filterStudentsWithSessionOn(studentIds, date) {
  const day = dayNameForDate(date);
  const byStudent = await getStudentScheduleDays(studentIds);
  return studentIds.filter(id => byStudent.get(String(id))?.has(day));
}

module.exports = {
  dayNameForDate,
  getStudentScheduleDays,
  filterStudentsWithSessionOn,
};
