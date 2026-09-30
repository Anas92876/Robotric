import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Tag, BarChart3, Clock, DollarSign,
  AlertTriangle, Trophy, Package, Link2, X, Search,
  Loader2, TrendingDown, Plus
} from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Input } from "../ui";
import { api } from "../../lib/api";
import type { SubCourse } from "../../hooks/clo/useCLOCourses";

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CourseFormData) => Promise<void>;
  course?: Course | null;
  isLoading?: boolean;
  onAddSubCourse?: (bundleId: string, courseId: string) => Promise<void>;
  onRemoveSubCourse?: (bundleId: string, courseId: string) => Promise<void>;
}

export interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  price: number;
  objectives?: string[];
  prerequisites?: string[];
  wroDocumentsRequired?: boolean;
  type?: 'single' | 'bundle';
  bundlePrice?: number;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: number;
  price: number;
  objectives?: string[];
  prerequisites?: string[];
  status?: string;
  wroDocumentsRequired?: boolean;
  type?: 'single' | 'bundle';
  bundlePrice?: number;
  bundleCourses?: SubCourse[];
  parentBundle?: { _id: string; title: string } | string | null;
}

interface AvailableCourse {
  _id: string;
  title: string;
  price: number;
  category: string;
  level?: string;
  status: string;
  type?: string;
  parentBundle?: string | null;
}

