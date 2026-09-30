import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  Award,
  Clock,
  CheckCircle,
} from "lucide-react";
import { useStudentProjects } from "../../hooks";
import { useStudentCourses } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  Badge,
  LoadingState,
  Alert,
  Input,
  Select,
  Pagination,
} from "../../components/ui";
import { ProjectCard } from "../../components/projects/ProjectCard";
import { useTranslation } from 'react-i18next';

export default function StudentProjects() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { projects, isLoading, error, pagination, getMyProjects, refetch } = useStudentProjects({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    courseId: courseFilter !== "all" ? courseFilter : undefined,
    page: currentPage,
    limit: 10,
  });

  const { courses } = useStudentCourses();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';
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
    getMyProjects({
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      page: 1,
      limit: 10,
    });
  }, [statusFilter, courseFilter, getMyProjects]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    getMyProjects({
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      page,
      limit: 10,
    });
  }, [statusFilter, courseFilter, getMyProjects]);

  // Memoize filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) =>
      project.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [projects, debouncedSearchQuery]);

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

  if (isLoading && projects.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingProjectsList')} />;
  }

  if (error && projects.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardStudent:failedLoadProjects')}</p>
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
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className={`flex items-center justify-between mb-2`}>
          <div >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              {t('dashboardStudent:myProjects')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardStudent:viewProjectsDesc')}
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
            placeholder={t('dashboardStudent:searchProjectsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full bg-white border-ink/20 text-ink placeholder:text-ink/40"
          />
        </div>
        <div className={`flex gap-2 flex-wrap sm:flex-nowrap`}>
          <Select
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
              { value: "all", label: t('dashboardCommon:allStatus') },
              { value: "in_progress", label: t('dashboardStudent:inProgress') },
              { value: "completed", label: t('dashboardCommon:completed') },
              { value: "submitted", label: t('dashboardStudent:submitted') },
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
                  value: course.course._id,
                  label: course.course.title,
                })),
              ]}
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
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:totalProjects')}</p>
                <p className="text-2xl font-bold text-white">{projects.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-primary" />
            </div>
          </CardBody>
        </CardComponent>
        <CardComponent variant="glass" hover>
          <CardBody>
            <div className={`flex items-center justify-between`}>
              <div >
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:inProgress')}</p>
                <p className="text-2xl font-bold text-white">
                  {projects.filter((p) => p.status === "in_progress").length}
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
                <p className="text-sm text-white/60 mb-1">{t('dashboardCommon:completed')}</p>
                <p className="text-2xl font-bold text-white">
                  {projects.filter((p) => p.status === "completed").length}
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
                <p className="text-sm text-white/60 mb-1">{t('dashboardStudent:graded')}</p>
                <p className="text-2xl font-bold text-white">
                  {projects.filter((p) => p.grade !== undefined).length}
                </p>
              </div>
              <Award className="w-8 h-8 text-success" />
            </div>
          </CardBody>
        </CardComponent>
      </motion.div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <motion.div variants={itemVariants}>
          <CardComponent variant="glass">
            <CardBody>
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60 text-lg mb-2">{t('dashboardStudent:noProjectsFound')}</p>
                <p className="text-white/40 text-sm">
                  {searchQuery || statusFilter !== "all" || courseFilter !== "all"
                    ? t('dashboardStudent:tryAdjustingFilters')
                    : t('dashboardStudent:noProjectsAssigned')}
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
                <LoadingState type="dots" text={t('dashboardStudent:loadingProjectsList')} className="py-8" />
              </div>
            )}
            <motion.div
              variants={containerVariants}
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              {filteredProjects.map((project) => (
                <motion.div key={project._id} variants={itemVariants}>
                  <ProjectCard project={project} isStudent={true} />
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
