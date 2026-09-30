/**
 * ResourceCard Component
 * Display individual PDF resource with assignment info
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Edit3,
  Trash2,
  FileText,
  Calendar,
  Users,
  BookOpen,
  AlertCircle,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../ui";
import type { Resource } from "../../types/resource.types";

interface ResourceCardProps {
  resource: Resource;
  onView: (resource: Resource) => void;
  onEditAssignments: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  onRename: (resourceId: string, newTitle: string) => Promise<boolean>;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onView,
  onEditAssignments,
  onDelete,
  onRename,
}) => {
  // Defensive checks
  if (!resource || !resource._id || !resource.title) {
    return null;
  }

  const hasAssignments =
    resource.assignments && resource.assignments.groupCount > 0;
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(resource.title);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === resource.title) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const ok = await onRename(resource._id, trimmed);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setIsEditing(false);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-ink/10 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="p-6 border-b border-ink/10">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    className="flex-1 min-w-0 text-base font-semibold text-ink border border-ink/30 rounded-lg px-2 py-1 focus:outline-none focus:border-ink/60"
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-1 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="p-1 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/title">
                  <h3
                    className="font-semibold text-ink text-lg truncate"
                    title={resource.title}
                  >
                    {resource.title}
                  </h3>
                  <button
                    onClick={handleStartEdit}
                    className="opacity-0 group-hover/title:opacity-100 p-1 rounded-md text-ink/40 hover:text-ink hover:bg-ink/5 transition-all"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-ink/60 mt-1 line-clamp-2">
                {resource.description || "No description"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2 text-sm">
          <BookOpen className="w-4 h-4 text-ink/40" />
          <span className="text-ink/80">
            {resource.courseId &&
            typeof resource.courseId === "object" &&
            resource.courseId.title
              ? `${resource.courseId.title}${resource.courseId.level ? ` — ${resource.courseId.level}` : ""}`
              : "Deleted Course"}
          </span>
        </div>

        {/* File Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-ink/40" />
            <span className="text-ink/60">
              {resource.createdAt
                ? new Date(resource.createdAt).toLocaleDateString()
                : "Unknown date"}
            </span>
          </div>
          <span className="text-ink/60">
            {resource.fileSize
              ? (resource.fileSize / 1024 / 1024).toFixed(2)
              : "0.00"}{" "}
            MB
          </span>
        </div>

        {/* Assignment Status */}
        {hasAssignments ? (
          <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
            {/* Summary row — clickable to expand */}
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between p-3 hover:bg-green-100/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">
                  {resource.assignments?.groupCount || 0}{" "}
                  {resource.assignments?.groupCount === 1 ? "Group" : "Groups"}{" "}
                  &middot; {resource.assignments?.sessionCount || 0}{" "}
                  {resource.assignments?.sessionCount === 1
                    ? "Session"
                    : "Sessions"}
                </span>
              </div>
              {showDetails ? (
                <ChevronUp className="w-4 h-4 text-green-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-green-600" />
              )}
            </button>

            {/* Detailed breakdown */}
            <AnimatePresence initial={false}>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-green-200 divide-y divide-green-100">
                    {resource.assignments?.details?.map((detail) => (
                      <div key={detail.groupId} className="px-3 py-2">
                        <p className="text-xs font-semibold text-green-800 mb-1">
                          {detail.groupName || "Unknown Group"}
                        </p>
                        <ul className="space-y-0.5">
                          {detail.sessions?.map((s) => (
                            <li
                              key={s.sessionId}
                              className="flex items-center gap-1.5 text-xs text-green-700"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                              <span className="truncate">
                                {s.title ||
                                  `Session #${s.sessionNumber || "Unknown"}`}
                                {s.scheduledDate && (
                                  <span className="text-green-500 ml-1">
                                    ·{" "}
                                    {(() => {
                                      try {
                                        return new Date(
                                          s.scheduledDate,
                                        ).toLocaleDateString();
                                      } catch {
                                        return "Invalid date";
                                      }
                                    })()}
                                  </span>
                                )}
                              </span>
                            </li>
                          )) || []}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-900">Not assigned yet</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eye className="w-4 h-4" />}
          onClick={() => onView(resource)}
          className="flex-1"
        >
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Edit3 className="w-4 h-4" />}
          onClick={() => onEditAssignments(resource)}
          className="flex-1"
        >
          {hasAssignments ? "Edit" : "Assign"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(resource)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
