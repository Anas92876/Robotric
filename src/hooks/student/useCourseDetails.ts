import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface Session {
  _id: string;
  title: string;
  description?: string;
  groupId: string;
  courseId: string;
  trainerId: {
    _id: string;
    name: string;
    email: string;
  };
  scheduledDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  sessionNumber: number;
  status: string;
  type: string;
  isLocked: boolean;
  quiz?: {
    _id: string;
    title: string;
    passingScore: number;
    timeLimit: number;
    questions: any[];
  } | null;
  createdAt: string;
}

export interface CourseDetails {
  _id: string;
  title: string;
  description: string;
  instructor?: {
    _id: string;
    name: string;
    email: string;
  };
  duration?: string;
  price: number;
  thumbnail?: string;
  category: string;
  level: string;
  status: string;
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
  enrolledStudents: number;
  groupStatus?: string;
  boardEnabled?: boolean;
  groupId?: string;
}

export interface CourseProgress {
  completedModules: string[];
  currentModule?: string;
  percentageComplete: number;
}

interface UseCourseDetailsReturn {
  course: CourseDetails | null;
  sessions: Session[];
  progress: CourseProgress | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCourseDetails = (courseId: string): UseCourseDetailsReturn => {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseDetails = useCallback(async () => {
    if (!courseId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch course details and sessions
      // We'll try to get course details first. If it returns an array, it's likely just sessions.
      // But the original code did parallel requests. Let's adapt.
      const [courseRes, sessionsRes] = await Promise.allSettled([
        api.get(`/student/courses/${courseId}`),
        api.get(`/student/courses/${courseId}/sessions`),
      ]);

      let sessionsData: Session[] = [];
      let courseData: CourseDetails | null = null;
      let progressData: CourseProgress | null = null;

      // Handle course response
      if (courseRes.status === 'fulfilled') {
        const data = courseRes.value.data;
        if (Array.isArray(data)) {
           // It's just a list of sessions? That's what the user said: "the response is like this { ... data: [...] }"
           // Wait, the user shared a response object: { success: true, count: 1, data: [ ... ] }
           // So data.data is the array.
           // If the endpoint returns the structure the user showed, then `courseRes.value.data.data` is an array of sessions.
           // In that case, we might not have course details. We'd have to extract what we can or mock it.
           // But wait, the user URL was `/student/courses/6985fb4c7b8463bdfd6a131e`.
           // So `api.get` to that URL returned the JSON they showed.
           // So `courseRes.data` (which is `data` here if we use axios) would be that object.
           // And `courseRes.data.data` is the array of sessions.
           
        // Type assertion to handle the data structure
        const dataArr = data as any[];
        // Check if it's the specific structure user showed
         if (dataArr.length > 0 && typeof dataArr[0] === 'object' && 'sessionNumber' in dataArr[0]) {
              sessionsData = dataArr;
              
              courseData = {
                  _id: courseId,
                  title: "Course Sessions", 
                  description: "View your course sessions",
                  price: 0,
                  category: "General",
                  level: "All Levels",
                  status: "active",
                  enrolledStudents: 0
              };
           } else if (dataArr.length > 0 && 'course' in dataArr[0]) {
               // This path seems unlikely for an array, but keeping logic just in case
               // actually if data is array, data.data invalid. 
               // logic before was: if (data.data && ...) but data is array here.
           } else {
               // If data is array but doesn't match above, assume it is sessions list
               sessionsData = dataArr;
           }
        } else {
             // data is object
             const dataObj = data as any;
             if (dataObj.data && Array.isArray(dataObj.data)) {
                 if (dataObj.data.length > 0 && dataObj.data[0].sessionNumber) {
                     sessionsData = dataObj.data;
                      courseData = {
                        _id: courseId,
                        title: "Course Sessions", 
                        description: "View your course sessions",
                        price: 0,
                        category: "General",
                        level: "All Levels",
                        status: "active",
                        enrolledStudents: 0
                    };
                 } else if (dataObj.data.course) {
                    courseData = dataObj.data.course;
                    progressData = dataObj.data.enrollment?.progress || null;
                 } else {
                     sessionsData = dataObj.data;
                 }
             } else if (dataObj.course) {
                 courseData = dataObj.course;
                 progressData = dataObj.enrollment?.progress || null;
             }
        }
      }

      // Handle sessions response (if the first one wasn't the sessions list)
      if (sessionsRes.status === 'fulfilled') {
          const sData = sessionsRes.value.data;
          if (sData.data && Array.isArray(sData.data)) {
              // If we didn't get sessions from the first call, or if this one is strictly for sessions
              // The original code used this for sessions.
              // If the first call (`/student/courses/${courseId}`) returned sessions, we might have duplicates or conflict.
              // Let's assume if we found sessions in `courseData` logic above, we keep them.
              // If `sessionsData` is empty, use this.
              if (sessionsData.length === 0) {
                  sessionsData = sData.data;
              }
          }
      }

      // If progressData still null or zero, fetch from enrollments list which has full progress
      if (!progressData || progressData.percentageComplete === 0) {
        try {
          const enrollRes = await api.get('/student/courses');
          const enrollments = (enrollRes.data.data || []) as Array<{
            course: { _id: string };
            progress: { percentageComplete: number; completedModules: string[]; currentModule?: string };
          }>;
          const match = enrollments.find((e) => e.course?._id === courseId);
          if (match?.progress) {
            progressData = {
              completedModules: match.progress.completedModules || [],
              currentModule: match.progress.currentModule,
              percentageComplete: match.progress.percentageComplete || 0,
            };
          }
        } catch {
          // fail silently — progress just stays null
        }
      }

      setCourse(courseData);
      setSessions(sessionsData);
      setProgress(progressData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch course details');
      console.error('Error fetching course details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  return {
    course,
    sessions,
    progress,
    isLoading,
    error,
    refetch: fetchCourseDetails,
  };
};
