import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Users,
  Calendar,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";
import { useTrainerGroups } from "../../hooks/trainer/useTrainerGroups";
import { api } from "../../lib/api";
import {
  CardComponent,
  CardBody,
  Button,
  Input,
  LoadingState,
  Alert,
} from "../../components/ui";
import { useTranslation } from 'react-i18next';

interface Course {
  _id: string;
  title: string;
  category?: string;
  thumbnail?: string;
}

interface ScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const COLOR_OPTIONS = [
  "#30c59b", // Primary
  "#e74c3c", // Red
  "#3498db", // Blue
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#e67e22", // Dark Orange
  "#2ecc71", // Green
];

export default function TrainerCreateGroup() {
  const navigate = useNavigate();
  const { createGroup } = useTrainerGroups();
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardTrainer']);
  const isRTL = i18n.language === 'ar';

  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    courseId: "",
    startDate: "",
    endDate: "",
    maxStudents: 20,
    color: COLOR_OPTIONS[0],
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { day: "Monday", startTime: "09:00", endTime: "11:00", location: "" },
  ]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoadingCourses(true);
        const response = await api.get("/trainer/groups/courses/all");
        setCourses(response.data.data || response.data || []);
      } catch (err: any) {
        console.error("Error fetching courses:", err);
        setError("Failed to load courses. Please try again.");
      } finally {
        setIsLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  // Handle form input changes
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Add schedule item
  const addScheduleItem = () => {
    setSchedule([
      ...schedule,
      { day: "Monday", startTime: "09:00", endTime: "11:00", location: "" },
    ]);
  };

  // Remove schedule item
  const removeScheduleItem = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  // Update schedule item
  const updateScheduleItem = (index: number, field: string, value: string) => {
    const updated = [...schedule];
    updated[index] = { ...updated[index], [field]: value };
    setSchedule(updated);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Group name is required");
      return;
    }

    if (!formData.courseId) {
      setError("Please select a course");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError("Start and end dates are required");
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError("End date must be after start date");
      return;
    }

    if (schedule.length === 0) {
      setError("Please add at least one schedule item");
      return;
    }

    try {
      setIsSaving(true);

      const groupData = {
        ...formData,
        schedule: schedule.filter((s) => s.day && s.startTime && s.endTime),
      };

      const newGroup = await createGroup(groupData);

      if (newGroup) {
        // Navigate to the new group's detail page
        navigate(`/trainer/groups/${newGroup._id}`);
      } else {
        setError("Failed to create group. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create group");
      console.error("Error creating group:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (isLoadingCourses) {
    return <LoadingState type="skeleton" text={t('dashboardCommon:loading')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate("/trainer/groups")}
        >
          Back to Groups
        </Button>

        <div className="mt-4">
          <h1 className="text-3xl font-bold inline-block group-hover:scale-105 transition-transform duration-300" style={{
            background: 'linear-gradient(135deg, #003300 0%, #004d00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{t('dashboardTrainer:createGroup')}</h1>
          <p className={`mt-2 transition-colors duration-300 ${isRTL ? 'text-right' : 'text-left'}`} style={{ color: '#003300' + 'CC' }}>
            Set up a new training group with students and schedule
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <CardComponent variant="glass">
            <CardBody>
              <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

              <div className="space-y-4">
                {/* Group Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Group Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Robotics Beginners - Spring 2025"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Brief description of this group..."
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#003300]/20 text-[#003300] placeholder:text-[#003300]/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    rows={3}
                  />
                </div>

                {/* Course Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Course <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => handleChange("courseId", e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#003300]/20 text-[#003300] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  >
                    <option value="" className="bg-zinc-900">
                      Select a course...
                    </option>
                    {courses.map((course) => (
                      <option
                        key={course._id}
                        value={course._id}
                                             >
                        {course.title}
                        {course.category && ` (${course.category})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleChange("startDate", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      End Date <span className="text-red-400">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Max Students */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Maximum Students
                  </label>
                  <Input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) =>
                      handleChange("maxStudents", parseInt(e.target.value))
                    }
                    min={1}
                    max={100}
                  />
                </div>

                {/* Color Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Group Color
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleChange("color", color)}
                        className={`w-12 h-12 rounded-lg transition-all ${
                          formData.color === color
                            ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </CardComponent>

          {/* Schedule */}
          <CardComponent variant="glass">
            <CardBody>
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h2 className="text-xl font-semibold">Schedule</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={addScheduleItem}
                >
                  Add Time Slot
                </Button>
              </div>

              <div className="space-y-4">
                {schedule.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Day */}
                      <div>
                        <label className={`block text-xs text-white/60 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Day
                        </label>
                        <select
                          value={item.day}
                          onChange={(e) =>
                            updateScheduleItem(index, "day", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#003300]/20 text-[#003300] text-sm focus:outline-none focus:border-primary"
                        >
                          {DAYS_OF_WEEK.map((day) => (
                            <option key={day} value={day} className="bg-zinc-900">
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Time */}
                      <div>
                        <label className={`block text-xs text-white/60 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={item.startTime}
                          onChange={(e) =>
                            updateScheduleItem(index, "startTime", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#003300]/20 text-[#003300] text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* End Time */}
                      <div>
                        <label className={`block text-xs text-white/60 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          End Time
                        </label>
                        <input
                          type="time"
                          value={item.endTime}
                          onChange={(e) =>
                            updateScheduleItem(index, "endTime", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#003300]/20 text-[#003300] text-sm focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Location */}
                      <div>
                        <label className={`block text-xs text-white/60 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          Location (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.location || ""}
                          onChange={(e) =>
                            updateScheduleItem(index, "location", e.target.value)
                          }
                          placeholder="Room/Lab"
                          className="w-full px-3 py-2 rounded-lg bg-white border border-[#003300]/20 text-[#003300] text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* Remove Button */}
                    {schedule.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeScheduleItem(index)}
                        className="mt-6 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </CardComponent>

          {/* Action Buttons */}
          <div className={`flex justify-end gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/trainer/groups")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-5 h-5" />}
              disabled={isSaving}
            >
              {isSaving ? "Creating..." : t('dashboardTrainer:createGroup')}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
