import { useState, useEffect, useRef } from "react";
import { User, Mail, Lock, Phone, FileText, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Input } from "../ui";

interface TrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TrainerFormData) => Promise<void>;
  trainer?: Trainer | null;
  isLoading?: boolean;
}

export interface TrainerFormData {
  name: string;
  email: string;
  password?: string;
  profile?: {
    phone?: string;
    bio?: string;
    specialization?: string;
  };
}

interface Trainer {
  _id: string;
  name: string;
  email: string;
  profile?: {
    phone?: string;
    bio?: string;
    specialization?: string;
    isActive?: boolean;
  };
}

export default function TrainerModal({
  isOpen,
  onClose,
  onSubmit,
  trainer,
  isLoading = false,
}: TrainerModalProps) {
  const [formData, setFormData] = useState<TrainerFormData>({
    name: "",
    email: "",
    password: "",
    profile: {
      phone: "",
      bio: "",
      specialization: "",
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const initialFormDataRef = useRef<TrainerFormData | null>(null);

  // Reset form when modal opens/closes or trainer changes
  useEffect(() => {
    if (isOpen) {
      let initialData: TrainerFormData;
      if (trainer) {
        // Editing existing trainer
        initialData = {
          name: trainer.name,
          email: trainer.email,
          password: "", // Don't populate password for security
          profile: {
            phone: trainer.profile?.phone || "",
            bio: trainer.profile?.bio || "",
            specialization: trainer.profile?.specialization || "",
          },
        };
      } else {
        // Creating new trainer
        initialData = {
          name: "",
          email: "",
          password: "",
          profile: {
            phone: "",
            bio: "",
            specialization: "",
          },
        };
      }
      setFormData(initialData);
      initialFormDataRef.current = initialData;
      setErrors({});
      setShowConfirmDialog(false);
    }
  }, [isOpen, trainer]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // Password is required only when creating new trainer
    if (!trainer && !formData.password) {
      newErrors.password = "Password is required for new trainers";
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const hasUnsavedChanges = (): boolean => {
    if (!initialFormDataRef.current) return false;
    const initial = initialFormDataRef.current;
    const current = formData;
    
    return (
      initial.name !== current.name ||
      initial.email !== current.email ||
      initial.profile?.phone !== current.profile?.phone ||
      initial.profile?.bio !== current.profile?.bio ||
      initial.profile?.specialization !== current.profile?.specialization ||
      (current.password && current.password.trim().length > 0)
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
      // Remove password from update if it's empty
      const submitData = { ...formData };
      if (trainer && !submitData.password) {
        delete submitData.password;
      }

      await onSubmit(submitData);
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
      title={trainer ? "Edit Trainer" : "Add New Trainer"}
      description={
        trainer
          ? "Update trainer information"
          : "Create a new trainer account"
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="John Doe"
            leftIcon={<User className="w-4 h-4" />}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="john.doe@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Password {!trainer && <span className="text-red-500">*</span>}
            {trainer && (
              <span className="text-xs text-[#003300]/60 ml-1">
                (Leave empty to keep current password)
              </span>
            )}
          </label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            placeholder={trainer ? "Enter new password" : "At least 6 characters"}
            leftIcon={<Lock className="w-4 h-4" />}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Phone Number
          </label>
          <Input
            type="tel"
            value={formData.profile?.phone || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                profile: { ...formData.profile, phone: e.target.value },
              })
            }
            placeholder="+1 (555) 123-4567"
            leftIcon={<Phone className="w-4 h-4" />}
            disabled={isLoading}
          />
        </div>

        {/* Specialization */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Specialization
          </label>
          <Input
            type="text"
            value={formData.profile?.specialization || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                profile: {
                  ...formData.profile,
                  specialization: e.target.value,
                },
              })
            }
            placeholder="e.g., Robotics, AI, Programming"
            leftIcon={<FileText className="w-4 h-4" />}
            disabled={isLoading}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-1">
            Bio
          </label>
          <textarea
            value={formData.profile?.bio || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                profile: { ...formData.profile, bio: e.target.value },
              })
            }
            placeholder="Brief description about the trainer..."
            rows={3}
            className="w-full px-4 py-2 rounded-lg border border-[#003300]/20 bg-white text-[#003300] placeholder:text-[#003300]/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#003300]/10">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : trainer
              ? "Update Trainer"
              : "Create Trainer"}
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
            <p className="text-[#003300] font-medium">Are you sure you want to leave?</p>
            <p className="text-sm text-[#003300]/60 mt-1">
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
