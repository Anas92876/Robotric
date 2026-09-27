import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverRateTier {
  minStudents: number;
  maxStudents: number | null; // null = no upper bound
  ratePerKm: number;
}

export interface TransportPricing {
  _id: string;
  name: string;
  studentRatePerKm: number;
  driverRatePerKm: number;         // fallback when no tier matches
  driverRateTiers: DriverRateTier[]; // tiered rates by student count
  legMultiplier: number;
  currency: 'SYP' | 'USD';
  isActive: boolean;
  effectiveFrom: string;
  notes?: string;
  createdAt: string;
  createdBy?: { name: string };
  updatedBy?: { name: string };
}

export interface DriverStudent {
  _id: string;
  driverId: { _id: string; name: string } | string;
  studentId: { _id: string; name: string; email: string };
  enrollmentId?: string;
  homeLocation: { lat: number; lng: number };
  homeAddress?: string;
  phoneNumber?: string;
  pickupOrder: number;
  distanceKm: number;
  sessionsPerMonth: number;
  monthlyFee: number;
  feeBreakdown: {
    distanceKm: number;
    studentRatePerKm: number;
    sessionsPerMonth: number;
    legMultiplier: number;
    currency?: string;
    formula?: string;
    calculatedAt: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface TransportTrip {
  _id: string;
  driverId: { _id: string; name: string } | string;
  date: string;
  direction: 'to_academy' | 'from_academy';
  status: 'scheduled' | 'in_travel' | 'completed' | 'cancelled';
  isExtra: boolean;
  extraCharge: number;
  studentsSnapshot: {
    studentId: string;
    studentName: string;
    phoneNumber?: string;
    pickupOrder: number;
    homeAddress?: string;
    homeLocation?: { lat: number; lng: number } | null;
    distanceKm?: number;
  }[];
  studentStatuses: { studentId: string; status: string; arrivedAt?: string }[];
  driverEarnings?: number;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  notes?: string;
}

export interface DriverUser {
  _id: string;
  name: string;
  email: string;
  profile?: any;
  studentCount: number;
  capacity: number;
  profile_data?: {
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehicleCapacity?: number;
    phoneNumber?: string;
    photoUrl?: string;
    isAvailable?: boolean;
  };
}

export interface CostEstimate {
  distanceKm: number;
  rawDistanceKm: number;
  sessionsPerMonth: number;
  monthlyFee: number;
  breakdown: {
    formula: string;
    studentRatePerKm: number;
    legMultiplier: number;
    currency: string;
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTransportManagement() {
  const [pricing, setPricing]       = useState<TransportPricing[]>([]);
  const [students, setStudents]     = useState<DriverStudent[]>([]);
  const [trips, setTrips]           = useState<TransportTrip[]>([]);
  const [drivers, setDrivers]       = useState<DriverUser[]>([]);
  const [academyLocation, setAcademyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading]       = useState(false);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleError = (err: any) => {
    setError(err?.response?.data?.error?.message || err?.message || 'An error occurred');
  };

  // ── Pricing ──────────────────────────────────────────────────────────────

  const fetchPricing = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/management/transport/pricing');
      setPricing(res.data.data);
    } catch (err) { handleError(err); }
    finally { if (!silent) setLoading(false); }
  }, []);

  const createPricing = useCallback(async (data: Partial<TransportPricing>) => {
    const res = await api.post('/management/transport/pricing', data);
    setPricing(prev => [res.data.data, ...prev]);
    return res.data.data as TransportPricing;
  }, []);

  const updatePricing = useCallback(async (id: string, data: Partial<TransportPricing>) => {
    const res = await api.patch(`/management/transport/pricing/${id}`, data);
    setPricing(prev => prev.map(p => p._id === id ? res.data.data : p));
    return res.data.data as TransportPricing;
  }, []);

  const activatePricing = useCallback(async (id: string) => {
    await api.patch(`/management/transport/pricing/${id}/activate`);
    setPricing(prev => prev.map(p => ({ ...p, isActive: p._id === id })));
  }, []);

  // ── Student search (for enroll form dropdown) ─────────────────────────────

  const searchStudents = useCallback(async (query: string): Promise<{ _id: string; name: string; email: string }[]> => {
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    const res = await api.get(`/reception/enrollments/available-students?${params}`);
    return res.data.data || [];
  }, []);

  // ── Students ─────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async (filters?: { driverId?: string; search?: string }, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (filters?.driverId) params.set('driverId', filters.driverId);
      if (filters?.search)   params.set('search', filters.search);
      const res = await api.get(`/reception/transport/students?${params}`);
      setStudents(res.data.data);
    } catch (err) { handleError(err); }
    finally { if (!silent) setLoading(false); }
  }, []);

  const enrollStudent = useCallback(async (data: {
    studentId: string; driverId: string; enrollmentId?: string;
    homeLocation: { lat: number; lng: number }; homeAddress?: string;
    phoneNumber?: string; sessionsPerMonthOverride?: number;
  }) => {
    const res = await api.post('/reception/transport/students', data);
    setStudents(prev => [res.data.data, ...prev]);
    return res.data.data as DriverStudent;
  }, []);

  const updateStudent = useCallback(async (id: string, data: Partial<DriverStudent> & { sessionsPerMonth?: number }) => {
    const res = await api.patch(`/reception/transport/students/${id}`, data);
    setStudents(prev => prev.map(s => s._id === id ? { ...s, ...res.data.data } : s));
    return res.data.data as DriverStudent;
  }, []);

  const removeStudent = useCallback(async (id: string) => {
    await api.delete(`/reception/transport/students/${id}`);
    setStudents(prev => prev.filter(s => s._id !== id));
  }, []);

  // ── Cost estimate ─────────────────────────────────────────────────────────

  const getCostEstimate = useCallback(async (lat: number, lng: number, enrollmentId?: string, sessionsPerMonth?: number): Promise<CostEstimate> => {
    const res = await api.post('/reception/transport/cost-estimate', { lat, lng, enrollmentId, sessionsPerMonth });
    return res.data.data;
  }, []);

  // ── Academy location ──────────────────────────────────────────────────────

  const fetchAcademyLocation = useCallback(async () => {
    try {
      const res = await api.get('/reception/transport/academy-location');
      setAcademyLocation(res.data.data);
      return res.data.data;
    } catch (err) { handleError(err); return null; }
  }, []);

  // ── Drivers ───────────────────────────────────────────────────────────────

  const fetchDrivers = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/reception/transport/drivers');
      setDrivers(res.data.data);
    } catch (err) { handleError(err); }
    finally { if (!silent) setLoading(false); }
  }, []);

  const createDriver = useCallback(async (data: {
    name: string; email: string; password: string;
    vehiclePlate?: string; vehicleModel?: string; vehicleColor?: string;
    vehicleCapacity?: number; phoneNumber?: string;
  }) => {
    const res = await api.post('/reception/transport/drivers', data);
    const newDriver = {
      ...res.data.data.user,
      profile_data: res.data.data.profile,
      studentCount: 0,
      capacity: res.data.data.profile?.vehicleCapacity || 5,
    };
    setDrivers(prev => [...prev, newDriver]);
    return res.data.data;
  }, []);

  const updateDriver = useCallback(async (id: string, data: any) => {
    const res = await api.patch(`/reception/transport/drivers/${id}`, data);
    setDrivers(prev => prev.map(d => {
      if (d._id !== id) return d;
      // Merge name/email back into the User-level fields too, since the
      // backend now accepts those on PATCH and the row displays them.
      const userPatch: any = {};
      if (data.name !== undefined)  userPatch.name = data.name;
      if (data.email !== undefined) userPatch.email = data.email;
      return { ...d, ...userPatch, profile_data: { ...d.profile_data, ...res.data.data } };
    }));
    return res.data.data;
  }, []);

  const removeDriver = useCallback(async (id: string) => {
    await api.delete(`/reception/transport/drivers/${id}`);
    setDrivers(prev => prev.filter(d => d._id !== id));
  }, []);

  // ── Trips ─────────────────────────────────────────────────────────────────

  const fetchTrips = useCallback(async (filters?: { date?: string; driverId?: string; status?: string }) => {
    try {
      setTripsLoading(true);
      const params = new URLSearchParams();
      if (filters?.date)     params.set('date', filters.date);
      if (filters?.driverId) params.set('driverId', filters.driverId);
      if (filters?.status)   params.set('status', filters.status);
      const res = await api.get(`/reception/transport/trips?${params}`);
      setTrips(res.data.data);
    } catch (err) { handleError(err); }
    finally { setTripsLoading(false); }
  }, []);

  const createTrip = useCallback(async (data: {
    driverId: string; date: string; direction: string;
    isExtra?: boolean; extraCharge?: number; notes?: string; studentIds?: string[];
  }) => {
    const res = await api.post('/reception/transport/trips', data);
    setTrips(prev => [res.data.data, ...prev]);
    return res.data.data as TransportTrip;
  }, []);

  const updateTrip = useCallback(async (id: string, data: any) => {
    const res = await api.patch(`/reception/transport/trips/${id}`, data);
    setTrips(prev => prev.map(t => t._id === id ? { ...t, ...res.data.data } : t));
    return res.data.data as TransportTrip;
  }, []);

  const removeTrip = useCallback(async (id: string) => {
    await api.delete(`/reception/transport/trips/${id}`);
    setTrips(prev => prev.filter(t => t._id !== id));
  }, []);

  return {
    // State
    pricing, students, trips, drivers, academyLocation,
    loading, tripsLoading, error, setError,
    // Pricing (management)
    fetchPricing, createPricing, updatePricing, activatePricing,
    // Students
    searchStudents, fetchStudents, enrollStudent, updateStudent, removeStudent,
    // Cost estimate
    getCostEstimate,
    // Academy location
    fetchAcademyLocation,
    // Drivers
    fetchDrivers, createDriver, updateDriver, removeDriver,
    // Trips
    fetchTrips, createTrip, updateTrip, removeTrip,
  };
}
