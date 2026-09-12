function computeAttendanceWithStartingSessions(attendedCount, totalCount, startingSessionNumber = 1) {
  const totalSessions = Number(totalCount) || 0;
  const attendedSessions = Number(attendedCount) || 0;
  const startNumber = Number(startingSessionNumber) || 1;

  const virtualPastSessions = Math.max(0, startNumber - 1);
  const effectiveTotal = totalSessions + virtualPastSessions;
  const effectiveAttended = attendedSessions + virtualPastSessions;

  if (effectiveTotal <= 0) {
    return 0;
  }

  return Math.round((effectiveAttended / effectiveTotal) * 100);
}

module.exports = {
  computeAttendanceWithStartingSessions
};

