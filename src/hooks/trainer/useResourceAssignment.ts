import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import type {
  AssignmentModalState,
  Group,
  GroupAssignment
} from '../../types/resource.types';

interface UseResourceAssignmentReturn extends AssignmentModalState {
  assigning: boolean;
  error: string | null;
  canSave: boolean;
  toggleGroup: (group: Group) => void;
  toggleSession: (groupId: string, sessionId: string) => void;
  selectAllSessionsForGroup: (groupId: string) => void;
  clearSessionsForGroup: (groupId: string) => void;
  copySessionsFromGroup: (fromGroupId: string, toGroupId: string) => void;
  assignResource: () => Promise<boolean>;
  getAssignmentSummary: () => { totalGroups: number; totalSessions: number; totalStudents: number };
}

interface CourseWithBundle {
  _id: string;
  type?: 'single' | 'bundle';
  bundleCourses?: Array<{ _id: string }>;
}

export const useResourceAssignment = (
  resourceId: string,
  courseId: string,
  courses: CourseWithBundle[] = []
): UseResourceAssignmentReturn => {
  const [state, setState] = useState<AssignmentModalState>({
    selectedGroups: new Map(),
    allGroups: [],
    groupSessions: new Map(),
    loadingGroups: true,
    loadingSessions: new Map()
  });

  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Track which groups had assignments when the modal opened, so we can clear deselected ones
  const [originallyAssignedGroupIds, setOriginallyAssignedGroupIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      fetchGroupsAndExistingAssignments();
    } else {
      setState(prev => ({ ...prev, loadingGroups: false }));
    }
  }, [courseId, resourceId]);

  const fetchGroupsAndExistingAssignments = async () => {
    try {
      setState(prev => ({ ...prev, loadingGroups: true }));

      // If the selected course is a "bucket"/bundle course, also pull in groups
      // from each of its sub-courses so the CLO can assign to those groups too.
      const selectedCourse = courses.find((c) => c._id === courseId);
      const courseIds = new Set<string>([courseId]);
      if (selectedCourse?.type === 'bundle') {
        (selectedCourse.bundleCourses || []).forEach((sc) => courseIds.add(sc._id));
      }

      // Fetch groups for every relevant course and existing assignments in parallel
      const [groupsResponses, assignmentsRes] = await Promise.all([
        Promise.all(
          Array.from(courseIds).map((cid) => api.get(`/clo/groups?courseId=${cid}`))
        ),
        resourceId ? api.get(`/clo/resources/${resourceId}/assignments`).catch(() => null) : Promise.resolve(null)
      ]);

      const groupsData: Group[] = [];
      const seenGroupIds = new Set<string>();
      groupsResponses.forEach((groupsRes) => {
        const groupsForCourse: Group[] = Array.isArray(groupsRes.data.data)
          ? groupsRes.data.data
          : (groupsRes.data.data as any).groups || [];
        groupsForCourse.forEach((g) => {
          if (!seenGroupIds.has(g._id)) {
            seenGroupIds.add(g._id);
            groupsData.push(g);
          }
        });
      });

      // Build a map of groupId -> Set<sessionId> from existing assignments
      const existingByGroup = new Map<string, Set<string>>();
      const existingAssignments: Array<{ groupId: { _id: string; name: string; students?: any[] } | string; sessions: Array<{ sessionId: string | { toString(): string } }> }> =
        assignmentsRes?.data?.data?.assignments || [];

      existingAssignments.forEach((groupEntry) => {
        const gId = typeof groupEntry.groupId === 'object'
          ? String((groupEntry.groupId as any)._id ?? groupEntry.groupId)
          : String(groupEntry.groupId);
        const sessionIds = new Set<string>(
          groupEntry.sessions.map((s) => String(typeof s.sessionId === 'object' ? (s.sessionId as any)._id ?? s.sessionId : s.sessionId))
        );
        existingByGroup.set(gId, sessionIds);
      });

      // Pre-populate selectedGroups for groups that already have assignments
      const preSelectedGroups = new Map<string, GroupAssignment>();
      groupsData.forEach((group) => {
        const existingSessions = existingByGroup.get(group._id);
        if (existingSessions && existingSessions.size > 0) {
          preSelectedGroups.set(group._id, {
            groupId: group._id,
            groupName: group.name,
            studentsCount: group.students?.length || 0,
            trainerName: group.trainerId?.name || '',
            selectedSessionIds: existingSessions
          });
        }
      });

      // Remember which groups had assignments originally (to clear them if deselected)
      setOriginallyAssignedGroupIds(new Set(preSelectedGroups.keys()));

      setState(prev => ({
        ...prev,
        allGroups: groupsData,
        selectedGroups: preSelectedGroups,
        loadingGroups: false
      }));

      // Pre-fetch sessions for groups that already have assignments
      preSelectedGroups.forEach((_, groupId) => {
        fetchSessionsForGroup(groupId);
      });

    } catch (err: any) {
      console.error('Failed to fetch groups/assignments:', err);
      setError('Failed to load groups');
      setState(prev => ({ ...prev, allGroups: [], loadingGroups: false }));
    }
  };

  const fetchSessionsForGroup = async (groupId: string) => {
    try {
      setState(prev => ({
        ...prev,
        loadingSessions: new Map(prev.loadingSessions).set(groupId, true)
      }));

      const response = await api.get(`/clo/groups/${groupId}/sessions`);

      if (response.data.success) {
        const sessionsData = Array.isArray(response.data.data)
          ? response.data.data
          : (response.data.data as any).sessions || [];

        setState(prev => {
          const newGroupSessions = new Map(prev.groupSessions);
          newGroupSessions.set(groupId, sessionsData);

          const newLoadingSessions = new Map(prev.loadingSessions);
          newLoadingSessions.set(groupId, false);

          return {
            ...prev,
            groupSessions: newGroupSessions,
            loadingSessions: newLoadingSessions
          };
        });
      } else {
        setState(prev => {
          const newLoadingSessions = new Map(prev.loadingSessions);
          newLoadingSessions.set(groupId, false);
          return { ...prev, loadingSessions: newLoadingSessions };
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch sessions:', err);
      setState(prev => {
        const newGroupSessions = new Map(prev.groupSessions);
        newGroupSessions.set(groupId, []);

        const newLoadingSessions = new Map(prev.loadingSessions);
        newLoadingSessions.set(groupId, false);

        return {
          ...prev,
          groupSessions: newGroupSessions,
          loadingSessions: newLoadingSessions
        };
      });
    }
  };

  const toggleGroup = useCallback((group: Group) => {
    setState(prev => {
      const newSelectedGroups = new Map(prev.selectedGroups);

      if (newSelectedGroups.has(group._id)) {
        newSelectedGroups.delete(group._id);
      } else {
        newSelectedGroups.set(group._id, {
          groupId: group._id,
          groupName: group.name,
          studentsCount: group.students?.length || 0,
          trainerName: group.trainerId?.name || '',
          selectedSessionIds: new Set()
        });

        if (!prev.groupSessions.has(group._id)) {
          fetchSessionsForGroup(group._id);
        }
      }

      return { ...prev, selectedGroups: newSelectedGroups };
    });
  }, []);

  const toggleSession = useCallback((groupId: string, sessionId: string) => {
    const sid = String(sessionId);
    setState(prev => {
      const newSelectedGroups = new Map(prev.selectedGroups);
      const group = newSelectedGroups.get(groupId);

      if (group) {
        const newSessionIds = new Set(group.selectedSessionIds);

        if (newSessionIds.has(sid)) {
          newSessionIds.delete(sid);
        } else {
          newSessionIds.add(sid);
        }

        newSelectedGroups.set(groupId, {
          ...group,
          selectedSessionIds: newSessionIds
        });
      }

      return { ...prev, selectedGroups: newSelectedGroups };
    });
  }, []);

  const selectAllSessionsForGroup = useCallback((groupId: string) => {
    const sessions = state.groupSessions.get(groupId) || [];
    const allSessionIds = new Set(sessions.map(s => String(s._id)));

    setState(prev => {
      const newSelectedGroups = new Map(prev.selectedGroups);
      const group = newSelectedGroups.get(groupId);

      if (group) {
        newSelectedGroups.set(groupId, {
          ...group,
          selectedSessionIds: allSessionIds
        });
      }

      return { ...prev, selectedGroups: newSelectedGroups };
    });
  }, [state.groupSessions]);

  const clearSessionsForGroup = useCallback((groupId: string) => {
    setState(prev => {
      const newSelectedGroups = new Map(prev.selectedGroups);
      const group = newSelectedGroups.get(groupId);

      if (group) {
        newSelectedGroups.set(groupId, {
          ...group,
          selectedSessionIds: new Set()
        });
      }

      return { ...prev, selectedGroups: newSelectedGroups };
    });
  }, []);

  const copySessionsFromGroup = useCallback((fromGroupId: string, toGroupId: string) => {
    setState(prev => {
      const newSelectedGroups = new Map(prev.selectedGroups);
      const fromGroup = newSelectedGroups.get(fromGroupId);
      const toGroup = newSelectedGroups.get(toGroupId);

      if (fromGroup && toGroup) {
        newSelectedGroups.set(toGroupId, {
          ...toGroup,
          selectedSessionIds: new Set(fromGroup.selectedSessionIds)
        });
      }

      return { ...prev, selectedGroups: newSelectedGroups };
    });
  }, []);

  const assignResource = useCallback(async (): Promise<boolean> => {
    try {
      setAssigning(true);
      setError(null);

      const hasAnythingToDo = state.selectedGroups.size > 0 ||
        Array.from(originallyAssignedGroupIds).some(id => !state.selectedGroups.has(id));

      if (!hasAnythingToDo) {
        setError('Please select at least one group and session');
        setAssigning(false);
        return false;
      }

      // Use PUT /assignments (replace) for each selected group.
      const putRequests: Promise<any>[] = [];

      state.selectedGroups.forEach((group) => {
        const sessionIds = Array.from(group.selectedSessionIds).map(String);
        putRequests.push(
          api.put(`/clo/resources/${resourceId}/assignments`, {
            groupId: group.groupId,
            sessionIds
          })
        );
      });

      // Clear assignments for groups that were originally assigned but are now deselected
      originallyAssignedGroupIds.forEach((groupId) => {
        if (!state.selectedGroups.has(groupId)) {
          putRequests.push(
            api.put(`/clo/resources/${resourceId}/assignments`, {
              groupId,
              sessionIds: []
            })
          );
        }
      });

      if (putRequests.length === 0) {
        setError('Please select at least one group');
        setAssigning(false);
        return false;
      }

      const results = await Promise.all(putRequests);
      const allOk = results.every(r => r.data.success);

      if (allOk) {
        return true;
      } else {
        throw new Error('One or more assignment updates failed');
      }

    } catch (err: any) {
      const errData = err.response?.data?.error;
      const rawErrors: any[] = errData?.errors || [];
      const detailErrors = rawErrors.map((e: any) =>
        typeof e === 'string' ? e : e?.message || JSON.stringify(e)
      );
      const baseMessage = errData?.message || err.message || 'Assignment failed';
      const errorMessage = detailErrors.length > 0
        ? `${baseMessage}: ${detailErrors.join('; ')}`
        : baseMessage;
      setError(errorMessage);
      return false;
    } finally {
      setAssigning(false);
    }
  }, [resourceId, state.selectedGroups, originallyAssignedGroupIds]);

  const getAssignmentSummary = useCallback(() => {
    let totalGroups = 0;
    let totalSessions = 0;
    let totalStudents = 0;

    state.selectedGroups.forEach((group) => {
      if (group.selectedSessionIds.size > 0) {
        totalGroups++;
        totalSessions += group.selectedSessionIds.size;
        totalStudents += group.studentsCount;
      }
    });

    return { totalGroups, totalSessions, totalStudents };
  }, [state.selectedGroups]);

  // Can save if there are selected groups with sessions, or if previously-assigned groups are being cleared
  const canSave =
    Array.from(state.selectedGroups.values()).some(g => g.selectedSessionIds.size > 0) ||
    Array.from(originallyAssignedGroupIds).some(id => !state.selectedGroups.has(id));

  return {
    ...state,
    assigning,
    error,
    canSave,
    toggleGroup,
    toggleSession,
    selectAllSessionsForGroup,
    clearSessionsForGroup,
    copySessionsFromGroup,
    assignResource,
    getAssignmentSummary
  };
};
