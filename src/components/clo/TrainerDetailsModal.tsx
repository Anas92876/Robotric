import { useState, useEffect } from "react";
import {
  Users,
  Mail,
  Phone,
  Award,
  BookOpen,
  Calendar,
  TrendingUp,
  FileText,
  X
} from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Badge, LoadingState } from "../ui";
import { useCLOTrainers } from "../../hooks/clo/useCLOTrainers";

interface TrainerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainerId: string | null;
}

export default function TrainerDetailsModal({
  isOpen,
  onClose,
  trainerId,
}: TrainerDetailsModalProps) {
  const { getTrainerPerformance } = useCLOTrainers();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && trainerId) {
      fetchTrainerDetails();
    }
  }, [isOpen, trainerId]);

  const fetchTrainerDetails = async () => {
    if (!trainerId) return;

    try {
      setLoading(true);
      setError(null);
      const result = await getTrainerPerformance(trainerId);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load trainer details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trainerId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trainer Details"
      description="View comprehensive trainer information and performance"
      size="xl"
    >
      {loading ? (
        <div className="py-12">
          <LoadingState type="spinner" text="Loading trainer details..." />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchTrainerDetails}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Trainer Info */}
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0">
                <Users className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#003300] mb-2">
                  {data.trainer.name}
                </h3>
                <div className="space-y-1 text-sm text-[#003300]/70">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{data.trainer.email}</span>
                  </div>
                  {data.trainer.profile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{data.trainer.profile.phone}</span>
                    </div>
                  )}
                  {data.trainer.profile?.specialization && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>{data.trainer.profile.specialization}</span>
                    </div>
                  )}
                </div>
                {data.trainer.profile?.bio && (
                  <p className="mt-3 text-sm text-[#003300]/60">
                    {data.trainer.profile.bio}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  data.trainer.profile?.isActive !== false
                    ? "success"
                    : "secondary"
                }
              >
                {data.trainer.profile?.isActive !== false ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {/* Performance Overview */}
          <div>
            <h4 className="text-lg font-semibold text-[#003300] mb-4">
              Performance Overview
            </h4>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-[#003300]/60">Total Groups</p>
              </div>
              <p className="text-2xl font-bold text-[#003300]">
                {data.performance.totalGroups}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {data.performance.activeGroups} active
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-600" />
                <p className="text-xs text-[#003300]/60">Total Students</p>
              </div>
              <p className="text-2xl font-bold text-[#003300]">
                {data.performance.totalStudents}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-teal-100">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <p className="text-xs text-[#003300]/60">Courses</p>
              </div>
              <p className="text-2xl font-bold text-[#003300]">
                {data.performance.coursesCount}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-cyan-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                <p className="text-xs text-[#003300]/60">Attendance</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {data.performance.overallAttendanceRate}%
              </p>
            </div>
          </div>

          {/* Groups */}
          {data.groups && data.groups.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-[#003300] mb-3">
                Assigned Groups ({data.groups.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.groups.map((group: any) => (
                  <div
                    key={group._id}
                    className="bg-white rounded-lg p-4 border border-[#003300]/10 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-[#003300]">
                          {group.name}
                        </h5>
                        <div className="flex items-center gap-3 mt-1 text-sm text-[#003300]/60">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {group.courseId?.title || "N/A"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {group.students?.length || 0} students
                          </span>
                          {group.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(group.startDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          group.status === "active" ? "success" : "secondary"
                        }
                        size="sm"
                      >
                        {group.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Courses Taught */}
          {data.courses && data.courses.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-[#003300] mb-3">
                Courses Taught ({data.courses.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.courses.map((course: any) => (
                  <div
                    key={course._id}
                    className="bg-white rounded-lg p-3 border border-[#003300]/10 hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-medium text-[#003300] text-sm">
                          {course.title}
                        </h5>
                        <p className="text-xs text-[#003300]/60 mt-1">
                          {course.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-[#003300]/10">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
