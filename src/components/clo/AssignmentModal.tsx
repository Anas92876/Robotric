/**
 * AssignmentModal — two-step wizard
 * Step 1: pick groups (card grid)
 * Step 2: pick sessions per group (no nested scrolling)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Check, AlertCircle, Loader,
  ArrowRight, ArrowLeft, Calendar,
} from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { useResourceAssignment } from '../../hooks/trainer/useResourceAssignment';
import type { Resource } from '../../types/resource.types';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onSuccess: () => void;
  courses: Array<{
    _id: string;
    title: string;
    level?: string;
    type?: 'single' | 'bundle';
    bundleCourses?: Array<{ _id: string }>;
  }>;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen, onClose, resource, onSuccess, courses,
}) => {
  const initialCourseId = resource
    ? (typeof resource.courseId === 'string'
      ? resource.courseId
      : (resource.courseId?._id ?? ''))
    : '';

  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  const [step, setStep] = useState<1 | 2>(1);

  const resourceId = resource?._id ?? '';
  const {
    selectedGroups, allGroups, groupSessions,
    loadingGroups, loadingSessions, assigning, error, canSave,
    toggleGroup, toggleSession, selectAllSessionsForGroup, clearSessionsForGroup,
    assignResource, getAssignmentSummary,
  } = useResourceAssignment(resourceId, selectedCourseId, courses);

  // Reset to step 1 every time the modal opens
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  if (!resource) return null;

  const summary = getAssignmentSummary();
  const selectedGroupIds = Array.from(selectedGroups.keys());

  const handleSubmit = async () => {
    const success = await assignResource();
    if (success) {
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    }
  };

  // ─── Step 1: Group picker ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col flex-1 min-h-0"
    >
      <p className="text-sm text-[#003300]/55 mb-4 flex-shrink-0">
        Click one or more groups. You'll choose specific sessions in the next step.
      </p>

      {loadingGroups ? (
        <div className="flex items-center justify-center flex-1 py-16 text-[#003300]/40">
          <Loader className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading groups…</span>
        </div>
      ) : allGroups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#003300]/40">
          <Users className="w-14 h-14 mb-3 opacity-30" />
          <p className="text-sm">No groups found for this course.</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
            {allGroups.map((group) => {
              const isSelected = selectedGroups.has(group._id);
              return (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isSelected
                      ? 'border-primary bg-primary/6 shadow-md shadow-primary/10'
                      : 'border-[#003300]/10 bg-white hover:border-[#003300]/25 hover:shadow-sm'
                  }`}
                >
                  {/* Selected badge */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                    isSelected ? 'bg-primary' : 'bg-[#003300]/8'
                  }`}>
                    <Users className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#003300]/50'}`} />
                  </div>

                  <h3 className="font-bold text-[#003300] text-sm leading-snug mb-1 pr-8">{group.name}</h3>
                  <p className="text-xs text-[#003300]/50 mb-3 truncate">
                    {group.trainerId?.name ?? 'No trainer'}
                  </p>

                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-[#003300]/8 text-[#003300]/60'
                  }`}>
                    {group.students?.length ?? 0} student{(group.students?.length ?? 0) !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#003300]/10 mt-4 flex-shrink-0">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          type="button"
          disabled={selectedGroupIds.length === 0}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => setStep(2)}
        >
          Next: Sessions
          {selectedGroupIds.length > 0 && (
            <span className="ml-1 opacity-80">
              ({selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? 's' : ''})
            </span>
          )}
        </Button>
      </div>
    </motion.div>
  );

  // ─── Step 2: Session picker ─────────────────────────────────────────────────
  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col flex-1 min-h-0"
    >
      <p className="text-sm text-[#003300]/55 mb-4 flex-shrink-0">
        Choose which sessions students can access this file in. Use <strong>Select All</strong> for a quick pick.
      </p>

      {/* Groups + sessions — single scroll, no nesting */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5">
        {selectedGroupIds.map((groupId) => {
          const group = allGroups.find((g) => g._id === groupId);
          if (!group) return null;
          const rawSessions = groupSessions.get(groupId);
          const sessions = Array.isArray(rawSessions) ? rawSessions : [];
          const selectedGroupData = selectedGroups.get(groupId);
          const isLoadingSessions = loadingSessions.get(groupId) ?? false;
          const selectedCount = selectedGroupData?.selectedSessionIds.size ?? 0;

          return (
            <div key={groupId} className="border border-[#003300]/12 rounded-2xl overflow-hidden">
              {/* Group section header */}
              <div className="px-5 py-4 bg-gradient-to-r from-[#003300]/5 to-transparent border-b border-[#003300]/10">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#003300] truncate">{group.name}</p>
                      <p className="text-xs text-[#003300]/50">
                        {group.trainerId?.name ?? 'No trainer'} · {group.students?.length ?? 0} students
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isLoadingSessions && sessions.length > 0 && (
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        selectedCount > 0 ? 'bg-primary/12 text-primary' : 'bg-[#003300]/8 text-[#003300]/50'
                      }`}>
                        {selectedCount}/{sessions.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => selectAllSessionsForGroup(groupId)}
                      className="text-xs font-semibold text-primary border border-primary/30 px-3 py-2 rounded-xl hover:bg-primary/8 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => clearSessionsForGroup(groupId)}
                      className="text-xs font-semibold text-[#003300]/50 border border-[#003300]/15 px-3 py-2 rounded-xl hover:bg-[#003300]/5 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="p-4">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-10 text-[#003300]/40">
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm">Loading sessions…</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-10 text-[#003300]/40">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-35" />
                    <p className="text-sm">No sessions for this group yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {sessions.map((session) => {
                      const sid = String(session._id);
                      const isSessionSelected = selectedGroupData?.selectedSessionIds.has(sid) ?? false;
                      return (
                        <div
                          key={sid}
                          role="checkbox"
                          aria-checked={isSessionSelected}
                          tabIndex={0}
                          onClick={() => toggleSession(groupId, sid)}
                          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSession(groupId, sid); } }}
                          className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer select-none transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                            isSessionSelected
                              ? 'bg-primary/8 border-2 border-primary/30'
                              : 'border-2 border-[#003300]/8 bg-white hover:border-primary/20 hover:bg-[#003300]/2'
                          }`}
                        >
                          {/* Visual checkbox — no hidden input */}
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSessionSelected ? 'border-primary bg-primary' : 'border-[#003300]/25'
                            }`}
                          >
                            {isSessionSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#003300] truncate">{session.title}</p>
                            {session.scheduledDate && (
                              <p className="text-xs text-[#003300]/45 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                {new Date(session.scheduledDate).toLocaleDateString('en-US', {
                                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#003300]/10 mt-4 flex-shrink-0 flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-2 text-sm font-medium text-[#003300]/60 hover:text-[#003300] transition-colors px-3 py-2 rounded-xl hover:bg-[#003300]/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Groups
        </button>

        <div className="flex items-center gap-3">
          {summary.totalSessions > 0 && (
            <span className="text-sm text-[#003300]/50">
              {summary.totalSessions} session{summary.totalSessions !== 1 ? 's' : ''} · {summary.totalGroups} group{summary.totalGroups !== 1 ? 's' : ''} · ~{summary.totalStudents} students
            </span>
          )}
          <Button
            variant="primary"
            type="button"
            disabled={assigning || !canSave}
            onClick={handleSubmit}
            leftIcon={assigning ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          >
            {assigning ? 'Assigning…' : 'Assign Resource'}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  const currentCourseName = courses.find((c) => c._id === selectedCourseId)?.title ?? '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      closeOnOverlayClick={false}
      title="Assign to Groups & Sessions"
      description={resource.title}
    >
      {/* Outer container: defines the max height so inner flex-1 children can scroll */}
      <div className="flex flex-col overflow-hidden" style={{ maxHeight: 'min(82vh, 780px)' }}>

        {/* ── Top bar: step indicator + course selector ── */}
        <div className="flex items-center gap-3 mb-5 flex-shrink-0 flex-wrap">
          {/* Step pills */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              step === 1 ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                step === 1 ? 'bg-white/25' : 'bg-primary/20'
              }`}>1</span>
              Groups
              {selectedGroupIds.length > 0 && step === 2 && (
                <span className="ml-0.5 opacity-70">({selectedGroupIds.length})</span>
              )}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-[#003300]/25" />
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              step === 2 ? 'bg-primary text-white' : 'bg-[#003300]/8 text-[#003300]/45'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                step === 2 ? 'bg-white/25' : 'bg-[#003300]/15'
              }`}>2</span>
              Sessions
            </span>
          </div>

          {/* Course selector — compact, pushed right */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[#003300]/45 hidden sm:inline">Course:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="text-xs py-1.5 pl-3 pr-7 rounded-lg border border-[#003300]/15 bg-[#003300]/3 text-[#003300] focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all max-w-[200px] truncate"
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}{c.level ? ` — ${c.level}` : ''}
                </option>
              ))}
            </select>
            {selectedCourseId !== initialCourseId && (
              <Badge variant="warning" size="sm">Changed</Badge>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex-shrink-0 mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Step content (fills remaining height and scrolls) ── */}
        <AnimatePresence mode="wait">
          {step === 1 ? renderStep1() : renderStep2()}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
