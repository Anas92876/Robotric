/**
 * BundleEnrollmentModal
 *
 * 4-step form for enrolling a student in a Course Bundle:
 * Step 1 — Select student
 * Step 2 — Select bundle + Full / Partial mode
 * Step 3 — Group selection per sub-course
 * Step 4 — Payment (bundle price or partial sum)
 */

import React, { useState, useEffect } from 'react';
import {
  Package, AlertTriangle, CheckCircle, Loader2,
  ChevronRight, Search, Layers, TrendingDown, X
} from 'lucide-react';
import { Modal, Button } from '../ui';
import { api } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubCourse {
  _id: string;
  title: string;
  price: number;
  level?: string;
  status: string;
}

interface BundleCourse {
  _id: string;
  title: string;
  description?: string;
  bundlePrice: number;
  bundleCourses: SubCourse[];
  category: string;
  level?: string;
  status: string;
  stats?: { discountPct?: number; individualTotal?: number };
}

interface AvailableGroup {
  _id: string;
  name: string;
  maxStudents: number;
  students: any[];
  schedule?: any[];
  startDate?: string;
  trainerId?: { name: string };
}

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface InstallmentRow {
  amount: string;
  dueDate: string;
}

interface GroupSelection {
  courseId: string;
  groupId: string;
}

