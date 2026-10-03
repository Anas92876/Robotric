/**
 * Group data owned by features that are ported later. Each has a stand-in
 * that reports "nothing yet"; the owning module replaces it in container.ts.
 */

export interface AttendanceBreakdown {
  present: number;
  late: number;
  absent: number;
  total: number;
}

export interface GroupSessionSummary {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  /** Mean attendance rate across the group's sessions, 0–100. */
  averageAttendance: number;
  attendance: AttendanceBreakdown;
  nextSession: { id: string; title: string; scheduledDate: Date; startTime: string; endTime: string } | null;
}

/** Sessions & attendance — phase 5. */
export interface GroupActivityReader {
  summarize(groupIds: string[]): Promise<Map<string, GroupSessionSummary>>;
  recentAttendance(groupId: string, limit: number): Promise<unknown[]>;
  studentAttendance(groupId: string, studentIds: string[]): Promise<Map<string, AttendanceBreakdown>>;
}

export const EMPTY_ATTENDANCE: AttendanceBreakdown = { present: 0, late: 0, absent: 0, total: 0 };
export const EMPTY_SESSION_SUMMARY: GroupSessionSummary = {
  totalSessions: 0,
  completedSessions: 0,
  upcomingSessions: 0,
  cancelledSessions: 0,
  averageAttendance: 0,
  attendance: EMPTY_ATTENDANCE,
  nextSession: null,
};

export const noGroupActivity: GroupActivityReader = {
  summarize: async (ids) => new Map(ids.map((id) => [id, EMPTY_SESSION_SUMMARY])),
  recentAttendance: async () => [],
  studentAttendance: async (_g, ids) => new Map(ids.map((id) => [id, EMPTY_ATTENDANCE])),
};

export interface MemberEnrollment {
  id: string;
  studentId: string;
  status: string;
  enrolledAt: Date;
  progress: unknown;
}

/** Enrollments of group members in the group's course (enrollments module). */
export interface GroupEnrollmentReader {
  forStudentsInCourse(studentIds: string[], courseId: string): Promise<Map<string, MemberEnrollment>>;
}

export const noGroupEnrollments: GroupEnrollmentReader = { forStudentsInCourse: async () => new Map() };

/** Group chat membership — phase 9. Failures never block the group operation. */
export interface GroupChatMembership {
  studentJoined(groupId: string, studentId: string): Promise<void>;
  studentLeft(groupId: string, studentId: string): Promise<void>;
}

export const noGroupChat: GroupChatMembership = { studentJoined: async () => {}, studentLeft: async () => {} };
