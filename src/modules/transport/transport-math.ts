import type { DriverStudentRow, PricingRow, RateTier, StudentSnapshot, TripDirection } from './transport.table';

export interface LatLng {
  lat: number;
  lng: number;
}

export const DEFAULT_ACADEMY: LatLng = { lat: 36.2021, lng: 37.1343 };

/** Straight-line distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const roundUpTo25k = (v: number) => Math.ceil(v / 25000) * 25000;

/** distance × legs × sessions × rate, rounded up to the next 25,000. */
export function studentMonthlyFee(distanceKm: number | null, sessionsPerMonth: number, pricing: Pick<PricingRow, 'studentRatePerKm' | 'legMultiplier'>): number {
  if (!distanceKm || !sessionsPerMonth || !pricing.studentRatePerKm) return 0;
  return roundUpTo25k(distanceKm * (pricing.legMultiplier || 3) * sessionsPerMonth * pricing.studentRatePerKm);
}

/** The driver's per-km rate for a trip with this many students (tier match, else the base rate). */
export function driverRatePerKm(studentCount: number, pricing: { driverRatePerKm: number; driverRateTiers: RateTier[] }): number {
  const tier = pricing.driverRateTiers.find((t) => studentCount >= t.minStudents && (t.maxStudents == null || studentCount <= t.maxStudents));
  return tier ? tier.ratePerKm : pricing.driverRatePerKm;
}

export function tripEarnings(studentCount: number, pricing: { driverRatePerKm: number; driverRateTiers: RateTier[] }, routeKm: number | null): number | null {
  if (routeKm == null || routeKm <= 0) return null;
  return Number.parseFloat((routeKm * driverRatePerKm(studentCount, pricing)).toFixed(2));
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

/** Distinct class days per week × 4.33. */
export function estimateSessionsPerMonth(schedule: { day: string }[]): number {
  const days = new Set(schedule.map((s) => s.day.toLowerCase()).filter((d) => WEEKDAYS.includes(d)));
  return Number.parseFloat((days.size * 4.33).toFixed(1));
}

export const dayName = (d: Date) => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()]!;

/** The students on a trip, in pickup order for the direction (renumbered 1…n). */
export function buildSnapshot(seats: (DriverStudentRow & { studentName: string })[], direction: TripDirection): StudentSnapshot[] {
  return seats
    .filter((s) => s.isActive)
    .map((s, i) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      phoneNumber: s.phoneNumber ?? '',
      pickupOrder: (direction === 'to_academy' ? s.pickupOrderToAcademy : s.pickupOrderFromAcademy) ?? s.pickupOrder ?? i + 1,
      homeAddress: s.homeAddress ?? '',
      homeLocation: s.homeLat != null && s.homeLng != null ? { lat: s.homeLat, lng: s.homeLng } : null,
      distanceKm: s.distanceKm ?? null,
    }))
    .sort((a, b) => a.pickupOrder - b.pickupOrder)
    .map((s, i) => ({ ...s, pickupOrder: i + 1 }));
}

/** Visit order by always going to the nearest remaining stop. */
export function nearestNeighbourOrder(origin: LatLng, stops: LatLng[]): number[] {
  const left = stops.map((s, i) => ({ ...s, i }));
  const order: number[] = [];
  let at = origin;
  while (left.length) {
    let best = 0;
    for (let k = 1; k < left.length; k++) if (haversineKm(at, left[k]!) < haversineKm(at, left[best]!)) best = k;
    const [next] = left.splice(best, 1);
    order.push(next!.i);
    at = next!;
  }
  return order;
}

// ---- Road routing (Google Directions, with straight-line fallbacks) ----

export interface RoadRouter {
  /** Road distance from a home to the academy. */
  roadDistanceKm(from: LatLng, to: LatLng): Promise<number>;
  /** Best order to visit `stops` between origin and destination, and the route length if known. */
  optimize(origin: LatLng, stops: LatLng[], destination: LatLng): Promise<{ order: number[]; totalRouteKm: number | null }>;
  /** Length of a route through the stops in the given order, if known. */
  routeKm(origin: LatLng, stops: LatLng[], destination: LatLng): Promise<number | null>;
}

const ROAD_FACTOR = 1.35;

/** Used without a Google key (and in tests): straight line × 1.35, nearest-neighbour order, unknown lengths. */
export const estimateRouter: RoadRouter = {
  roadDistanceKm: async (from, to) => Number.parseFloat((haversineKm(from, to) * ROAD_FACTOR).toFixed(2)),
  optimize: async (origin, stops) => ({ order: nearestNeighbourOrder(origin, stops), totalRouteKm: null }),
  routeKm: async () => null,
};

interface DirectionsResponse {
  status: string;
  routes?: { waypoint_order?: number[]; legs?: { distance?: { value?: number } }[] }[];
}

/** Google Directions; any failure falls back to the estimates. */
export class GoogleRoadRouter implements RoadRouter {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async directions(origin: LatLng, destination: LatLng, stops: LatLng[] = [], optimize = false): Promise<DirectionsResponse | null> {
    const params = new URLSearchParams({ origin: `${origin.lat},${origin.lng}`, destination: `${destination.lat},${destination.lng}`, mode: 'driving', key: this.apiKey });
    if (stops.length) params.set('waypoints', `${optimize ? 'optimize:true|' : ''}${stops.map((s) => `${s.lat},${s.lng}`).join('|')}`);
    try {
      const res = await this.fetchImpl(`https://maps.googleapis.com/maps/api/directions/json?${params}`, { signal: AbortSignal.timeout(10000) });
      const body = (await res.json()) as DirectionsResponse;
      return body.status === 'OK' && body.routes?.[0] ? body : null;
    } catch {
      return null;
    }
  }

  private static km(body: DirectionsResponse): number | null {
    const meters = (body.routes![0]!.legs ?? []).reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
    return meters > 0 ? Number.parseFloat((meters / 1000).toFixed(2)) : null;
  }

  async roadDistanceKm(from: LatLng, to: LatLng) {
    const body = await this.directions(from, to);
    return (body && GoogleRoadRouter.km(body)) ?? estimateRouter.roadDistanceKm(from, to);
  }

  async optimize(origin: LatLng, stops: LatLng[], destination: LatLng) {
    if (stops.length === 0) return { order: [], totalRouteKm: null };
    const body = await this.directions(origin, destination, stops, true);
    if (!body) return estimateRouter.optimize(origin, stops, destination);
    return { order: body.routes![0]!.waypoint_order ?? stops.map((_, i) => i), totalRouteKm: GoogleRoadRouter.km(body) };
  }

  async routeKm(origin: LatLng, stops: LatLng[], destination: LatLng) {
    const body = await this.directions(origin, destination, stops);
    return body ? GoogleRoadRouter.km(body) : null;
  }
}
