export { useAuth } from '../providers/AuthProvider';

// Common hooks
export * from './common/useDebounce';
export * from './common/useDashboardStats';
export * from './common/useInventoryData';
export * from './common/useOrdersData';
export * from './common/useProjectsData';
export * from './common/useTeamsData';
export * from './common/useCompetitionsData';
export * from './common/useFileUpload';
export * from './common/useExchangeRate';
export * from './common/useBlogPosts';
export * from './common/usePDFViewer';
export * from './common/useIntersectionObserver';
export * from './common/useLazyBackground';
export * from './common/useLazyLoad';

// Student hooks
export * from './student/useStudentDashboard';
export * from './student/useStudentCourses';
export * from './student/useCourseDetails';
export * from './student/useStudentEvaluations';
export * from './student/useStudentProjects';
export * from './student/useStudentGallery';
export * from './student/useAttendance';
export * from './student/useAttendanceOverview';
export * from './student/usePayments';
export * from './student/useUserSubscriptions';
export * from './student/useMySubscription';
export * from './student/useQuiz';
export * from './student/useTasks';

// Trainer hooks
export * from './trainer/useTrainerDashboard';
export * from './trainer/useTrainerGroups';
export * from './trainer/useTrainerSessions';
export * from './trainer/useTrainerTasks';
export * from './trainer/useTrainerProjects';
export * from './trainer/useTrainerGallery';
export * from './trainer/useTrainerResources';
export * from './trainer/useResources';
export * from './trainer/useResourceAssignment';
export * from './trainer/useResourceUpload';

// Reception hooks
export * from './reception/useReceptionDashboard';
export * from './reception/useReceptionUsers';
export * from './reception/useReceptionEnrollments';
export * from './reception/useReceptionLeads';
export * from './reception/useReceptionGallery';
export * from './reception/useReceptionInterests';
export * from './reception/useContactHistory';
export * from './reception/useSessionRequests';
export * from './reception/useSessionReports';
export * from './reception/useSubscriptionPlans';

// CLO hooks
export * from './clo/useCLODashboard';
export * from './clo/useCLOTrainers';
export * from './clo/useCLOCourses';
export * from './clo/useCLOGroups';
export * from './clo/useCLOEvaluations';
export * from './clo/useCLOAttendance';
export * from './clo/useCLOInterests';
export * from './clo/useCLOTasks';
export * from './clo/useCLOProjects';
export * from './clo/useCLOGallery';
export * from './clo/useCLOSessions';

// Board hooks
export * from './board/useGroupBoard';

// CTO hooks
export * from './cto/useCTOProjects';

// Engineer hooks
export * from './engineer/useEngineerTasks';
