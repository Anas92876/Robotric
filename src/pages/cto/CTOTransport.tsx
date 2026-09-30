import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus, DollarSign, TrendingUp, Plus, Edit2,
  CheckCircle, X, Save, RefreshCw, AlertCircle, Star, Trash2, Info,
  MessageSquare, ThumbsDown, ThumbsUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useTransportManagement, type TransportPricing, type DriverRateTier } from '../../hooks/reception/useTransportManagement';

type Tab = 'pricing' | 'earnings' | 'feedback';

const CTOTransport: React.FC = () => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState<Tab>('pricing');
  const hook = useTransportManagement();

  useEffect(() => {
    if (activeTab === 'pricing') hook.fetchPricing();
    else if (activeTab === 'earnings') fetchEarnings();
  }, [activeTab]);

  // ── Earnings state ────────────────────────────────────────────────────────
  const [earnings, setEarnings] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const [e, o] = await Promise.all([
        api.get(`/management/transport/earnings/monthly?year=${year}&month=${month}`),
        api.get(`/management/transport/overview?year=${year}&month=${month}`),
      ]);
      setEarnings(e.data.data);
      setOverview(o.data.data);
    } catch { /* shown via hook error */ }
    finally { setEarningsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'earnings') fetchEarnings();
  }, [year, month]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'pricing',  label: isRTL ? 'الأسعار'   : 'Pricing',  icon: <DollarSign    className="w-4 h-4" /> },
    { id: 'earnings', label: isRTL ? 'الأرباح'   : 'Earnings', icon: <TrendingUp    className="w-4 h-4" /> },
    { id: 'feedback', label: isRTL ? 'التقييمات' : 'Feedback', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-ink px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Bus className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold text-white">
              {isRTL ? 'إدارة التوصيل — الإدارة' : 'Transport Management'}
            </h1>
          </div>
          <p className="text-white/60 text-sm ms-10">
            {isRTL ? 'أسعار الكيلومتر — ملخص الأرباح الشهرية' : 'Per-km rates — Monthly earnings summary'}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all ${
                activeTab === tab.id ? 'bg-ink text-white shadow' : 'text-gray-500 hover:bg-gray-50'
              }`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Error */}
        {hook.error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">{hook.error}</span>
            <button onClick={() => hook.setError(null)} className="ms-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {activeTab === 'pricing' && <PricingTab hook={hook} isRTL={isRTL} />}
            {activeTab === 'earnings' && (
              <EarningsTab
                earnings={earnings} overview={overview} loading={earningsLoading}
                year={year} month={month} setYear={setYear} setMonth={setMonth}
                onRefresh={fetchEarnings} isRTL={isRTL}
              />
            )}
            {activeTab === 'feedback' && <FeedbackTab isRTL={isRTL} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Pricing Tab ──────────────────────────────────────────────────────────────

const EMPTY_TIER: DriverRateTier = { minStudents: 1, maxStudents: null, ratePerKm: 0 };

function resolveRateForCount(count: number, tiers: DriverRateTier[], fallback: number): number {
  const match = tiers.find(t => count >= t.minStudents && (t.maxStudents == null || count <= t.maxStudents));
  return match ? match.ratePerKm : fallback;
}

const PricingTab: React.FC<{ hook: ReturnType<typeof useTransportManagement>; isRTL: boolean }> = ({ hook, isRTL }) => {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<TransportPricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', studentRatePerKm: '', driverRatePerKm: '',
    legMultiplier: '3', currency: 'SYP', notes: '',
  });
  const [tiers, setTiers] = useState<DriverRateTier[]>([]);
  const [tierError, setTierError] = useState<string | null>(null);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', studentRatePerKm: '', driverRatePerKm: '', legMultiplier: '3', currency: 'SYP', notes: '' });
    setTiers([]);
    setTierError(null);
    setShowForm(true);
  };

  const openEdit = (p: TransportPricing) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      studentRatePerKm: String(p.studentRatePerKm),
      driverRatePerKm: String(p.driverRatePerKm),
      legMultiplier: String(p.legMultiplier ?? 3),
      currency: p.currency,
      notes: p.notes || '',
    });
    setTiers(p.driverRateTiers ? p.driverRateTiers.map(t => ({ ...t })) : []);
    setTierError(null);
    setShowForm(true);
  };

  // Tier row operations
  const addTier = () => setTiers(prev => [...prev, { ...EMPTY_TIER }]);

  const updateTier = (i: number, field: keyof DriverRateTier, value: string) => {
    setTiers(prev => prev.map((t, idx) => {
      if (idx !== i) return t;
      if (field === 'maxStudents') return { ...t, maxStudents: value === '' ? null : parseInt(value) || null };
      if (field === 'minStudents') return { ...t, minStudents: parseInt(value) || 1 };
      if (field === 'ratePerKm')   return { ...t, ratePerKm: parseFloat(value) || 0 };
      return t;
    }));
    setTierError(null);
  };

  const removeTier = (i: number) => setTiers(prev => prev.filter((_, idx) => idx !== i));

  const validateTiers = (): string | null => {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.minStudents < 1) return isRTL ? `الصف ${i + 1}: الحد الأدنى يجب أن يكون ≥ 1` : `Tier ${i + 1}: minStudents must be ≥ 1`;
      if (t.ratePerKm < 0)   return isRTL ? `الصف ${i + 1}: السعر يجب أن يكون ≥ 0`     : `Tier ${i + 1}: ratePerKm must be ≥ 0`;
      if (t.maxStudents != null && t.maxStudents < t.minStudents)
        return isRTL ? `الصف ${i + 1}: الحد الأقصى يجب أن يكون ≥ الحد الأدنى` : `Tier ${i + 1}: maxStudents must be ≥ minStudents`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!form.name || !form.studentRatePerKm || !form.driverRatePerKm) return;
    const tierErr = validateTiers();
    if (tierErr) { setTierError(tierErr); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        studentRatePerKm: parseFloat(form.studentRatePerKm),
        driverRatePerKm: parseFloat(form.driverRatePerKm),
        driverRateTiers: tiers,
        legMultiplier: parseFloat(form.legMultiplier) || 3,
        currency: form.currency,
        notes: form.notes,
      };
      if (editTarget) await hook.updatePricing(editTarget._id, payload as any);
      else await hook.createPricing(payload as any);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const activePricing = hook.pricing.find(p => p.isActive);
  const currency = form.currency;

  // Preview: show student fee + driver earnings for 1–5 students at 10 km
  const previewRows = form.studentRatePerKm && form.driverRatePerKm
    ? [1, 2, 3, 4, 5].map(n => ({
        n,
        studentFee: parseFloat(form.studentRatePerKm) * (parseFloat(form.legMultiplier) || 3) * 12 * 10,
        driverRate: resolveRateForCount(n, tiers, parseFloat(form.driverRatePerKm)),
        driverEarnings: resolveRateForCount(n, tiers, parseFloat(form.driverRatePerKm)) * (n * 10),
        fromTier: tiers.some(t => n >= t.minStudents && (t.maxStudents == null || n <= t.maxStudents)),
      }))
    : [];

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{hook.pricing.length} {isRTL ? 'سجل' : 'records'}</p>
        <button
          onClick={() => {
            if (activePricing && !confirm(
              isRTL
                ? `سيتم إلغاء تفعيل "${activePricing.name}" واستبداله. هل تريد المتابعة؟`
                : `This will replace the active pricing "${activePricing.name}". Continue?`
            )) return;
            openCreate();
          }}
          className="flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-xl text-sm font-600 hover:bg-ink-deep transition-colors">
          <Plus className="w-4 h-4" />
          {isRTL ? (activePricing ? 'استبدال السعر الحالي' : 'سعر جديد') : (activePricing ? 'Replace Active Pricing' : 'New Pricing')}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm overflow-hidden">

            <div className="flex items-center justify-between mb-5">
              <h3 className="font-700 text-ink text-base">
                {editTarget ? (isRTL ? 'تعديل السعر' : 'Edit Pricing') : (isRTL ? 'سعر جديد' : 'New Pricing')}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {/* ── Basic fields ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'الاسم' : 'Name'} *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                  placeholder={isRTL ? 'مثال: أسعار مايو 2026' : 'e.g. May 2026 Rate'} />
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'سعر/كم للطالب' : 'Student Rate/km'} *</label>
                <div className="relative">
                  <input type="number" min="0" value={form.studentRatePerKm}
                    onChange={e => setForm(f => ({ ...f, studentRatePerKm: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pe-14 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currency}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{isRTL ? 'ما يدفعه الطالب شهرياً لروبوتريك' : 'Monthly fee student pays Robotrick'}</p>
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'سعر/كم للسائق (احتياطي)' : 'Driver Rate/km (fallback)'} *</label>
                <div className="relative">
                  <input type="number" min="0" value={form.driverRatePerKm}
                    onChange={e => setForm(f => ({ ...f, driverRatePerKm: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pe-14 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currency}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{isRTL ? 'يُستخدم إذا لم تنطبق أي شريحة' : 'Used when no tier matches'}</p>
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'مضاعف الرحلات' : 'Leg Multiplier'}</label>
                <input type="number" min="1" step="0.5" value={form.legMultiplier}
                  onChange={e => setForm(f => ({ ...f, legMultiplier: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
                <p className="text-xs text-gray-400 mt-1">{isRTL ? 'للرسوم الشهرية للطالب فقط' : 'For student monthly fee only'}</p>
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'العملة' : 'Currency'}</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20">
                  <option value="SYP">SYP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
              </div>
            </div>

            {/* ── Driver rate tiers ── */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-700 text-gray-800 text-sm">{isRTL ? 'شرائح سعر السائق حسب عدد الطلاب' : 'Driver Rate Tiers by Student Count'}</h4>
                  <div className="relative group">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute bottom-full mb-1 start-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">
                      {isRTL
                        ? 'يتم تحديد السعر بناءً على عدد الطلاب في الرحلة. إذا لم تنطبق أي شريحة، يُستخدم السعر الاحتياطي.'
                        : 'Rate is picked based on student count in the trip. If no tier matches, the fallback rate is used.'}
                    </div>
                  </div>
                </div>
                <button onClick={addTier}
                  className="flex items-center gap-1.5 text-xs font-600 text-ink border border-ink/30 px-3 py-1.5 rounded-lg hover:bg-ink/5 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  {isRTL ? 'أضف شريحة' : 'Add Tier'}
                </button>
              </div>

              {tiers.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400">
                    {isRTL
                      ? 'لا توجد شرائح — سيُستخدم السعر الاحتياطي لجميع الرحلات'
                      : 'No tiers — fallback rate will apply to all trips'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
                    {[
                      isRTL ? 'من (طلاب)' : 'Min students',
                      isRTL ? 'إلى (طلاب)' : 'Max students',
                      isRTL ? 'السعر/كم' : 'Rate/km',
                      '',
                    ].map((h, i) => (
                      <p key={i} className="text-xs font-600 text-gray-400">{h}</p>
                    ))}
                  </div>
                  {tiers.map((tier, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-center">
                      {/* Min */}
                      <input
                        type="number" min="1" value={tier.minStudents}
                        onChange={e => updateTier(i, 'minStudents', e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ink/20"
                      />
                      {/* Max — empty = unlimited */}
                      <div className="relative">
                        <input
                          type="number" min={tier.minStudents} value={tier.maxStudents ?? ''}
                          onChange={e => updateTier(i, 'maxStudents', e.target.value)}
                          placeholder={isRTL ? '∞' : '∞'}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ink/20"
                        />
                        {tier.maxStudents == null && (
                          <span className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">∞</span>
                        )}
                      </div>
                      {/* Rate */}
                      <div className="relative">
                        <input
                          type="number" min="0" value={tier.ratePerKm}
                          onChange={e => updateTier(i, 'ratePerKm', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 pe-10 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                        />
                        <span className="absolute end-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{currency}</span>
                      </div>
                      {/* Delete */}
                      <button onClick={() => removeTier(i)}
                        className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {tierError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{tierError}</span>
                </div>
              )}
            </div>

            {/* ── Live preview ── */}
            {previewRows.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-5">
                <p className="text-xs font-700 text-gray-500 uppercase tracking-wide mb-3">
                  {isRTL ? 'معاينة — 10 كم، 12 جلسة' : 'Preview — 10 km, 12 sessions'}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-start text-gray-400 font-600 pb-2">{isRTL ? 'طلاب' : 'Students'}</th>
                        <th className="text-start text-gray-400 font-600 pb-2">{isRTL ? 'سعر/كم للسائق' : 'Driver rate/km'}</th>
                        <th className="text-start text-gray-400 font-600 pb-2">{isRTL ? 'أرباح السائق/رحلة' : 'Driver earns/trip'}</th>
                        <th className="text-start text-gray-400 font-600 pb-2">{isRTL ? 'رسوم الطالب/شهر' : 'Student fee/mo'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map(row => (
                        <tr key={row.n} className="border-b border-gray-50">
                          <td className="py-2 font-700 text-gray-800">{row.n}</td>
                          <td className="py-2">
                            <span className={`font-700 ${row.fromTier ? 'text-ink' : 'text-amber-600'}`}>
                              {row.driverRate.toLocaleString()} {currency}
                            </span>
                            {row.fromTier
                              ? <span className="ms-1.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">{isRTL ? 'شريحة' : 'tier'}</span>
                              : <span className="ms-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">{isRTL ? 'احتياطي' : 'fallback'}</span>
                            }
                          </td>
                          <td className="py-2 font-700 text-gray-800">{row.driverEarnings.toLocaleString()} {currency}</td>
                          <td className="py-2 text-gray-600">{row.studentFee.toLocaleString()} {currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {isRTL
                    ? '* أرباح السائق = (كم كل طالب × عدد الطلاب) × السعر/كم للرحلة'
                    : '* Driver earns = total student km × resolved rate/km for that trip'}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-600 hover:bg-gray-50 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSave}
                disabled={saving || !form.name || !form.studentRatePerKm || !form.driverRatePerKm}
                className="flex items-center gap-2 bg-ink text-white px-5 py-2 rounded-xl text-sm font-600 hover:bg-ink-deep disabled:opacity-40 transition-colors">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hook.loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-ink animate-spin" /></div>
      ) : hook.pricing.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <DollarSign className="w-10 h-10 text-gray-300" />
          <p className="text-gray-400 text-sm mt-3">{isRTL ? 'لا توجد أسعار محددة بعد' : 'No pricing records yet'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {hook.pricing.map(p => (
            <div key={p._id} className={`bg-white rounded-2xl border shadow-sm p-5 ${p.isActive ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-gray-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {p.isActive ? <Star className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-700 text-gray-900">{p.name}</p>
                    {p.isActive && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-700">
                        {isRTL ? 'نشط' : 'Active'}
                      </span>
                    )}
                  </div>
                  {/* Base rates */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2 text-xs">
                    <div>
                      <p className="text-gray-400">{isRTL ? 'طالب/كم' : 'Student/km'}</p>
                      <p className="font-700 text-gray-800">{p.studentRatePerKm?.toLocaleString()} {p.currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">{isRTL ? 'سائق/كم (احتياطي)' : 'Driver/km (fallback)'}</p>
                      <p className="font-700 text-gray-800">{p.driverRatePerKm?.toLocaleString()} {p.currency}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">{isRTL ? 'عامل الأرجل' : 'Leg multiplier'}</p>
                      <p className="font-700 text-gray-800">×{p.legMultiplier || 3}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">{isRTL ? 'منذ' : 'Since'}</p>
                      <p className="font-700 text-gray-800">{new Date(p.effectiveFrom || p.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Tiers inline table */}
                  {p.driverRateTiers && p.driverRateTiers.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-600 text-gray-500 mb-1.5">{isRTL ? 'شرائح سعر السائق:' : 'Driver rate tiers:'}</p>
                      <div className="flex flex-wrap gap-2">
                        {p.driverRateTiers.map((t, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-ink/5 border border-ink/10 rounded-lg px-2.5 py-1 text-xs">
                            <span className="font-600 text-ink">
                              {t.minStudents}{t.maxStudents != null ? `–${t.maxStudents}` : '+'} {isRTL ? 'طلاب' : 'students'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-700 text-gray-800">{t.ratePerKm.toLocaleString()} {p.currency}/km</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.notes && <p className="text-xs text-gray-400 mt-2">{p.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(p)}
                    className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {!p.isActive && (
                    <button onClick={() => hook.activatePricing(p._id)}
                      className="flex items-center gap-1 text-xs bg-ink text-white px-3 py-1.5 rounded-lg hover:bg-ink-deep transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {isRTL ? 'تفعيل' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Earnings Tab ─────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const EarningsTab: React.FC<{
  earnings: any; overview: any; loading: boolean;
  year: number; month: number; setYear: (y: number) => void; setMonth: (m: number) => void;
  onRefresh: () => void; isRTL: boolean;
}> = ({ earnings, overview, loading, year, month, setYear, setMonth, onRefresh, isRTL }) => (
  <div className="pb-10">
    {/* Period selector */}
    <div className="flex items-center gap-3 mb-6">
      <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20">
        {(isRTL ? MONTHS_AR : MONTHS).map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select value={year} onChange={e => setYear(parseInt(e.target.value))}
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20">
        {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={onRefresh} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {loading ? (
      <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-ink animate-spin" /></div>
    ) : (
      <>
        {/* Overview cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: isRTL ? 'إيرادات الطلاب' : 'Student Revenue', value: overview.totalStudentRevenue?.toLocaleString(), suffix: 'SYP', color: '#0f1f33' },
              { label: isRTL ? 'تكلفة السائقين' : 'Driver Cost',     value: overview.totalDriverCost?.toLocaleString(),    suffix: 'SYP', color: '#dc2626' },
              { label: isRTL ? 'صافي الربح' : 'Net Profit',          value: overview.netProfit?.toLocaleString(),           suffix: 'SYP', color: overview.netProfit >= 0 ? '#16a34a' : '#dc2626' },
              { label: isRTL ? 'طلاب نشطون' : 'Active Students',     value: overview.activeStudents,                        suffix: '',    color: '#2563eb' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-800" style={{ color: card.color }}>{card.value}</p>
                {card.suffix && <p className="text-xs text-gray-400">{card.suffix}</p>}
                <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Per-driver breakdown */}
        {earnings?.drivers?.length > 0 ? (
          <div className="grid gap-3">
            <p className="text-sm font-700 text-gray-700 mb-1">{isRTL ? 'تفصيل حسب السائق' : 'Per Driver Breakdown'}</p>
            {earnings.drivers.map((d: any) => (
              <div key={d.driverId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-gray-700 font-800 text-sm">{d.driverName?.[0] || '?'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-700 text-gray-900 text-sm">{d.driverName}</p>
                  <p className="text-xs text-gray-400">{d.vehiclePlate || ''} · {d.trips} {isRTL ? 'رحلة' : 'trips'} · {d.students} {isRTL ? 'طالب' : 'students served'}</p>
                </div>
                <div className="text-end">
                  <p className="font-800 text-ink text-sm">{d.earnings?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">SYP</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20 text-center">
            <TrendingUp className="w-10 h-10 text-gray-300" />
            <p className="text-gray-400 text-sm mt-3">
              {isRTL ? 'لا توجد رحلات مكتملة في هذا الشهر' : 'No completed trips this month'}
            </p>
          </div>
        )}
      </>
    )}
  </div>
);

// ── Feedback tab ────────────────────────────────────────────────────────────
//
// Read-only view of per-trip feedback submitted by students. Two columns:
//   1. Aggregate stats (overall avg, per-driver averages, category mix)
//   2. Recent feedback list with filters (driver, rating)
//
// Backend endpoints used:
//   GET /management/transport/feedback/stats
//   GET /management/transport/feedback?driverId=...&minRating=...&maxRating=...

interface FeedbackRow {
  _id: string;
  rating: number;
  comment: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
  student: { _id: string; name: string } | null;
  driver:  { _id: string; name: string } | null;
  trip:    { _id: string; date: string; direction: string; status: string } | null;
}

interface FeedbackStats {
  overall: { avgRating: number | null; count: number };
  byDriver: {
    driverId: string; driverName: string | null;
    avgRating: number | null; count: number;
    lowCount: number; highCount: number;
  }[];
  byCategory: { category: string; count: number }[];
}

const FeedbackTab: React.FC<{ isRTL: boolean }> = ({ isRTL }) => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [rows, setRows]   = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true); // true on first mount so we render a skeleton
  const [error, setError] = useState<string | null>(null);
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [minRating, setMinRating] = useState<number | ''>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (driverFilter) params.set('driverId', driverFilter);
      if (minRating !== '') params.set('minRating', String(minRating));
      params.set('limit', '50');

      const [statsRes, listRes] = await Promise.all([
        api.get('/management/transport/feedback/stats'),
        api.get(`/management/transport/feedback?${params.toString()}`),
      ]);
      setStats(statsRes.data.data);
      // The list endpoint returns { data: { data, page, limit, total } }
      // (one layer of envelope + one layer of pagination). Defensive-read in
      // case the shape changes — we want to render an empty list, not crash.
      const listPayload = listRes.data?.data?.data;
      setRows(Array.isArray(listPayload) ? listPayload : []);
    } catch (e: any) {
      // Surface the error so the user (and we) know WHY the tab is empty,
      // rather than silently showing zero data and "no feedback" messaging.
      const msg = e?.response?.data?.error?.message
        || e?.response?.data?.message
        || e?.message
        || (isRTL ? 'تعذّر تحميل التقييمات' : 'Failed to load feedback');
      setError(`${msg}${e?.response?.status ? ` (HTTP ${e.response.status})` : ''}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [driverFilter, minRating]);

  // Helpful aggregations derived from the stats response. Safe on null.
  const lowTotal  = stats?.byDriver.reduce((s, d) => s + d.lowCount, 0)  ?? 0;
  const highTotal = stats?.byDriver.reduce((s, d) => s + d.highCount, 0) ?? 0;
  const noDataYet = !loading && !error && stats?.overall.count === 0;

  return (
    <div className="space-y-6">
      {/* Error banner — surfaces auth / network / backend failures so the
           CTO doesn't just see empty cards and assume there's no feedback. */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-700 text-red-900 text-sm">
              {isRTL ? 'تعذّر تحميل التقييمات' : 'Could not load feedback'}
            </p>
            <p className="text-xs text-red-700 mt-0.5 break-words">{error}</p>
          </div>
          <button
            onClick={load}
            className="text-xs font-700 text-red-700 hover:text-red-900 underline shrink-0"
          >
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Overall + per-driver averages */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'متوسط التقييم العام' : 'Overall Rating'}
          value={stats?.overall.avgRating != null ? stats.overall.avgRating.toFixed(2) : '—'}
          subtitle={`${stats?.overall.count ?? 0} ${isRTL ? 'تقييم' : 'reviews'}`}
          icon={<Star className="w-5 h-5 text-amber-500" />}
          accent="#fef3c7"
        />
        <StatCard
          title={isRTL ? 'تقييمات سلبية' : 'Low Ratings'}
          value={String(lowTotal)}
          subtitle={isRTL ? '≤ نجمتين' : '≤ 2 stars'}
          icon={<ThumbsDown className="w-5 h-5 text-red-500" />}
          accent="#fee2e2"
        />
        <StatCard
          title={isRTL ? 'تقييمات إيجابية' : 'High Ratings'}
          value={String(highTotal)}
          subtitle={isRTL ? '≥ ٤ نجوم' : '≥ 4 stars'}
          icon={<ThumbsUp className="w-5 h-5 text-green-600" />}
          accent="#dcfce7"
        />
      </div>

      {/* "No feedback in the system yet" state — distinct from "filter returned
           nothing" because the action is different (here: just wait for students
           to submit). Only shown when the backend reachable AND the overall count
           is genuinely zero. */}
      {noDataYet && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-700 text-gray-900">
            {isRTL ? 'لا توجد تقييمات بعد' : 'No feedback yet'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {isRTL
              ? 'ستظهر هنا تقييمات الطلاب بعد إكمال رحلاتهم وإرسال ملاحظاتهم من تطبيق الجوال.'
              : 'Once students complete a trip and submit feedback from the mobile app, their ratings will show up here.'}
          </p>
        </div>
      )}

      {/* Per-driver leaderboard — sorted worst-first so issues stand out */}
      {stats && stats.byDriver.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-700 text-gray-900">
              {isRTL ? 'المتوسط حسب السائق' : 'Per-Driver Average'}
            </h2>
            <p className="text-xs text-gray-400">
              {isRTL ? 'الأسوأ أولاً' : 'Worst first'}
            </p>
          </div>
          <div className="space-y-2">
            {stats.byDriver.map(d => (
              <button
                key={d.driverId}
                onClick={() => setDriverFilter(driverFilter === d.driverId ? '' : d.driverId)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-start ${
                  driverFilter === d.driverId ? 'bg-ink/5 ring-1 ring-ink/20' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-gray-700 font-700 text-xs">{d.driverName?.[0] || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-600 text-gray-900 text-sm truncate">{d.driverName || '—'}</p>
                  <p className="text-xs text-gray-400">
                    {d.count} {isRTL ? 'تقييم' : 'reviews'}
                    {d.lowCount > 0 && <span className="text-red-500"> · {d.lowCount} {isRTL ? 'سلبي' : 'low'}</span>}
                    {d.highCount > 0 && <span className="text-green-600"> · {d.highCount} {isRTL ? 'إيجابي' : 'high'}</span>}
                  </p>
                </div>
                <StarRow value={d.avgRating ?? 0} />
                <span className="text-sm font-700 text-gray-700 w-10 text-end">
                  {d.avgRating != null ? d.avgRating.toFixed(1) : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar + feedback list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="font-700 text-gray-900 flex-1">
            {isRTL ? 'أحدث التقييمات' : 'Recent Feedback'}
          </h2>
          <select
            value={minRating}
            onChange={e => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
          >
            <option value="">{isRTL ? 'كل التقييمات' : 'All ratings'}</option>
            <option value="1">{isRTL ? '⭐ فقط' : '⭐ only'}</option>
            <option value="2">{isRTL ? '⭐⭐ فأكثر' : '⭐⭐ +'}</option>
            <option value="4">{isRTL ? '⭐⭐⭐⭐ فأكثر' : '⭐⭐⭐⭐ +'}</option>
          </select>
          {driverFilter && (
            <button
              onClick={() => setDriverFilter('')}
              className="text-xs text-ink underline"
            >
              {isRTL ? 'إزالة فلتر السائق' : 'Clear driver filter'}
            </button>
          )}
          <button
            onClick={load}
            className="p-2 hover:bg-gray-50 rounded-lg"
            title={isRTL ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-16">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300" />
            <p className="text-gray-400 text-sm mt-3">
              {isRTL ? 'لا توجد تقييمات تطابق هذا الفلتر' : 'No feedback matches this filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map(r => (
              <FeedbackCard key={r._id} row={r} isRTL={isRTL} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string; value: string; subtitle: string;
  icon: React.ReactNode; accent: string;
}> = ({ title, value, subtitle, icon, accent }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: accent }}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-800 text-gray-900 leading-tight">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </div>
);

const StarRow: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <Star
        key={n}
        className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        style={{ width: size, height: size }}
      />
    ))}
  </div>
);

// Closed list of category enum values — must match
// Robotrick-Backend/src/models/TransportTripFeedback.js
const CATEGORY_LABEL: Record<string, { en: string; ar: string; positive: boolean }> = {
  late:            { en: 'Late',             ar: 'متأخر',           positive: false },
  rude_driver:     { en: 'Rude driver',      ar: 'سائق غير لبق',    positive: false },
  rough_driving:   { en: 'Rough driving',    ar: 'قيادة عنيفة',     positive: false },
  unsafe:          { en: 'Unsafe',           ar: 'غير آمن',         positive: false },
  dirty_vehicle:   { en: 'Dirty vehicle',    ar: 'سيارة غير نظيفة', positive: false },
  on_time:         { en: 'On time',          ar: 'في الموعد',       positive: true  },
  friendly_driver: { en: 'Friendly driver',  ar: 'سائق ودود',       positive: true  },
  smooth_driving:  { en: 'Smooth driving',   ar: 'قيادة سلسة',      positive: true  },
  clean_vehicle:   { en: 'Clean vehicle',    ar: 'سيارة نظيفة',     positive: true  },
  great_service:   { en: 'Great service',    ar: 'خدمة رائعة',      positive: true  },
};

const FeedbackCard: React.FC<{ row: FeedbackRow; isRTL: boolean }> = ({ row, isRTL }) => {
  const tripDate = row.trip?.date ? new Date(row.trip.date) : null;
  const dirLabel = row.trip?.direction === 'to_academy'
    ? (isRTL ? 'إلى روبوتريك' : 'To RoboTrick')
    : (isRTL ? 'من روبوتريك' : 'From RoboTrick');

  return (
    <div className="p-5 hover:bg-gray-50/50">
      {/* Top: stars + meta */}
      <div className="flex items-start gap-3">
        <StarRow value={row.rating} size={16} />
        <span className="text-sm font-700 text-gray-700">{row.rating}/5</span>
        <span className="text-xs text-gray-400 ms-auto">
          {tripDate ? tripDate.toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
            day: 'numeric', month: 'short', year: 'numeric',
          }) : '—'}
        </span>
      </div>

      {/* Student → Driver context line */}
      <p className="text-xs text-gray-500 mt-2">
        <span className="font-600 text-gray-700">{row.student?.name || (isRTL ? 'طالب' : 'Student')}</span>
        {' · '}
        {dirLabel}
        {row.driver?.name && (
          <>
            {' · '}
            <span>{isRTL ? 'السائق' : 'Driver'}: <span className="font-600 text-gray-700">{row.driver.name}</span></span>
          </>
        )}
      </p>

      {/* Categories */}
      {row.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {row.categories.map(c => {
            const meta = CATEGORY_LABEL[c];
            const label = meta ? (isRTL ? meta.ar : meta.en) : c;
            const positive = meta?.positive ?? false;
            return (
              <span
                key={c}
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  positive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {/* Comment */}
      {row.comment && (
        <p className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-wrap">
          “{row.comment}”
        </p>
      )}

      {/* Edited indicator */}
      {row.updatedAt !== row.createdAt && (
        <p className="text-[10px] text-gray-400 mt-2">
          {isRTL ? 'تم التعديل' : 'Edited'}
        </p>
      )}
    </div>
  );
};

export default CTOTransport;
