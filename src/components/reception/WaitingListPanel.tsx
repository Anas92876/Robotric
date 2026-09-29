/**
 * WaitingListPanel
 *
 * Shows all leads with status='waiting', grouped with their course interest and deposit.
 * Each row has an "Enroll" button that opens the EnrollFromWaitingModal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Phone, BookOpen, DollarSign, Users, RefreshCw, UserCheck, Filter } from 'lucide-react';
import { Button, Badge, useToast } from '../ui';
import { EnrollFromWaitingModal } from './EnrollFromWaitingModal';
import { api } from '../../lib/api';

interface WaitingLead {
  _id: string;
  fullName: string;
  englishName?: string;
  mobileNumber: string;
  interestField?: string;
  createdAt: string;
  convertedToStudent?: { _id: string; name: string; email: string };
  waitingInfo?: {
    courseId?: { _id: string; title: string; price: number };
    depositAmount?: number;
    depositPaidAt?: string;
    depositMethod?: string;
    depositNotes?: string;
  };
}

interface Course {
  _id: string;
  title: string;
  price: number;
}

export const WaitingListPanel: React.FC = () => {
  const toast = useToast();
  const [leads, setLeads] = useState<WaitingLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [enrollTarget, setEnrollTarget] = useState<WaitingLead | null>(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const fetchWaiting = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = courseFilter ? `?courseId=${courseFilter}` : '';
      const res = await api.get(`/reception/leads/waiting${params}`);
      setLeads(res.data.leads || []);
    } catch {
      toast.error('Error', 'Failed to load waiting list');
    } finally {
      setIsLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => {
    api.get('/reception/enrollments/available-courses?all=true')
      .then(res => setCourses(res.data.data || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchWaiting();
  }, [fetchWaiting]);

  const handleEnrollSuccess = () => {
    setIsEnrollModalOpen(false);
    setEnrollTarget(null);
    fetchWaiting();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
          <Clock className="w-4 h-4" />
          {leads.length} waiting {leads.length === 1 ? 'student' : 'students'}
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* Course filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-700 focus:outline-none focus:border-[#003300] appearance-none cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchWaiting}
            className="text-zinc-500 hover:text-zinc-700"
          />
        </div>
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="font-semibold text-zinc-700 mb-1">No waiting students</h3>
          <p className="text-sm text-zinc-500">
            {courseFilter ? 'No waiting students for this course.' : 'Set leads as "Waiting" from the Lead Management page.'}
          </p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {leads.map(lead => {
          const course = lead.waitingInfo?.courseId;
          const deposit = lead.waitingInfo?.depositAmount || 0;
          const coursePrice = course?.price || 0;
          const remaining = Math.max(0, coursePrice - deposit);

          return (
            <div
              key={lead._id}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-zinc-200 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold shrink-0">
                {lead.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <p className="font-semibold text-zinc-900 text-sm">{lead.fullName}</p>
                  {lead.englishName && (
                    <span className="text-xs text-zinc-400">({lead.englishName})</span>
                  )}
                  <Badge variant="default" className="text-amber-600 bg-amber-50 border-amber-200 text-xs">
                    ⏳ Waiting
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Phone className="w-3 h-3" />
                    {lead.mobileNumber}
                  </span>

                  {course && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <BookOpen className="w-3 h-3" />
                      {course.title}
                    </span>
                  )}

                  {lead.convertedToStudent && (
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Users className="w-3 h-3" />
                      {lead.convertedToStudent.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Deposit info */}
              <div className="text-right shrink-0 hidden sm:block">
                {deposit > 0 ? (
                  <>
                    <p className="text-xs text-zinc-500">Deposit paid</p>
                    <p className="text-sm font-bold text-green-600">${deposit.toFixed(2)}</p>
                    {coursePrice > 0 && (
                      <p className="text-xs text-zinc-400">Remaining: ${remaining.toFixed(2)}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-500">No deposit</p>
                    {coursePrice > 0 && (
                      <p className="text-sm font-semibold text-zinc-700">${coursePrice.toFixed(2)}</p>
                    )}
                  </>
                )}
                <p className="text-xs text-zinc-400 mt-0.5">Since {formatDate(lead.createdAt)}</p>
              </div>

              {/* Enroll button */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={() => {
                  setEnrollTarget(lead);
                  setIsEnrollModalOpen(true);
                }}
                className="shrink-0 bg-[#003300] hover:bg-[#004400] text-white"
              >
                Enroll
              </Button>
            </div>
          );
        })}
      </div>

      {/* Enroll modal */}
      {enrollTarget && (
        <EnrollFromWaitingModal
          isOpen={isEnrollModalOpen}
          onClose={() => {
            setIsEnrollModalOpen(false);
            setEnrollTarget(null);
          }}
          lead={enrollTarget}
          onSuccess={handleEnrollSuccess}
        />
      )}
    </div>
  );
};