interface BundleEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BundleEnrollmentModal: React.FC<BundleEnrollmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Step 1: Student
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Step 2: Bundle + mode
  const [bundles, setBundles] = useState<BundleCourse[]>([]);
  const [bundleId, setBundleId] = useState('');
  const [enrollFull, setEnrollFull] = useState(true);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [loadingBundles, setLoadingBundles] = useState(false);

  // Step 3: Groups per sub-course
  const [groupsBySubCourse, setGroupsBySubCourse] = useState<Record<string, AvailableGroup[]>>({});
  const [groupSelections, setGroupSelections] = useState<GroupSelection[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Step 4: Payment
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setStudentId(''); setStudentSearch('');
      setBundleId(''); setEnrollFull(true); setSelectedSubIds([]);
      setGroupSelections([]);
      setDiscount('0'); setNotes(''); setInstallments([]);
      setGlobalError(null);
      loadStudents();
      loadBundles();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadStudents = async (search?: string) => {
    setLoadingStudents(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/reception/enrollments/available-students${params}`);
      setStudents(res.data.data || []);
    } catch { setStudents([]); } finally { setLoadingStudents(false); }
  };

  const loadBundles = async () => {
    setLoadingBundles(true);
    try {
      // Use reception-accessible endpoint with type=bundle; pass all=true so draft bundles show too
      const res = await api.get('/reception/enrollments/available-courses?type=bundle&all=true');
      const all: BundleCourse[] = (res.data.data || []).filter((c: any) => c.type === 'bundle' && c.status !== 'archived');
      setBundles(all);
    } catch { setBundles([]); } finally { setLoadingBundles(false); }
  };

  const loadGroupsForSubCourses = async (courseIds: string[]) => {
    setLoadingGroups(true);
    const map: Record<string, AvailableGroup[]> = {};
    await Promise.all(courseIds.map(async (cid) => {
      try {
        const res = await api.get(`/reception/enrollments/available-groups/${cid}`);
        map[cid] = res.data.data || [];
      } catch { map[cid] = []; }
    }));
    setGroupsBySubCourse(map);
    setLoadingGroups(false);
  };

  // Derived
  const selectedBundle = bundles.find(b => b._id === bundleId);
  const subCoursesToEnroll = selectedBundle
    ? (enrollFull ? selectedBundle.bundleCourses : selectedBundle.bundleCourses.filter(sc => selectedSubIds.includes(sc._id)))
    : [];

  const discountNum = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const basePrice = enrollFull
    ? (selectedBundle?.bundlePrice || 0)
    : subCoursesToEnroll.reduce((s, sc) => s + (sc.price || 0), 0);
  const totalAfterDiscount = Math.round((basePrice - basePrice * (discountNum / 100)) * 100) / 100;
  const individualTotal = selectedBundle?.bundleCourses.reduce((s, sc) => s + (sc.price || 0), 0) || 0;
  const savings = enrollFull && selectedBundle ? individualTotal - (selectedBundle.bundlePrice || 0) : 0;
  const savingsPct = individualTotal > 0 && savings > 0 ? Math.round((savings / individualTotal) * 100) : 0;

  // Steps navigation
  const canGoNext = () => {
    if (step === 1) return !!studentId;
    if (step === 2) return !!bundleId && (enrollFull || selectedSubIds.length > 0);
    if (step === 3) return subCoursesToEnroll.every(sc => groupSelections.find(g => g.courseId === sc._id)?.groupId);
    return true;
  };

  const goNext = async () => {
    if (step === 2 && bundleId) {
      // Load groups for the selected sub-courses before moving to step 3
      await loadGroupsForSubCourses(subCoursesToEnroll.map(sc => sc._id));
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleGroupSelect = (courseId: string, groupId: string) => {
    setGroupSelections(prev => {
      const without = prev.filter(g => g.courseId !== courseId);
      return groupId ? [...without, { courseId, groupId }] : without;
    });
  };

  const addInstallment = () => setInstallments(prev => [...prev, { amount: '', dueDate: '' }]);
  const removeInstallment = (i: number) => setInstallments(prev => prev.filter((_, idx) => idx !== i));
  const updateInstallment = (i: number, field: keyof InstallmentRow, val: string) => {
    setInstallments(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setGlobalError(null);
    try {
      const installmentsPayload = installments.length
        ? installments.map(i => ({ amount: parseFloat(i.amount), dueDate: new Date(i.dueDate).toISOString() }))
        : undefined;

      await api.post('/reception/enrollments/bundle', {
        studentId,
        bundleId,
        enrollFull,
        selectedCourseIds: enrollFull ? [] : selectedSubIds,
        groupSelections,
        discount: discountNum,
        notes: notes || undefined,
        installments: installmentsPayload,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Enrollment failed';
      setGlobalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedStudent = students.find(s => s._id === studentId);
  const selectedBundleObj = bundles.find(b => b._id === bundleId);

  // ─── Render ───────────────────────────────────────────────────────────────

  const stepLabels = ['Student', 'Bundle', 'Groups', 'Payment'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bundle Enrollment"
      description={`Step ${step} of 4 — ${stepLabels[step - 1]}`}
      size="lg"
      closeOnOverlayClick={false}
    >
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i + 1 === step ? 'bg-violet-600 text-white shadow' :
                i + 1 < step ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${i + 1 === step ? 'text-violet-600' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < 3 && <div className={`flex-1 h-0.5 mb-3 ${i + 1 < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Error banner */}
      {globalError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 flex-1">{globalError}</p>
          <button onClick={() => setGlobalError(null)}><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}

      {/* ── Step 1: Select Student ── */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#003300] mb-2">Select the student to enroll</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={studentSearch}
              onChange={e => { setStudentSearch(e.target.value); loadStudents(e.target.value); }}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400 placeholder-gray-400"
            />
          </div>
          {loadingStudents ? (
            <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
              {filteredStudents.map(s => (
                <button
                  key={s._id}
                  type="button"
                  onClick={() => setStudentId(s._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-50 transition-colors ${studentId === s._id ? 'bg-violet-50' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${studentId === s._id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#003300] truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                  </div>
                  {studentId === s._id && <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-sm">No students found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Select Bundle + Mode ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Student summary */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-700">{selectedStudent?.name}</span>
          </div>

          <p className="text-sm font-semibold text-[#003300]">Select a bundle to enroll in</p>

          {loadingBundles ? (
            <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></div>
          ) : bundles.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No bundles available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bundles.map(b => (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => { setBundleId(b._id); setSelectedSubIds([]); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    bundleId === b._id
                      ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-300'
                      : 'border-gray-200 hover:border-violet-200 hover:bg-violet-50/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#003300] truncate">{b.title}</p>
                    <p className="text-xs text-gray-400">{b.bundleCourses?.length || 0} courses · ${b.bundlePrice}</p>
                  </div>
                  {bundleId === b._id && <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Bundle details + mode selector */}
          {selectedBundleObj && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              {/* Full vs Partial toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEnrollFull(true); setSelectedSubIds([]); }}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    enrollFull ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:border-violet-300'
                  }`}
                >
                  Full Bundle — ${selectedBundleObj.bundlePrice}
                  {savingsPct > 0 && <span className="ml-1.5 text-emerald-300 text-xs">Save {savingsPct}%</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollFull(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    !enrollFull ? 'bg-violet-600 text-white border-violet-600' : 'border-gray-200 text-gray-500 hover:border-violet-300'
                  }`}
                >
                  Select Courses
                </button>
              </div>

              {/* Sub-courses list */}
              {!enrollFull && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedBundleObj.bundleCourses.map(sc => (
                    <label
                      key={sc._id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedSubIds.includes(sc._id) ? 'bg-violet-50 border-violet-300' : 'border-gray-100 hover:border-violet-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubIds.includes(sc._id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedSubIds(p => [...p, sc._id]);
                          else setSelectedSubIds(p => p.filter(id => id !== sc._id));
                        }}
                        className="accent-violet-600 w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#003300] truncate">{sc.title}</p>
                        <p className="text-xs text-gray-400">${sc.price} individually · {sc.level}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Pricing summary */}
              {enrollFull && savingsPct > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <TrendingDown className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs text-emerald-700">
                    Student saves ${savings.toFixed(0)} vs buying courses individually (${individualTotal} individual total)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Group Selection ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 rounded-xl border border-violet-200">
            <Layers className="w-4 h-4 text-violet-500 flex-shrink-0" />
            <span className="text-sm font-medium text-violet-700">
              {enrollFull ? 'Full Bundle' : `${subCoursesToEnroll.length} selected courses`} — {selectedBundleObj?.title}
            </span>
          </div>

          <p className="text-sm font-semibold text-[#003300]">Select a group for each sub-course</p>

          {loadingGroups ? (
            <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin text-violet-400 mx-auto" /></div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {subCoursesToEnroll.map(sc => {
                const groups = groupsBySubCourse[sc._id] || [];
                const selectedGroupId = groupSelections.find(g => g.courseId === sc._id)?.groupId || '';
                return (
                  <div key={sc._id} className="border border-gray-200 rounded-xl p-3">
                    <p className="text-sm font-semibold text-[#003300] mb-2">{sc.title}</p>
                    {groups.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No active groups for this course</p>
                    ) : (
                      <div className="relative">
                        <select
                          value={selectedGroupId}
                          onChange={e => handleGroupSelect(sc._id, e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400 text-[#003300]"
                        >
                          <option value="">— Select a group —</option>
                          {groups.map(g => (
                            <option key={g._id} value={g._id}>
                              {g.name}
                              {g.trainerId?.name ? ` · ${g.trainerId.name}` : ''}
                              {` · ${g.students?.length || 0}/${g.maxStudents} students`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Payment ── */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#003300]/60">Student</span>
              <span className="font-semibold text-[#003300]">{selectedStudent?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#003300]/60">Bundle</span>
              <span className="font-semibold text-[#003300]">{selectedBundleObj?.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#003300]/60">Mode</span>
              <span className="font-semibold text-violet-700">{enrollFull ? 'Full Bundle' : `${subCoursesToEnroll.length} courses`}</span>
            </div>
            <div className="border-t border-violet-200 pt-2 flex justify-between">
              <span className="text-sm font-bold text-[#003300]">Base Price</span>
              <span className="text-lg font-bold text-violet-700">${basePrice.toFixed(0)}</span>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-semibold text-[#003300] mb-1">Discount (%)</label>
            <div className="relative">
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                min="0" max="100" step="1"
                className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400 text-[#003300]"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>

          {/* Total after discount */}
          {discountNum > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-sm font-medium text-emerald-700">Total after {discountNum}% discount</span>
              <span className="text-lg font-bold text-emerald-700">${totalAfterDiscount.toFixed(0)}</span>
            </div>
          )}

          {/* Installments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-[#003300]">Payment Schedule</label>
              <button
                type="button"
                onClick={addInstallment}
                className="text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                + Add installment
              </button>
            </div>
            {installments.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-1">No installments — full amount due immediately on enrollment.</p>
            ) : (
              <div className="space-y-2">
                {installments.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Amount ($)"
                      value={row.amount}
                      onChange={e => updateInstallment(i, 'amount', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400"
                    />
                    <input
                      type="date"
                      value={row.dueDate}
                      onChange={e => updateInstallment(i, 'dueDate', e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400"
                    />
                    <button type="button" onClick={() => removeInstallment(i)} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-[#003300] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this enrollment…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-violet-400 text-[#003300] placeholder-gray-400 resize-none"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-5 border-t border-gray-100 mt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
          disabled={isSubmitting}
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </Button>

        {step < 4 ? (
          <Button
            type="button"
            variant="primary"
            onClick={goNext}
            disabled={!canGoNext()}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Continue <ChevronRight className="w-4 h-4 ml-1 inline" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px]"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> Enrolling…</>
              : 'Confirm Enrollment'
            }
          </Button>
        )}
      </div>
    </Modal>
  );
};

export default BundleEnrollmentModal;
