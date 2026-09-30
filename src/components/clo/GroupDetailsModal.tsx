import { useState, useEffect } from "react";
import {
  UsersRound,
  Mail,
  BookOpen,
  Calendar,
  User,
  TrendingUp,
  Clock,
  Users,
} from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Badge, LoadingState } from "../ui";
import { useCLOGroups } from "../../hooks/clo/useCLOGroups";

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string | null;
}

export default function GroupDetailsModal({
  isOpen,
  onClose,
  groupId,
}: GroupDetailsModalProps) {
  const { getGroupDetails, getGroupStudents } = useCLOGroups();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && groupId) {
      fetchGroupDetails();
    }
  }, [isOpen, groupId]);

  const fetchGroupDetails = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);
      const [groupData, studentsData] = await Promise.all([
        getGroupDetails(groupId),
        getGroupStudents(groupId),
      ]);
      console.log('GroupDetailsModal received data:', groupData);
      console.log('courseId:', groupData?.courseId);
      console.log('trainerId:', groupData?.trainerId);
      setData(groupData);
      setStudents(studentsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !groupId) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Group Details"
      description="View comprehensive group information and student list"
      size="xl"
    >
      {loading ? (
        <div className="py-12">
          <LoadingState type="spinner" text="Loading group details..." />
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button variant="primary" onClick={fetchGroupDetails}>
            Retry
          </Button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Group Info */}
          <div className="bg-white rounded-xl p-6 border border-ink/10">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white flex-shrink-0">
                <UsersRound className="w-10 h-10" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-2xl font-bold text-ink">
                    {data.name}
                  </h3>
                  <Badge
                    variant={
                      data.status === "active" ? "success" : "secondary"
                    }
                  >
                    {data.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-ink/70">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-medium">
                      {data.courseId?.title || "N/A"}
                    </span>
                    {data.courseId?.category && (
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                        {data.courseId.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Trainer: {data.trainerId?.name || "N/A"}</span>
                  </div>
                  {data.trainerId?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>{data.trainerId.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {data.startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Start: {new Date(data.startDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {data.endDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          End: {new Date(data.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {data.description && (
                  <p className="mt-3 text-sm text-ink/60">
                    {data.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Group Statistics */}
          <div>
            <h4 className="text-lg font-semibold text-ink mb-4">
              Group Statistics
            </h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-xs text-ink/60">Students</p>
              </div>
              <p className="text-2xl font-bold text-ink">
                {data.stats?.studentsCount || students.length || 0}
                {(data.maxStudents || data.maxCapacity) && (
                  <span className="text-sm font-normal text-ink/60">
                    /{data.maxStudents || data.maxCapacity}
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <p className="text-xs text-ink/60">Avg Attendance</p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {data.stats?.avgAttendance?.toFixed(1) || 0}%
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-ink/10">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-xs text-ink/60">Level</p>
              </div>
              <p className="text-lg font-semibold text-ink capitalize">
                {data.courseId?.level || "N/A"}
              </p>
            </div>
          </div>

          {/* Students List */}
          {students && students.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Enrolled Students ({students.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {students.map((student: any) => (
                  <div
                    key={student._id}
                    className="bg-white rounded-lg p-4 border border-ink/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                          {student.name?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <div>
                          <h5 className="font-semibold text-ink">
                            {student.name}
                          </h5>
                          <div className="flex items-center gap-2 text-sm text-ink/60">
                            <Mail className="w-3 h-3" />
                            <span>{student.email}</span>
                          </div>
                        </div>
                      </div>
                      {student.enrollmentDate && (
                        <div className="text-xs text-ink/60">
                          Enrolled:{" "}
                          {new Date(student.enrollmentDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Schedule */}
          {data.schedule && data.schedule.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-ink mb-3">
                Weekly Schedule
              </h4>
              <div className="space-y-2">
                {data.schedule.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 border border-ink/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-xs text-ink/60">Day</p>
                            <p className="font-medium text-ink">{item.day}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-secondary" />
                          <div>
                            <p className="text-xs text-ink/60">Time</p>
                            <p className="font-medium text-ink">
                              {item.startTime} - {item.endTime}
                            </p>
                          </div>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-accent" />
                            <div>
                              <p className="text-xs text-ink/60">Location</p>
                              <p className="font-medium text-ink">{item.location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
