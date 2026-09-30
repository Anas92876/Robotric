import { useState, useEffect, useRef } from "react";
import { UsersRound, BookOpen, User, Calendar, Users, FileText, Plus, Trash2, Clock, MapPin, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Input } from "../ui";

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => Promise<void>;
  group?: Group | null;
  courses?: Array<{ _id: string; title: string; category: string }>;
  trainers?: Array<{ _id: string; name: string; email: string }>;
  isLoading?: boolean;
}

export interface GroupFormData {
  name: string;
  courseId: string;
  trainerId: string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  startingSessionNumber: number;
  description: string;
  schedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
}

interface Group {
  _id: string;
  name: string;
  courseId: { _id: string; title: string } | string;
  trainerId: { _id: string; name: string } | string;
  startDate: string;
  endDate: string;
  maxStudents: number;
  description: string;
  status?: string;
  schedule?: Array<{
    day: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
}

export default function GroupModal({
  isOpen,
  onClose,
  onSubmit,
  group,
  courses = [],
  trainers = [],
  isLoading = false,
}: GroupModalProps) {
  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    courseId: "",
    trainerId: "",
    startDate: "",
    endDate: "",
    maxStudents: 30,
    startingSessionNumber: 1,
    description: "",
    schedule: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scheduleErrors, setScheduleErrors] = useState<Record<number, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<GroupFormData | null>(null);

  // Filter trainers to show active ones, plus the currently selected trainer (if editing)
  const availableTrainers = trainers.filter((trainer: any) => {
    // Always include the currently selected trainer
    if (formData.trainerId && trainer._id === formData.trainerId) {
      return true;
    }
    // Include active trainers
    return trainer.profile?.isActive !== false;
  });

  // Reset form when modal opens/closes or group changes
  useEffect(() => {
    if (isOpen) {
      let initialData: GroupFormData;
      if (group) {
        // Editing existing group
        const courseId = typeof group.courseId === 'object' ? group.courseId._id : group.courseId;
        const trainerId = typeof group.trainerId === 'object' ? group.trainerId._id : group.trainerId;

        initialData = {
          name: group.name,
          courseId: courseId || "",
          trainerId: trainerId || "",
          startDate: group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : "",
          endDate: group.endDate ? new Date(group.endDate).toISOString().split('T')[0] : "",
          maxStudents: group.maxStudents || 30,
          startingSessionNumber: (group as any).startingSessionNumber || 1,
          description: group.description || "",
          schedule: group.schedule || [],
        };
      } else {
        // Creating new group
        initialData = {
          name: "",
          courseId: "",
          trainerId: "",
          startDate: "",
          endDate: "",
          maxStudents: 30,
          startingSessionNumber: 1,
          description: "",
          schedule: [],
        };
      }
      setFormData(initialData);
      initialFormDataRef.current = initialData;
      setErrors({});
      setScheduleErrors({});
      setShowConfirmDialog(false);
    }
  }, [isOpen, group]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Group name is required";
    }

    if (!formData.courseId) {
      newErrors.courseId = "Course is required";
    }

    if (!formData.trainerId) {
      newErrors.trainerId = "Trainer is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      newErrors.endDate = "End date must be after start date";
    }

    if (formData.maxStudents <= 0) {
      newErrors.maxStudents = "Max students must be greater than 0";
    }

    if (formData.maxStudents > 100) {
      newErrors.maxStudents = "Max students cannot exceed 100";
    }

    if (!formData.startingSessionNumber || formData.startingSessionNumber < 1) {
      newErrors.startingSessionNumber = "Starting session number must be at least 1";
    }

    // Validate schedule times
    const newScheduleErrors: Record<number, string> = {};
    formData.schedule.forEach((session, index) => {
      if (session.startTime && session.endTime) {
        const startTime = session.startTime;
        const endTime = session.endTime;
        
        // Compare times (HH:MM format)
        if (startTime >= endTime) {
          newScheduleErrors[index] = "Start time must be before end time";
        }
      }
    });

    setErrors(newErrors);
    setScheduleErrors(newScheduleErrors);
    return Object.keys(newErrors).length === 0 && Object.keys(newScheduleErrors).length === 0;
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    const current = formData;
    
