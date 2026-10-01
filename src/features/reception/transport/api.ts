import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { CostEstimate, DriverStudent, DriverUser, TransportTrip } from '../../../hooks/reception/useTransportManagement';

export type { CostEstimate, DriverStudent as Rider, DriverUser as Driver, TransportTrip as Trip };
export type TripStatus = TransportTrip['status'];
export interface StudentOption {
  _id: string;
  name: string;
  email: string;
}

const ROOT = ['reception', 'transport'] as const;
const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const useRiders = () => useQuery({ queryKey: [...ROOT, 'riders'], queryFn: () => data<DriverStudent[]>(api.get('/reception/transport/students')), staleTime: 30_000 });
export const useDrivers = () => useQuery({ queryKey: [...ROOT, 'drivers'], queryFn: () => data<DriverUser[]>(api.get('/reception/transport/drivers')), staleTime: 30_000 });

export interface TripFilters {
  date: string;
  status: '' | TripStatus;
}
export const useTrips = (f: TripFilters) =>
  useQuery({
    queryKey: [...ROOT, 'trips', f],
    queryFn: () => {
      const p = new URLSearchParams();
      if (f.date) p.set('date', f.date);
      if (f.status) p.set('status', f.status);
      return data<TransportTrip[]>(api.get(`/reception/transport/trips?${p}`));
    },
    staleTime: 30_000,
  });

/** Students for the enroll form: matches by name or email. */
export const useStudentSearch = (search: string, enabled: boolean) =>
  useQuery({
    queryKey: ['reception', 'students', 'pick', search],
    queryFn: () => data<StudentOption[]>(api.get(`/reception/enrollments/available-students?search=${encodeURIComponent(search)}`)),
    enabled,
    staleTime: 30_000,
  });

export const getEstimate = (lat: number, lng: number, sessionsPerMonth?: number) =>
  data<CostEstimate>(api.post('/reception/transport/cost-estimate', { lat, lng, sessionsPerMonth }));

export interface RiderInput {
  studentId: string;
  driverId: string;
  homeLocation: { lat: number; lng: number };
  homeAddress?: string;
  phoneNumber?: string;
  sessionsPerMonthOverride?: number;
}
export interface DriverInput {
  name: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleCapacity: number;
}
export interface TripInput {
  driverId: string;
  date: string;
  direction: 'to_academy' | 'from_academy';
  isExtra: boolean;
  extraCharge: number;
  notes: string;
  studentIds?: string[];
}

export function useTransportMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ROOT });
    void qc.invalidateQueries({ queryKey: ['reception', 'overview'] });
    void qc.invalidateQueries({ queryKey: ['reception', 'enrollments'] });
  };
  const m = <A,>(fn: (a: A) => Promise<unknown>) => ({ mutationFn: fn, onSuccess: refresh });
  return {
    enroll: useMutation(m((d: RiderInput) => api.post('/reception/transport/students', d).then((r) => r.data as { warning?: string }))),
    removeRider: useMutation(m((id: string) => api.delete(`/reception/transport/students/${id}`))),
    saveDriver: useMutation(m(({ id, d }: { id?: string; d: DriverInput }) => (id ? api.patch(`/reception/transport/drivers/${id}`, d) : api.post('/reception/transport/drivers', d)))),
    removeDriver: useMutation(m((id: string) => api.delete(`/reception/transport/drivers/${id}`))),
    createTrip: useMutation(m((d: TripInput) => api.post('/reception/transport/trips', d))),
    updateTrip: useMutation(m(({ id, d }: { id: string; d: { status: TripStatus; cancellationReason?: string } }) => api.patch(`/reception/transport/trips/${id}`, d))),
    removeTrip: useMutation(m((id: string) => api.delete(`/reception/transport/trips/${id}`))),
  };
}

export const nameOf = (x: { name: string } | string | null | undefined) => (x && typeof x === 'object' ? x.name : '');
export const idOf = (x: { _id: string } | string | null | undefined) => (x && typeof x === 'object' ? x._id : x ?? '');
