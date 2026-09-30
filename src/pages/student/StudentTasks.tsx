import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { useTasks } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  Input,
  Badge,
  LoadingState,
  Alert,
  Select,
  Pagination,
} from "../../components/ui";
import { TaskCard } from "../../components/tasks/TaskCard";
import { useTranslation } from 'react-i18next';

export default function StudentTasks() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { tasks, isLoading, error, pagination, getMyTasks, refetch } = useTasks({
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    limit: 10,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update filters and reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    getMyTasks({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: 1,
      limit: 10,
    });
  }, [statusFilter, getMyTasks]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    getMyTasks({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      limit: 10,
    });
  }, [statusFilter, getMyTasks]);

  // Memoize filtered tasks to avoid unnecessary recalculations
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(debouncedSearchQuery.toLowerCase());
      const matchesCourse =
        courseFilter === "all" || task.courseId?._id === courseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [tasks, debouncedSearchQuery, courseFilter]);

  // Memoize unique courses for filter
  const courses = useMemo(() => {
    return Array.from(
      new Map(
        tasks
          .filter((task) => task.courseId && task.courseId._id)
          .map((task) => [task.courseId!._id, task.courseId!])
      ).values()
    );
  }, [tasks]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Show loading state
  if (isLoading && tasks.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingTasks')} />;
  }

  // Show error state
  if (error && tasks.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCommon:failedToLoad')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refetch}
            >
              {t('dashboardCommon:retry')}
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`space-y-6 ${isRTL ? 'font-arabic' : ''}`}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-2`}>
          <div >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              {t('dashboardStudent:myTasks')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardStudent:tasksSubtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={refetch}
          >
            {t('dashboardCommon:refresh')}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className="flex-1 w-full min-w-0">
          <Input
            placeholder={t('dashboardStudent:searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            options={[
              { value: "all", label: t('dashboardCommon:allStatus') },
              { value: "open", label: t('dashboardStudent:open') },
              { value: "closed", label: t('dashboardStudent:closed') },
            ]}
            leftIcon={<Filter className="w-4 h-4" />}
          />
          {courses && courses.length > 0 && (
            <Select
              value={courseFilter}
              onChange={(value) => setCourseFilter(value)}
              options={[
                { value: "all", label: t('dashboardStudent:allCourses') },
                ...courses.map((course) => ({
                  value: course?._id || '',
                  label: course?.title || 'Untitled Course',
                })),
              ]}
              leftIcon={<FileText className="w-4 h-4" />}
            />
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div >
                <p className="text-sm mb-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardStudent:totalTasks')}</p>
                <p className="text-2xl font-bold transition-colors duration-300" style={{ color: '#0f1f33' }}>{tasks.length}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div >
                <p className="text-sm mb-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardStudent:openTasks')}</p>
                <p className="text-2xl font-bold transition-colors duration-300" style={{ color: '#0f1f33' }}>
                  {tasks.filter((task) => task.status === "open").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-accent" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div >
                <p className="text-sm mb-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardStudent:submitted')}</p>
                <p className="text-2xl font-bold transition-colors duration-300" style={{ color: '#0f1f33' }}>
                  {
                    tasks.filter(
                      (task) =>
                        task.submission?.status &&
                        task.submission.status !== "not_submitted"
                    ).length
                  }
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div >
                <p className="text-sm mb-1 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>{t('dashboardStudent:graded')}</p>
                <p className="text-2xl font-bold transition-colors duration-300" style={{ color: '#0f1f33' }}>
                  {tasks.filter((task) => task.submission?.status === "graded").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardStudent:noTasksFound')}</p>
                <p className="text-white/40 text-sm">
                  {searchQuery || statusFilter !== "all" || courseFilter !== "all"
                    ? t('dashboardStudent:tryAdjustingFilters')
                    : t('dashboardStudent:noTasksYet')}
                </p>
              </div>
            </CardBody>
          </CardComponent>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-glow/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl min-h-[200px]">
                <LoadingState type="dots" text={t('dashboardStudent:loadingTasks')} className="py-8" />
              </div>
            )}
            <motion.div
              variants={containerVariants}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {filteredTasks.map((task) => (
                <motion.div key={task._id} variants={itemVariants}>
                  <TaskCard task={task} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <motion.div variants={itemVariants} className="mt-6">
              <CardComponent variant="glass">
                <CardBody>
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                </CardBody>
              </CardComponent>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
