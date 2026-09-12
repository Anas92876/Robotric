// Trip-event push notifications + persisted notification records.
//
// Whenever a trip transitions through a notable state (started, completed,
// cancelled, or the driver arrives at a specific student's location), we both:
//
//   1. Insert a Notification document so the student sees it in-app.
//   2. Send a push via the device notification service.
//
// Failures here are non-fatal — we log and swallow, since notification
// delivery shouldn't ever block the trip lifecycle itself.

const { sendNotificationToUsers } = require('./notification.service');
const Notification = require('../models/Notification');

const TRIP_NOTIFICATIONS = {
  started: {
    title: { en: 'Trip Started 🚌', ar: 'الرحلة انطلقت 🚌' },
    body:  { en: 'Your driver has started the trip', ar: 'سائقك بدأ الرحلة' },
  },
  arrived: {
    title: { en: 'Driver Arrived 📍', ar: 'وصل السائق 📍' },
    body:  { en: 'Your driver has arrived at your location', ar: 'وصل سائقك إلى موقعك' },
  },
  completed: {
    title: { en: 'Trip Completed ✓', ar: 'اكتملت الرحلة ✓' },
    body:  { en: 'Your transportation trip has been completed', ar: 'اكتملت رحلتك' },
  },
  cancelled: {
    title: { en: 'Trip Cancelled', ar: 'الرحلة ملغاة' },
    body:  { en: "Today's trip has been cancelled", ar: 'رحلة اليوم ملغاة' },
  },
};

function buildPayload(eventType, msg, tripId) {
  return {
    type: 'transport',
    title: msg.title.en,
    message: msg.body.en,
    data: { tripId, eventType, titleAr: msg.title.ar, messageAr: msg.body.ar },
  };
}

async function notifyTripStudents(trip, eventType) {
  const msg = TRIP_NOTIFICATIONS[eventType];
  if (!msg) return;

  const studentIds = trip.studentsSnapshot.map(s => s.studentId);
  if (!studentIds.length) return;

  try {
    const payload = buildPayload(eventType, msg, trip._id);

    await Notification.insertMany(
      studentIds.map(studentId => ({ userId: studentId, ...payload })),
      { ordered: false }
    );

    await sendNotificationToUsers(
      studentIds.map(id => id.toString()),
      msg.title.en,
      msg.body.en,
      { tripId: trip._id.toString(), type: 'transport', eventType }
    );
  } catch (err) {
    console.error('[transport.notifications] notifyTripStudents error:', err.message);
  }
}

async function notifySingleStudent(studentId, eventType, tripId) {
  const msg = TRIP_NOTIFICATIONS[eventType];
  if (!msg) return;

  try {
    await Notification.create({ userId: studentId, ...buildPayload(eventType, msg, tripId) });

    await sendNotificationToUsers(
      [studentId.toString()],
      msg.title.en,
      msg.body.en,
      { tripId: tripId.toString(), type: 'transport', eventType }
    );
  } catch (err) {
    console.error('[transport.notifications] notifySingleStudent error:', err.message);
  }
}

module.exports = { notifyTripStudents, notifySingleStudent };
