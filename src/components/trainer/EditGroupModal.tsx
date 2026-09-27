import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Save,
  Plus,
  AlertCircle,
} from "lucide-react";
import { useTrainerGroups, type TrainerGroup } from "../../hooks/trainer/useTrainerGroups";
import {
  CardComponent,
  CardBody,
  Button,
  Input,
  Alert,
} from "../ui";

interface EditGroupModalProps {
  group: TrainerGroup;
  onClose: () => void;
  onSuccess: () => void;
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

export default function EditGroupModal({ group, onClose, onSuccess }: EditGroupModalProps) {
  const { updateGroup } = useTrainerGroups();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: group.name || "",
    description: group.description || "",
    startDate: group.startDate ? new Date(group.startDate).toISOString().split('T')[0] : "",
    endDate: group.endDate ? new Date(group.endDate).toISOString().split('T')[0] : "",
    maxStudents: group.maxStudents || 20,
    color: group.color || COLOR_OPTIONS[0],
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>(
    group.schedule && group.schedule.length > 0
      ? group.schedule
      : [{ day: "Monday", startTime: "09:00", endTime: "11:00", location: "" }]
  );

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

      const updates = {
        ...formData,
        schedule: schedule.filter((s) => s.day && s.startTime && s.endTime),
      };

      const updated = await updateGroup(group._id, updates);

      if (updated) {
        onSuccess();
        onClose();
      } else {
        setError("Failed to update group. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update group");
      console.error("Error updating group:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <CardComponent variant="glass">
          <CardBody>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Edit Group</h2>
              <button
                onClick={onClose}
                className="text-[#003300]/60 hover:text-[#003300] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="error" className="mb-6">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>

                  {/* Group Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
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
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Brief description of this group..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
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
                      <label className="block text-sm font-medium mb-2">
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
                    <label className="block text-sm font-medium mb-2">
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
                    <label className="block text-sm font-medium mb-2">
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

                {/* Schedule */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Schedule</h3>
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

                  <div className="space-y-3">
                    {schedule.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          {/* Day */}
                          <div>
                            <label className="block text-xs text-white/60 mb-1">
                              Day
                            </label>
                            <select
                              value={item.day}
                              onChange={(e) =>
                                updateScheduleItem(index, "day", e.target.value)
                              }
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
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
                            <label className="block text-xs text-white/60 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={item.startTime}
                              onChange={(e) =>
                                updateScheduleItem(index, "startTime", e.target.value)
                              }
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* End Time */}
                          <div>
                            <label className="block text-xs text-white/60 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={item.endTime}
                              onChange={(e) =>
                                updateScheduleItem(index, "endTime", e.target.value)
                              }
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* Location */}
                          <div>
                            <label className="block text-xs text-white/60 mb-1">
                              Location (Optional)
                            </label>
                            <input
                              type="text"
                              value={item.location || ""}
                              onChange={(e) =>
                                updateScheduleItem(index, "location", e.target.value)
                              }
                              placeholder="Room/Lab"
                              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
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
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
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
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </CardComponent>
      </motion.div>
    </motion.div>
  );
}
