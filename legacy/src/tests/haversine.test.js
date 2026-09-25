const haversineKm = require('../utils/haversine');

describe('haversineKm', () => {
  test('same point returns 0', () => {
    expect(haversineKm(36.2021, 37.1343, 36.2021, 37.1343)).toBe(0);
  });

  test('Aleppo to Damascus is ~300 km', () => {
    // Aleppo (36.2021, 37.1343) → Damascus (33.5138, 36.2765)
    const km = haversineKm(36.2021, 37.1343, 33.5138, 36.2765);
    expect(km).toBeGreaterThan(290);
    expect(km).toBeLessThan(310);
  });

  test('known short distance — ~5 km within Aleppo', () => {
    // Al-Forqan area to Aleppo city center (~5 km apart)
    const km = haversineKm(36.2021, 37.1343, 36.1901, 37.1600);
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(8);
  });

  test('is symmetric — A→B equals B→A', () => {
    const ab = haversineKm(36.2021, 37.1343, 36.25, 37.20);
    const ba = haversineKm(36.25, 37.20, 36.2021, 37.1343);
    expect(Math.abs(ab - ba)).toBeLessThan(0.001);
  });

  test('returns a number, not NaN', () => {
    const result = haversineKm(36.2021, 37.1343, 36.22, 37.15);
    expect(typeof result).toBe('number');
    expect(isNaN(result)).toBe(false);
  });
});
