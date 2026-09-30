import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useCLOGallery } from "../../hooks";
import { useCLOCourses } from "../../hooks/clo/useCLOCourses";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";
import {
  CardComponent,
  CardBody,
  Button,
  LoadingState,
  Alert,
  Input,
  Select,
} from "../../components/ui";
import { GalleryGrid } from "../../components/gallery/GalleryGrid";
import { useTranslation } from 'react-i18next';

export default function CLOGallery() {
  const { images, isLoading, error, getAllGallery } = useCLOGallery();
  const { courses } = useCLOCourses();
  const { groups } = useCLOGroups();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardCLO']);
  const isRTL = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");

  useEffect(() => {
    getAllGallery({
      type: typeFilter !== "all" ? (typeFilter as "moment" | "project") : undefined,
      courseId: courseFilter !== "all" ? courseFilter : undefined,
      groupId: groupFilter !== "all" ? groupFilter : undefined,
      page: 1,
      limit: 50,
    });
  }, [typeFilter, courseFilter, groupFilter, getAllGallery]);

  const filteredImages = images.filter((image) =>
    (image.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    return <LoadingState type="skeleton" text={t('dashboardCLO:loadingGallery')} />;
  }

  if (error && images.length === 0) {
    return (
      <div className="space-y-8">
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('dashboardCLO:failedToLoadGallery')}</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => getAllGallery()}
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
      <motion.div>
        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-4xl font-bold inline-block mb-2" style={{
              color: '#0f1f33',
              backgroundClip: 'text'
            }}>{t('dashboardCLO:gallery')}</h1>
            <p className="transition-colors duration-300" style={{ color: '#0f1f33' + 'CC' }}>
              {t('dashboardCLO:overviewGallery')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div className={`flex gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={t('dashboardCLO:searchImages')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(value) => setTypeFilter(value)}
          options={[
            { value: "all", label: t('dashboardCommon:allTypes') },
            { value: "moment", label: t('dashboardCLO:moments') },
            { value: "project", label: t('dashboardCLO:projectsType') },
          ]}
          leftIcon={<Filter className="w-4 h-4" />}
        />
        <Select
          value={courseFilter}
          onChange={(value) => setCourseFilter(value)}
          options={[
            { value: "all", label: t('dashboardCLO:allCourses') },
            ...(courses || []).map((course) => ({
              value: course._id,
              label: course.title,
            })),
          ]}
        />
        <Select
          value={groupFilter}
          onChange={(value) => setGroupFilter(value)}
          options={[
            { value: "all", label: t('dashboardCLO:allGroups') },
            ...(groups || []).map((group) => ({
              value: group._id,
              label: group.name,
            })),
          ]}
        />
      </motion.div>

      {/* Gallery Grid */}
      <motion.div>
        <GalleryGrid images={filteredImages} isLoading={isLoading} />
      </motion.div>
    </motion.div>
  );
}
