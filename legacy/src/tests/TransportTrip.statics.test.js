// TransportTrip.isValidTransition — no DB needed, testing the static method directly
// We require the model but mongoose doesn't connect — statics are defined on schema load.

// Prevent mongoose from attempting a real connection
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return actual;
});

const TransportTrip = require('../models/TransportTrip');

describe('TransportTrip.isValidTransition', () => {
  // ── Valid transitions ────────────────────────────────────────────────────────
  test('scheduled → in_travel is allowed', () => {
    expect(TransportTrip.isValidTransition('scheduled', 'in_travel')).toBe(true);
  });

  test('scheduled → cancelled is allowed', () => {
    expect(TransportTrip.isValidTransition('scheduled', 'cancelled')).toBe(true);
  });

  test('in_travel → completed is allowed', () => {
    expect(TransportTrip.isValidTransition('in_travel', 'completed')).toBe(true);
  });

  test('in_travel → cancelled is allowed', () => {
    expect(TransportTrip.isValidTransition('in_travel', 'cancelled')).toBe(true);
  });

  // ── Invalid transitions — the ones that must be blocked ─────────────────────
  test('scheduled → completed is BLOCKED (must go through in_travel)', () => {
    expect(TransportTrip.isValidTransition('scheduled', 'completed')).toBe(false);
  });

  test('completed → in_travel is BLOCKED', () => {
    expect(TransportTrip.isValidTransition('completed', 'in_travel')).toBe(false);
  });

  test('completed → cancelled is BLOCKED', () => {
    expect(TransportTrip.isValidTransition('completed', 'cancelled')).toBe(false);
  });

  test('cancelled → in_travel is BLOCKED', () => {
    expect(TransportTrip.isValidTransition('cancelled', 'in_travel')).toBe(false);
  });

  test('cancelled → completed is BLOCKED', () => {
    expect(TransportTrip.isValidTransition('cancelled', 'completed')).toBe(false);
  });

  test('in_travel → scheduled is BLOCKED (no going back)', () => {
    expect(TransportTrip.isValidTransition('in_travel', 'scheduled')).toBe(false);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────
  test('unknown status returns false', () => {
    expect(TransportTrip.isValidTransition('ghost', 'completed')).toBe(false);
  });

  test('same status → same transition returns false', () => {
    expect(TransportTrip.isValidTransition('scheduled', 'scheduled')).toBe(false);
    expect(TransportTrip.isValidTransition('in_travel', 'in_travel')).toBe(false);
  });
});

describe('TransportTrip.ALLOWED_TRANSITIONS shape', () => {
  test('all four statuses are present as keys', () => {
    const keys = Object.keys(TransportTrip.ALLOWED_TRANSITIONS);
    expect(keys).toContain('scheduled');
    expect(keys).toContain('in_travel');
    expect(keys).toContain('completed');
    expect(keys).toContain('cancelled');
  });

  test('terminal states have empty arrays', () => {
    expect(TransportTrip.ALLOWED_TRANSITIONS.completed).toHaveLength(0);
    expect(TransportTrip.ALLOWED_TRANSITIONS.cancelled).toHaveLength(0);
  });
});