    return (
      initial.name !== current.name ||
      initial.courseId !== current.courseId ||
      initial.trainerId !== current.trainerId ||
      initial.startDate !== current.startDate ||
      initial.endDate !== current.endDate ||
      initial.maxStudents !== current.maxStudents ||
      initial.startingSessionNumber !== current.startingSessionNumber ||
      initial.description !== current.description ||
      JSON.stringify(initial.schedule) !== JSON.stringify(current.schedule)
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      setShowConfirmDialog(false);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <>
    <Modal
      isOpen={isOpen && !showConfirmDialog}
      onClose={handleClose}
      title={group ? "Edit Group" : "Create New Group"}
      description={
        group
          ? "Update group information"
          : "Create a new training group"
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Group Name */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Robotics Beginners Fall 2024"
              leftIcon={<UsersRound className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Course <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <select
                value={formData.courseId}
                onChange={(e) =>
                  setFormData({ ...formData, courseId: e.target.value })
                }
                className="w-full pl-10 px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                disabled={isLoading}
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title} ({course.category})
                  </option>
                ))}
              </select>
            </div>
            {errors.courseId && (
              <p className="mt-1 text-sm text-red-500">{errors.courseId}</p>
            )}
          </div>

          {/* Trainer Selection */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Trainer <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <select
                value={formData.trainerId}
                onChange={(e) =>
                  setFormData({ ...formData, trainerId: e.target.value })
                }
                className="w-full pl-10 px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                disabled={isLoading}
              >
                <option value="">Select a trainer</option>
                {availableTrainers.map((trainer: any) => (
                  <option key={trainer._id} value={trainer._id}>
                    {trainer.name} ({trainer.email})
                  </option>
                ))}
              </select>
            </div>
            {errors.trainerId && (
              <p className="mt-1 text-sm text-red-500">{errors.trainerId}</p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              leftIcon={<Calendar className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              End Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              leftIcon={<Calendar className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
            )}
          </div>

          {/* Max Students */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Max Students <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.maxStudents}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxStudents: parseInt(e.target.value) || 30,
                })
              }
              placeholder="30"
              min="1"
              max="100"
              leftIcon={<Users className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.maxStudents && (
              <p className="mt-1 text-sm text-red-500">{errors.maxStudents}</p>
            )}
          </div>

          {/* Starting Session Number */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Starting Session Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.startingSessionNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startingSessionNumber: parseInt(e.target.value) || 1,
                })
              }
              placeholder="1"
              min="1"
              leftIcon={<Calendar className="w-4 h-4" />}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-ink/60">
              The session number this group starts from (e.g., 1 for beginners, 5 for advanced)
            </p>
            {errors.startingSessionNumber && (
              <p className="mt-1 text-sm text-red-500">{errors.startingSessionNumber}</p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Provide additional details about the group..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink placeholder:text-ink/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-ink">
              Weekly Schedule
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setFormData({
                  ...formData,
                  schedule: [
                    ...formData.schedule,
                    { day: "Monday", startTime: "09:00", endTime: "11:00", location: "" },
                  ],
                });
              }}
              disabled={isLoading}
            >
              Add Session
            </Button>
          </div>

          {formData.schedule.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {formData.schedule.map((session, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-ink/20 bg-gray-50 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Day */}
                      <div>
                        <label className="block text-xs font-medium text-ink/70 mb-1">
                          Day
                        </label>
                        <select
                          value={session.day}
                          onChange={(e) => {
                            const newSchedule = [...formData.schedule];
                            newSchedule[index].day = e.target.value;
                            setFormData({ ...formData, schedule: newSchedule });
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-ink/20 bg-white text-ink focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          disabled={isLoading}
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      {/* Start Time */}
                      <div>
                        <label className="block text-xs font-medium text-ink/70 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={session.startTime}
                          onChange={(e) => {
                            const newSchedule = [...formData.schedule];
                            newSchedule[index].startTime = e.target.value;
                            setFormData({ ...formData, schedule: newSchedule });
                            // Clear error for this schedule item when user changes time
                            if (scheduleErrors[index]) {
                              const newScheduleErrors = { ...scheduleErrors };
                              delete newScheduleErrors[index];
                              setScheduleErrors(newScheduleErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-ink focus:ring-2 focus:ring-emerald-500/20 outline-none ${
                            scheduleErrors[index] 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-ink/20 focus:border-emerald-500'
                          }`}
                          disabled={isLoading}
                        />
                      </div>

                      {/* End Time */}
                      <div>
                        <label className="block text-xs font-medium text-ink/70 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={session.endTime}
                          onChange={(e) => {
                            const newSchedule = [...formData.schedule];
                            newSchedule[index].endTime = e.target.value;
                            setFormData({ ...formData, schedule: newSchedule });
                            // Clear error for this schedule item when user changes time
                            if (scheduleErrors[index]) {
                              const newScheduleErrors = { ...scheduleErrors };
                              delete newScheduleErrors[index];
                              setScheduleErrors(newScheduleErrors);
                            }
                          }}
                          className={`w-full px-3 py-2 text-sm rounded-lg border bg-white text-ink focus:ring-2 focus:ring-emerald-500/20 outline-none ${
                            scheduleErrors[index] 
                              ? 'border-red-500 focus:border-red-500' 
                              : 'border-ink/20 focus:border-emerald-500'
                          }`}
                          disabled={isLoading}
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className="block text-xs font-medium text-ink/70 mb-1">
                          Location
                        </label>
                        <input
                          type="text"
                          value={session.location || ""}
                          onChange={(e) => {
                            const newSchedule = [...formData.schedule];
                            newSchedule[index].location = e.target.value;
                            setFormData({ ...formData, schedule: newSchedule });
                          }}
                          placeholder="Room/Location"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-ink/20 bg-white text-ink placeholder:text-ink/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={() => {
                        const newSchedule = formData.schedule.filter((_, i) => i !== index);
                        setFormData({ ...formData, schedule: newSchedule });
                        // Clear error for deleted schedule item
                        if (scheduleErrors[index]) {
                          const newScheduleErrors = { ...scheduleErrors };
                          delete newScheduleErrors[index];
                          setScheduleErrors(newScheduleErrors);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isLoading}
                    />
                  </div>
                  {/* Schedule Error Message */}
                  {scheduleErrors[index] && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {scheduleErrors[index]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {formData.schedule.length === 0 && (
            <p className="text-sm text-ink/60 text-center py-4 border border-dashed border-ink/20 rounded-lg">
              No sessions added yet. Click "Add Session" to create a weekly schedule.
            </p>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Saving..." : group ? "Update Group" : "Create Group"}
          </Button>
        </div>
      </form>
    </Modal>

    {/* Confirmation Dialog */}
    <Modal
      isOpen={showConfirmDialog}
      onClose={handleCancelClose}
      title="Unsaved Changes"
      size="sm"
      closeOnOverlayClick={true}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-ink font-medium">Are you sure you want to leave?</p>
            <p className="text-sm text-ink/60 mt-1">
              You have unsaved changes. If you leave now, your changes will be lost.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancelClose}
          >
            Continue Editing
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmClose}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Discard Changes
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
