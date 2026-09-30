import { useState, useEffect } from "react";
import {
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  BarChart3,
  Tag,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Badge, LoadingState } from "../ui";
import { useCLOCourses } from "../../hooks/clo/useCLOCourses";

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
}

export default function CourseDetailsModal({
  isOpen,
  onClose,
  courseId,
}: CourseDetailsModalProps) {
  const { getCourseDetails } = useCLOCourses();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseDetails();
    }
  }, [isOpen, courseId]);

  const fetchCourseDetails = async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await getCourseDetails(courseId);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !courseId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Course Details"
      description="View comprehensive course information and statistics"
      size="xl"
    >
      {loading ? (
        <div className="py-12">
          <LoadingState type="spinner" text="Loading course details..." />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchCourseDetails}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Course Info */}
          <div className="bg-white rounded-xl p-6 border border-ink/10">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                <BookOpen className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-2xl font-bold text-ink">
                    {data.course?.title || data.title}
                  </h3>
                  <Badge
                    variant={
                      (data.course?.status || data.status) === "published"
                        ? "success"
                        : (data.course?.status || data.status) === "draft"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {data.course?.status || data.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {data.course?.category || data.category}
                  </span>
                  {(data.course?.level || data.level) && (
                    <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 capitalize">
                      <BarChart3 className="w-3 h-3" />
                      {data.course?.level || data.level}
                    </span>
                  )}
                  {(data.course?.duration || data.duration) && (
                    <span className="bg-accent/10 text-accent px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {data.course?.duration || data.duration} hours
                    </span>
                  )}
                  {(data.course?.price !== undefined || data.price !== undefined) && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${data.course?.price ?? data.price}
                    </span>
                  )}
                </div>
                {(data.course?.description || data.description) && (
                  <p className="text-sm text-ink/70">
                    {data.course?.description || data.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Course Statistics */}
          <div>
            <h4 className="text-lg font-semibold text-ink mb-4">
              Course Statistics
            </h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-xs text-ink/60">Total Groups</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {data.stats?.totalGroups || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {data.stats?.activeGroups || 0} active
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-secondary" />
                <p className="text-xs text-ink/60">Enrollments</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {data.stats?.totalEnrollments || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {data.stats?.activeEnrollments || 0} active
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <p className="text-xs text-ink/60">Completion Rate</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {data.stats?.completionRate?.toFixed(0) || 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-xs text-ink/60">Trainers</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {data.stats?.trainersCount || 0}
              </p>
            </div>
          </div>

          {/* Objectives */}
          {(data.course?.objectives || data.objectives) && (data.course?.objectives || data.objectives).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Learning Objectives
              </h4>
              <div className="bg-white rounded-lg p-4 border border-ink/10">
                <ul className="space-y-2">
                  {(data.course?.objectives || data.objectives).map((objective: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-ink/70"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {(data.course?.prerequisites || data.prerequisites) && (data.course?.prerequisites || data.prerequisites).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Prerequisites
              </h4>
              <div className="bg-white rounded-lg p-4 border border-ink/10">
                <ul className="space-y-2">
                  {(data.course?.prerequisites || data.prerequisites).map(
                    (prerequisite: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-ink/70"
                      >
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span>{prerequisite}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Syllabus */}
          {(data.course?.syllabus || data.syllabus) && Array.isArray(data.course?.syllabus || data.syllabus) && (data.course?.syllabus || data.syllabus).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Syllabus
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(data.course?.syllabus || data.syllabus).map((item: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-ink/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-ink">
                          {item.title || item.topic || `Module ${index + 1}`}
                        </h5>
                        {item.description && (
                          <p className="text-sm text-ink/60 mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.duration && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-ink/60">
                            <Clock className="w-3 h-3" />
                            <span>{item.duration} hours</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructor */}
          {(data.course?.instructor || data.instructor) && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Instructor
              </h4>
              <div className="bg-white rounded-lg p-4 border border-ink/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
                    {(data.course?.instructor || data.instructor).name?.charAt(0).toUpperCase() || "I"}
                  </div>
                  <div>
                    <h5 className="font-semibold text-ink">
                      {(data.course?.instructor || data.instructor).name}
                    </h5>
                    <p className="text-sm text-ink/60">
                      {(data.course?.instructor || data.instructor).email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-ink/10">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
