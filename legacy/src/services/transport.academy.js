// Academy location — single source of truth, cached after first lookup.
//
// Many transport-related calculations need RoboTrick's coordinates. We read them
// once from AcademySettings and memoise, since they almost never change. Tests
// and seeders can call invalidateAcademyCache() to force a re-read.

const ACADEMY_DEFAULTS = { lat: 36.2021, lng: 37.1343 };

let _cache = null;

async function getAcademyLocation() {
  if (_cache) return _cache;
  try {
    const AcademySettings = require('../models/AcademySettings');
    const settings = await AcademySettings.findOne({ key: 'default' });
    _cache = settings?.location || ACADEMY_DEFAULTS;
    return _cache;
  } catch {
    return ACADEMY_DEFAULTS;
  }
}

function invalidateAcademyCache() { _cache = null; }

module.exports = { getAcademyLocation, invalidateAcademyCache, ACADEMY_DEFAULTS };
