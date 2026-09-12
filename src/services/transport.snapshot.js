// Trip snapshot builders.
//
// When a trip is scheduled, we freeze the participating students into an
// immutable `studentsSnapshot` on the trip document. This means later edits
// to the driver/student records can't retroactively change historical trips
// (which would break audit trails and recompute past earnings).
//
// `buildInitialStudentStatuses` produces the matching status rows the driver
// will update during the trip (pending → picked → dropped, etc.).

function buildTripSnapshot(driverStudents, direction = 'to_academy') {
  const active = driverStudents.filter(ds => ds.isActive);

  // Use the direction-specific pickup order if available; fall back to the
  // generic pickupOrder, and finally to the array index. We sort by that order
  // and then renumber 1..N so the snapshot never has gaps (e.g. 3,4 after a
  // student was removed).
  const sorted = active
    .map((ds, i) => ({
      studentId:   ds.studentId?._id || ds.studentId,
      studentName: ds.studentId?.name || ds._studentName || '',
      phoneNumber: ds.phoneNumber || '',
      pickupOrder: direction === 'to_academy'
        ? (ds.pickupOrderToAcademy ?? ds.pickupOrder ?? i + 1)
        : (ds.pickupOrderFromAcademy ?? ds.pickupOrder ?? i + 1),
      homeAddress: ds.homeAddress || '',
      homeLocation: ds.homeLocation || null,
      distanceKm:  ds.distanceKm || null,
    }))
    .sort((a, b) => a.pickupOrder - b.pickupOrder);

  sorted.forEach((s, i) => { s.pickupOrder = i + 1; });
  return sorted;
}

function buildInitialStudentStatuses(driverStudents) {
  return driverStudents
    .filter(ds => ds.isActive)
    .map(ds => ({
      studentId: ds.studentId?._id || ds.studentId,
      status: 'pending',
    }));
}

module.exports = { buildTripSnapshot, buildInitialStudentStatuses };