export default function CourseModal({
  isOpen,
  onClose,
  onSubmit,
  course,
  isLoading = false,
  onAddSubCourse,
  onRemoveSubCourse,
}: CourseModalProps) {
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    duration: 0,
    price: 0,
    objectives: [],
    prerequisites: [],
    wroDocumentsRequired: false,
    type: "single",
    bundlePrice: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<CourseFormData | null>(null);

  // Sub-course picker state
  const [showSubCoursePicker, setShowSubCoursePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [subCourseAction, setSubCourseAction] = useState<string | null>(null); // courseId being linked/unlinked

  // Local copy of bundleCourses for display (synced from course prop)
  const [localSubCourses, setLocalSubCourses] = useState<SubCourse[]>([]);

  const isBundle = formData.type === 'bundle';
  const isEditing = !!course?._id;

  // Reset form when modal opens/closes or course changes
  useEffect(() => {
    if (isOpen) {
      let initialData: CourseFormData;
      if (course) {
        initialData = {
          title: course.title,
          description: course.description,
          category: course.category,
          level: course.level || "beginner",
          duration: course.duration || 0,
          price: course.price || 0,
          objectives: course.objectives || [],
          prerequisites: course.prerequisites || [],
          wroDocumentsRequired: course.wroDocumentsRequired ?? false,
          type: course.type || "single",
          bundlePrice: course.bundlePrice || 0,
        };
        setLocalSubCourses(course.bundleCourses || []);
      } else {
        initialData = {
          title: "",
          description: "",
          category: "",
          level: "beginner",
          duration: 0,
          price: 0,
          objectives: [],
          prerequisites: [],
          wroDocumentsRequired: false,
          type: "single",
          bundlePrice: 0,
        };
        setLocalSubCourses([]);
      }
      setFormData(initialData);
      initialFormDataRef.current = initialData;
      setErrors({});
      setShowConfirmDialog(false);
      setShowSubCoursePicker(false);
      setPickerSearch("");
    }
  }, [isOpen, course]);

  // Fetch available courses for the sub-course picker
  const openSubCoursePicker = async () => {
    setShowSubCoursePicker(true);
    setPickerSearch("");
    setLoadingAvailable(true);
    try {
      const res = await api.get('/clo/courses?includeSubCourses=true');
      const all: AvailableCourse[] = res.data.data || [];
      // Only single-type courses that are not already a sub-course of another bundle
      // and not already in this bundle
      const currentSubIds = new Set(localSubCourses.map(sc => sc._id));
      const filtered = all.filter(c =>
        c.type !== 'bundle' &&
        !c.parentBundle &&
        !currentSubIds.has(c._id) &&
        c._id !== course?._id
      );
      setAvailableCourses(filtered);
    } catch {
      setAvailableCourses([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleLinkCourse = async (courseId: string, courseObj: AvailableCourse) => {
    if (!course?._id || !onAddSubCourse) return;
    setSubCourseAction(courseId);
    try {
      await onAddSubCourse(course._id, courseId);
      setLocalSubCourses(prev => [...prev, {
        _id: courseObj._id,
        title: courseObj.title,
        price: courseObj.price,
        level: courseObj.level,
        status: courseObj.status,
      }]);
      // Remove from available list
      setAvailableCourses(prev => prev.filter(c => c._id !== courseId));
    } catch (e: any) {
      alert(e.message || 'Failed to link sub-course');
    } finally {
      setSubCourseAction(null);
    }
  };

  const handleUnlinkCourse = async (subCourseId: string) => {
    if (!course?._id || !onRemoveSubCourse) return;
    if (!confirm('Remove this sub-course from the bundle? The course will not be deleted.')) return;
    setSubCourseAction(subCourseId);
    try {
      await onRemoveSubCourse(course._id, subCourseId);
      setLocalSubCourses(prev => prev.filter(sc => sc._id !== subCourseId));
    } catch (e: any) {
      alert(e.message || 'Failed to remove sub-course');
    } finally {
      setSubCourseAction(null);
    }
  };

  // Derived pricing values
  const individualTotal = localSubCourses.reduce((sum, sc) => sum + (sc.price || 0), 0);
  const bundlePrice = formData.bundlePrice || 0;
  const savings = individualTotal > 0 ? individualTotal - bundlePrice : 0;
  const discountPct = individualTotal > 0 && savings > 0
    ? Math.round((savings / individualTotal) * 100)
    : 0;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!isBundle && formData.duration <= 0) newErrors.duration = "Duration must be greater than 0";
    if (!isBundle && formData.price < 0) newErrors.price = "Price cannot be negative";
    if (isBundle && (formData.bundlePrice == null || formData.bundlePrice < 0)) newErrors.bundlePrice = "Bundle price is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    const current = formData;
    return (
      initial.title !== current.title ||
      initial.description !== current.description ||
      initial.category !== current.category ||
      initial.level !== current.level ||
      initial.duration !== current.duration ||
      initial.price !== current.price ||
      initial.bundlePrice !== current.bundlePrice ||
      initial.type !== current.type ||
      JSON.stringify(initial.objectives) !== JSON.stringify(current.objectives) ||
      JSON.stringify(initial.prerequisites) !== JSON.stringify(current.prerequisites) ||
      initial.wroDocumentsRequired !== current.wroDocumentsRequired
    );
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) setShowConfirmDialog(true);
    else onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onSubmit({ ...formData, totalHours: formData.duration } as any);
      setShowConfirmDialog(false);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const filteredAvailable = availableCourses.filter(c =>
    c.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.category?.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const parentBundleTitle = course?.parentBundle
    ? (typeof course.parentBundle === 'object' ? course.parentBundle.title : null)
    : null;

  return (
    <>
    <Modal
      isOpen={isOpen && !showConfirmDialog}
      onClose={handleClose}
      title={course ? (isBundle ? "Edit Bundle" : "Edit Course") : (isBundle ? "Create Bundle" : "Create New Course")}
      description={course ? "Update course information" : "Add a new course to the system"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Course Type Toggle ── */}
        {!course && (
          <div className="flex gap-2 p-1 bg-ink/5 rounded-xl">
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, type: 'single' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                !isBundle
                  ? 'bg-white shadow text-ink ring-1 ring-ink/10'
                  : 'text-ink/50 hover:text-ink'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Single Course
            </button>
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, type: 'bundle' }))}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isBundle
                  ? 'bg-white shadow text-ink ring-1 ring-ink/10'
                  : 'text-ink/50 hover:text-ink'
              }`}
            >
              <Package className="w-4 h-4" />
              Bundle Package
            </button>
          </div>
        )}

        {/* Bundle badge when editing */}
        {course && isBundle && (
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
            <Package className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-violet-700">Bundle Package</span>
            <span className="text-xs text-violet-500 ml-auto">{localSubCourses.length} sub-courses</span>
          </div>
        )}

        {/* "Part of bundle" notice for sub-courses */}
        {parentBundleTitle && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-blue-700">Part of bundle: <strong>{parentBundleTitle}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">
              {isBundle ? 'Bundle Title' : 'Course Title'} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={isBundle ? "e.g., Robotics Full Track" : "e.g., Introduction to Robotics"}
              leftIcon={isBundle ? <Package className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Robotics, AI, Programming"
              leftIcon={<Tag className="w-4 h-4" />}
              disabled={isLoading}
            />
            {errors.category && <p className="mt-1 text-sm text-red-500">{errors.category}</p>}
          </div>

          {/* Level */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Level <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full pl-10 px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                disabled={isLoading}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          {/* Duration — only for single courses */}
          {!isBundle && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Duration (hours) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                placeholder="40"
                min="0"
                leftIcon={<Clock className="w-4 h-4" />}
                disabled={isLoading}
              />
              {errors.duration && <p className="mt-1 text-sm text-red-500">{errors.duration}</p>}
            </div>
          )}

          {/* Price — single course */}
          {!isBundle && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                Price ($) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="299.99"
                min="0"
                step="0.01"
                leftIcon={<DollarSign className="w-4 h-4" />}
                disabled={isLoading}
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
            </div>
          )}

          {/* Bundle Price */}
          {isBundle && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-ink mb-1">
                Bundle Price ($) <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-ink/45 font-normal">Set lower than sum of courses to give a discount</span>
              </label>
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={formData.bundlePrice}
                    onChange={(e) => setFormData({ ...formData, bundlePrice: parseFloat(e.target.value) || 0 })}
                    placeholder="249.99"
                    min="0"
                    step="0.01"
                    leftIcon={<Package className="w-4 h-4" />}
                    disabled={isLoading}
                  />
                  {errors.bundlePrice && <p className="mt-1 text-sm text-red-500">{errors.bundlePrice}</p>}
                </div>

                {/* Live discount preview */}
                {localSubCourses.length > 0 && (
                  <div className={`flex-shrink-0 px-3 py-2 rounded-xl border text-sm font-semibold min-w-[140px] ${
                    discountPct > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : savings < 0
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-ink/5 border-ink/15 text-ink/60'
                  }`}>
                    {discountPct > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{discountPct}% off</span>
                      </div>
                    ) : savings < 0 ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Price exceeds total</span>
                      </div>
                    ) : (
                      <span>No discount</span>
                    )}
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">
                      Individual: ${individualTotal.toFixed(0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={isBundle ? "Describe what students will learn across all courses in this bundle..." : "Provide a detailed description of the course..."}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-ink/20 bg-white text-ink placeholder:text-ink/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              disabled={isLoading}
            />
            {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
          </div>
        </div>

        {/* WRO Documents toggle */}
        <div className="md:col-span-2">
          <div className={`flex items-center justify-between p-4 rounded-xl border border-ink/10 bg-ink/3 ${formData.wroDocumentsRequired ? 'border-amber-400/40 bg-amber-50/60' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${formData.wroDocumentsRequired ? 'bg-amber-100' : 'bg-ink/8'}`}>
                <Trophy className={`w-4 h-4 ${formData.wroDocumentsRequired ? 'text-amber-600' : 'text-ink/40'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">WRO Documents Required</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Students must upload their government documents
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, wroDocumentsRequired: !formData.wroDocumentsRequired })}
              disabled={isLoading}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none ${formData.wroDocumentsRequired ? 'bg-ink' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.wroDocumentsRequired ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Sub-courses Section (bundle + editing only) ── */}
        {isBundle && isEditing && (
          <div className="border border-ink/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-ink/3 border-b border-ink/8">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-ink/60" />
                <span className="text-sm font-bold text-ink">Sub-courses</span>
                {localSubCourses.length > 0 && (
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {localSubCourses.length}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={openSubCoursePicker}
                disabled={isLoading}
              >
                Link Course
              </Button>
            </div>

            {localSubCourses.length === 0 ? (
              <div className="py-8 text-center text-ink/40">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No sub-courses linked yet.</p>
                <p className="text-xs mt-1">Click "Link Course" to add existing single courses to this bundle.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink/5">
                {localSubCourses.map(sc => (
                  <div key={sc._id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{sc.title}</p>
                      <p className="text-xs text-ink/45 mt-0.5">
                        Individual price: ${sc.price?.toFixed(0) || '0'}
                        {sc.level && <span className="ml-2 capitalize">{sc.level}</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlinkCourse(sc._id)}
                      disabled={subCourseAction === sc._id}
                      className="ml-3 p-1.5 rounded-lg hover:bg-red-50 text-ink/30 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove from bundle"
                    >
                      {subCourseAction === sc._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                ))}

                {/* Pricing summary */}
                <div className="px-4 py-3 bg-ink/2 flex items-center justify-between">
                  <span className="text-xs text-ink/50">Individual total</span>
                  <span className="text-sm font-semibold text-ink">${individualTotal.toFixed(0)}</span>
                </div>
                {bundlePrice > 0 && (
                  <div className={`px-4 py-2.5 flex items-center justify-between ${discountPct > 0 ? 'bg-emerald-50' : ''}`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink">Bundle price</span>
                      {discountPct > 0 && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Save {discountPct}%
                        </span>
                      )}
                    </div>
                    <span className="text-base font-bold text-ink">${bundlePrice.toFixed(0)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Note for new bundles about sub-courses */}
        {isBundle && !isEditing && (
          <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
            <Package className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-violet-700">
              <strong>Next step:</strong> After creating the bundle, open it and click "Link Course" to add existing courses to this bundle.
            </p>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink/10">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : course
              ? (isBundle ? "Update Bundle" : "Update Course")
              : (isBundle ? "Create Bundle" : "Create Course")}
          </Button>
        </div>
      </form>
    </Modal>

    {/* ── Sub-course Picker Modal ── */}
    <Modal
      isOpen={showSubCoursePicker && !showConfirmDialog}
      onClose={() => setShowSubCoursePicker(false)}
      title="Link Sub-course to Bundle"
      description="Select single courses to add to this bundle"
      size="md"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/35" />
          <input
            type="text"
            value={pickerSearch}
            onChange={e => setPickerSearch(e.target.value)}
            placeholder="Search courses…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-ink/20 outline-none focus:border-emerald-400 text-ink placeholder-ink/40"
            autoFocus
          />
        </div>

        {loadingAvailable ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink/30 mx-auto mb-2" />
            <p className="text-sm text-ink/40">Loading courses…</p>
          </div>
        ) : filteredAvailable.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-ink/15" />
            <p className="text-sm font-medium text-ink/50">
              {pickerSearch ? 'No matching courses' : 'No available courses'}
            </p>
            <p className="text-xs text-ink/35 mt-1">
              Only single-type courses not yet assigned to any bundle appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-ink/5 max-h-[360px] overflow-y-auto rounded-xl border border-ink/10">
            {filteredAvailable.map(c => (
              <div key={c._id} className="flex items-center justify-between px-4 py-3 hover:bg-ink/2 transition-colors">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-semibold text-ink truncate">{c.title}</p>
                  <p className="text-xs text-ink/45 mt-0.5">
                    ${c.price?.toFixed(0) || '0'} · {c.category}
                    {c.level && <span className="ml-1 capitalize">{c.level}</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleLinkCourse(c._id, c)}
                  disabled={subCourseAction === c._id}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {subCourseAction === c._id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Link2 className="w-3 h-3" />
                  }
                  Link
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => setShowSubCoursePicker(false)}>
            Done
          </Button>
        </div>
      </div>
    </Modal>

    {/* Confirmation Dialog */}
    <Modal
      isOpen={showConfirmDialog}
      onClose={() => setShowConfirmDialog(false)}
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
          <Button type="button" variant="ghost" onClick={() => setShowConfirmDialog(false)}>
            Continue Editing
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => { setShowConfirmDialog(false); onClose(); }}
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
