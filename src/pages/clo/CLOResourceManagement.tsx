/**
 * CLOResourceManagement — Course-folder view
 * Landing: course cards → click → files for that course
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  Eye,
  Edit3,
  Trash2,
  BookOpen,
  File,
  ChevronRight,
  FolderOpen,
  Tag,
  HardDrive,
  CheckCircle,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { useResources, useCLOCourses } from "../../hooks";
import { UploadModal } from "../../components/clo/UploadModal";
import { AssignmentModal } from "../../components/clo/AssignmentModal";
import { ResourceCard } from "../../components/clo/ResourceCard";
import { PDFViewer } from "../../components/ui/PDFViewer";
import { Button, Input, LoadingState, Alert } from "../../components/ui";
import type { Resource } from "../../types/resource.types";
import type { Course } from "../../hooks/clo/useCLOCourses";

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatBytes(bytes: number | undefined) {
  if (!bytes || bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const CATEGORY_COLORS: Record<string, string> = {
  lecture: "bg-blue-100 text-blue-700",
  assignment: "bg-amber-100 text-amber-700",
  lab: "bg-emerald-100 text-emerald-700",
  exam: "bg-red-100 text-red-700",
  reference: "bg-purple-100 text-purple-700",
  other: "bg-zinc-100 text-zinc-600",
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
function Breadcrumb({
  items,
}: {
  items: { label: string; onClick?: () => void }[];
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-[#003300]/30 flex-shrink-0" />
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-[#003300]/50 hover:text-[#003300] transition-colors font-medium hover:underline underline-offset-2"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-[#003300] font-semibold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export const CLOResourceManagement: React.FC = () => {
  const {
    resources,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    fetchResources,
    deleteResource,
    renameResource,
  } = useResources();
  const { courses, isLoading: loadingCourses, fetchCourses } = useCLOCourses();

  // Level: null = course grid, string = inside a course
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // When inside a course, filter by that course; otherwise clear
  useEffect(() => {
    updateFilters({
      courseId: activeCourseId ?? "",
      search: searchQuery,
    });
  }, [activeCourseId, searchQuery]);

  const activeCourse = courses.find((c) => c._id === activeCourseId);

  // Per-course stats (computed from all resources)
  const allResources: Resource[] = resources; // when no courseId filter, this is all
  const courseResourceCount = (cId: string) =>
    allResources.filter((r) => {
      if (!r || !r.courseId) return false;
      if (typeof r.courseId === "string") return r.courseId === cId;
      return r.courseId._id === cId;
    }).length;

  // When entering a course, fetch all first so counts are right, then filter
  const handleEnterCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setSearchQuery("");
  };

  const handleBackToCourses = () => {
    setActiveCourseId(null);
    setSearchQuery("");
    clearFilters();
  };

  const handleUploadSuccess = (resourceId: string, courseId: string) => {
    fetchResources().then((fetched) => {
      const uploaded = fetched.find((r: Resource) => r._id === resourceId);
      if (uploaded) {
        setSelectedResource(uploaded);
        setShowAssignmentModal(true);
      }
    });
  };

  const handleDeleteResource = async (resource: Resource) => {
    if (!confirm(`Delete "${resource.title}"? This cannot be undone.`)) return;
    await deleteResource(resource._id, true);
  };

  // ── Course grid (Level 1) ─────────────────────────────────────────────────
  const renderCourseGrid = () => {
    if (loadingCourses)
      return <LoadingState type="skeleton" text="Loading courses..." />;

    const validCourses = (courses || []).filter(
      (c) => c != null && c._id != null,
    );

    // Total stats across all resources
    const totalFiles = allResources.length;
    const totalSize = allResources.reduce((s, r) => s + (r.fileSize || 0), 0);
    const assigned = allResources.filter(
      (r) => r.assignments && r.assignments.groupCount > 0,
    ).length;
    const unassigned = totalFiles - assigned;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-[#003300]">
                Course Materials
              </h1>
            </div>
            <p className="text-sm text-[#003300]/50">
              {validCourses.length} course{validCourses.length !== 1 ? "s" : ""}{" "}
              · {totalFiles} file{totalFiles !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => setShowUploadModal(true)}
          >
            Upload File
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Files",
              value: totalFiles,
              color: "bg-[#003300]/5 text-[#003300]",
              icon: <FileText className="w-4 h-4" />,
            },
            {
              label: "Assigned",
              value: assigned,
              color: "bg-emerald-50 text-emerald-700",
              icon: <CheckCircle className="w-4 h-4" />,
            },
            {
              label: "Unassigned",
              value: unassigned,
              color: "bg-amber-50 text-amber-700",
              icon: <Clock className="w-4 h-4" />,
            },
            {
              label: "Storage Used",
              value: formatBytes(totalSize),
              color: "bg-purple-50 text-purple-700",
              icon: <HardDrive className="w-4 h-4" />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl p-3 flex items-center gap-3 ${s.color}`}
            >
              <div className="opacity-60">{s.icon}</div>
              <div>
                <p className="text-base font-bold leading-none">{s.value}</p>
                <p className="text-xs font-medium opacity-60 mt-0.5">
                  {s.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <Alert variant="error">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => fetchResources()}
              >
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {/* Course cards */}
        {validCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#003300]/10 py-20 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" />
            <p className="font-semibold text-[#003300]/60 mb-1">
              No courses yet
            </p>
            <p className="text-sm text-[#003300]/35">
              Create courses first before uploading materials.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {validCourses.map((course, i) => {
              const count = courseResourceCount(course._id);
              return (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => handleEnterCourse(course._id)}
                    className="group w-full text-left bg-white rounded-2xl border border-[#003300]/10 hover:border-[#003300]/25 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    {/* Accent bar */}
                    <div
                      className={`h-1 w-full ${course.status === "published" ? "bg-emerald-400" : course.status === "draft" ? "bg-amber-400" : "bg-zinc-300"}`}
                    />

                    <div className="p-5 flex-1">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[#003300] text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          {course.category && (
                            <span className="text-xs text-[#003300]/45">
                              {course.category}
                              {course.level ? ` · ${course.level}` : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* File count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#003300]/50">
                          <File className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">
                            {count} file{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold text-[#003300]/40 group-hover:text-primary transition-colors">
                          Open{" "}
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  };

  // ── File browser (Level 2) ────────────────────────────────────────────────
  const renderFileBrowser = () => {
    const courseFiles = resources.filter(
      (r) => r != null && r._id != null && r.title != null,
    );
    const totalSize = courseFiles.reduce((s, r) => s + (r.fileSize || 0), 0);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Course Materials", onClick: handleBackToCourses },
            { label: activeCourse?.title || "…" },
          ]}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-[#003300]">
                {activeCourse?.title}
              </h1>
            </div>
            <p className="text-sm text-[#003300]/50">
              {courseFiles.length} file{courseFiles.length !== 1 ? "s" : ""} ·{" "}
              {formatBytes(totalSize)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => fetchResources()}
            />
            <Button
              variant="primary"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => setShowUploadModal(true)}
            >
              Upload File
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-[#003300]/10 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#003300]/35" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in this course…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#003300]/3 rounded-lg border border-transparent focus:border-[#003300]/20 focus:bg-white outline-none text-[#003300] placeholder-[#003300]/35 transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="error">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-sm">{error}</span>
            </div>
          </Alert>
        )}

        {/* Files grid */}
        {loading ? (
          <LoadingState type="spinner" text="Loading files…" />
        ) : courseFiles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#003300]/10 py-20 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-[#003300]/15" />
            <p className="font-semibold text-[#003300]/60 mb-1">
              {searchQuery ? "No files match your search" : "No files yet"}
            </p>
            <p className="text-sm text-[#003300]/35 mb-5">
              {searchQuery
                ? "Try a different search term."
                : "Upload the first file for this course."}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                leftIcon={<Upload className="w-4 h-4" />}
                onClick={() => setShowUploadModal(true)}
              >
                Upload File
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseFiles
              .filter((resource) => resource && resource._id && resource.title)
              .map((resource) => (
                <ResourceCard
                  key={resource._id}
                  resource={resource}
                  onView={(r) => {
                    setSelectedResource(r);
                    setShowViewer(true);
                  }}
                  onEditAssignments={(r) => {
                    setSelectedResource(r);
                    setShowAssignmentModal(true);
                  }}
                  onDelete={handleDeleteResource}
                  onRename={renameResource}
                />
              ))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeCourseId ? (
          <motion.div
            key="files"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderFileBrowser()}
          </motion.div>
        ) : (
          <motion.div
            key="courses"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            {renderCourseGrid()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal — pre-select course when inside one */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
        courses={(courses || [])
          .filter((c) => c != null && c._id != null)
          .map((c) => ({ _id: c._id, title: c.title, level: c.level }))}
        defaultCourseId={activeCourseId ?? undefined}
      />

      {/* Assignment Modal */}
      {selectedResource && (
        <AssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedResource(null);
          }}
          resource={selectedResource}
          onSuccess={() => {
            fetchResources();
            setSelectedResource(null);
          }}
          courses={(courses || [])
            .filter((c) => c != null && c._id != null)
            .map((c) => ({
              _id: c._id,
              title: c.title,
              level: c.level,
              type: c.type,
              bundleCourses: c.bundleCourses?.map((sc) => ({ _id: sc._id })),
            }))}
        />
      )}

      {/* PDF Viewer */}
      {selectedResource && showViewer && (
        <PDFViewer
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false);
            setSelectedResource(null);
          }}
          resourceId={selectedResource._id}
          title={selectedResource.title}
        />
      )}
    </div>
  );
};

export default CLOResourceManagement;
