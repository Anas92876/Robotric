import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useStudentGallery } from "../../hooks";
import { useStudentCourses } from "../../hooks";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Input,
  Select,
  Pagination,
} from "../../components/ui";
import { GalleryGrid } from "../../components/gallery/GalleryGrid";
import { useTranslation } from 'react-i18next';

export default function StudentGallery() {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardStudent']);
  const isRTL = i18n.language === 'ar';

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { images, isLoading, error, pagination, getGallery, refetch } = useStudentGallery({
    type: typeFilter !== "all" ? (typeFilter as "project") : undefined,
    courseId: courseFilter !== "all" ? courseFilter : undefined,
    page: currentPage,
    limit: 10,
  });

  const { courses } = useStudentCourses();
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
    getGallery({
      type: typeFilter !== "all" ? (typeFilter as "project") : undefined,
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      page: 1,
      limit: 10,
    });
  }, [typeFilter, courseFilter, getGallery]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    getGallery({
      type: typeFilter !== "all" ? (typeFilter as "project") : undefined,
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      page,
      limit: 10,
    });
  }, [typeFilter, courseFilter, getGallery]);

  // Memoize filtered images
  const filteredImages = useMemo(() => {
    return images.filter((image) =>
      (image.title || "").toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [images, debouncedSearchQuery]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  if (isLoading && images.length === 0) {
    return <LoadingState type="skeleton" text={t('dashboardStudent:loadingGallery')} />;
  }

  if (error && images.length === 0) {
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
      <motion.div>
        <div className={`flex items-center justify-between mb-2`}>
          <div >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold inline-block" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>
              {t('dashboardStudent:gallery')}
            </h1>
            <p className="mt-2 transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardStudent:gallerySubtitle')}
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
      <motion.div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className="flex-1 w-full min-w-0">
          <Input
            placeholder={t('dashboardStudent:searchImages')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full bg-white border-ink/20 text-ink placeholder:text-ink/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value)}
            options={[
              { value: "all", label: t('dashboardCommon:allTypes') },
              { value: "project", label: t('dashboardStudent:projects') },
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

      {/* Gallery Grid - show loading overlay when refetching with existing images */}
      <motion.div className="relative">
        {isLoading && filteredImages.length > 0 && (
          <div className="absolute inset-0 bg-glow/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl min-h-[200px]">
            <LoadingState type="dots" text={t('dashboardStudent:loadingGallery')} className="py-8" />
          </div>
        )}
        <div className={isLoading && filteredImages.length > 0 ? 'opacity-60 pointer-events-none' : ''}>
          <GalleryGrid images={filteredImages} isLoading={isLoading && filteredImages.length === 0} />
        </div>
      </motion.div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <motion.div className="mt-6">
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
    </motion.div>
  );
}
