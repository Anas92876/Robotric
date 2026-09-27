import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Receipt,
  RefreshCw,
  Bus,
  XCircle,
  Loader2,
  Banknote,
  Smartphone,
} from "lucide-react";
import { usePayments } from "../../hooks";
import { Button, Alert, useToast } from "../../components/ui";
import PaymentInitiationModal from "../../components/payments/PaymentInitiationModal";
import PaymentConfirmationModal from "../../components/payments/PaymentConfirmationModal";
import { useTranslation } from "react-i18next";

const TEXT_PRIMARY   = "#003300";
const TEXT_SECONDARY = "#003300CC";
const TEXT_TERTIARY  = "#00330080";

// ─── Animation presets ─────────────────────────────────────────────────────────
const fade = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
};
const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.05 } },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; labelAr: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  completed:  { label: "Completed",  labelAr: "مكتمل",     color: "#16a34a", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.2)",   Icon: CheckCircle2 },
  pending:    { label: "Pending",    labelAr: "قيد الانتظار", color: "#d97706", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", Icon: Clock        },
  processing: { label: "Processing", labelAr: "جارٍ المعالجة", color: "#2563eb", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)", Icon: Loader2      },
  failed:     { label: "Failed",     labelAr: "فشل",        color: "#dc2626", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  Icon: XCircle      },
};

const METHOD_CFG: Record<string, { label: string; labelAr: string; Icon: React.ElementType }> = {
  card:          { label: "Card",          labelAr: "بطاقة",        Icon: CreditCard  },
  cash:          { label: "Cash",          labelAr: "نقداً",        Icon: Banknote    },
  bank_transfer: { label: "Bank Transfer", labelAr: "تحويل بنكي",   Icon: Receipt     },
  sham_cash_app: { label: "ShamCash",      labelAr: "شام كاش",      Icon: Smartphone  },
  online:        { label: "Online",        labelAr: "أونلاين",      Icon: CreditCard  },
};

function StatusPill({ status, isRTL }: { status: string; isRTL: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <Icon className="w-3 h-3" />
      {isRTL ? cfg.labelAr : cfg.label}
    </span>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-28 bg-[#003300]/10 rounded" />
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-2xl bg-white border border-[#003300]/8 p-4 space-y-2">
            <div className="h-3 w-1/2 bg-[#003300]/8 rounded" />
            <div className="h-6 w-3/4 bg-[#003300]/12 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-[#003300]/8 overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#003300]/6 h-12 bg-[#003300]/4" />
        {[1,2,3].map(i => (
          <div key={i} className="flex items-center gap-3 p-4 border-b border-[#003300]/6">
            <div className="w-10 h-10 rounded-xl bg-[#003300]/8 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-[#003300]/10 rounded w-1/3" />
              <div className="h-3 bg-[#003300]/6 rounded w-1/2" />
            </div>
            <div className="h-6 w-16 bg-[#003300]/8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({
  label, amount, currency = "$", suffix = "", icon: Icon, iconColor, progress,
}: {
  label: string; amount: number; currency?: string; suffix?: string;
  icon: React.ElementType; iconColor: string; progress?: number;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_TERTIARY }}>
          {label}
        </p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${iconColor}15` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-bold" style={{ color: TEXT_PRIMARY }}>
        {currency}{typeof amount === 'number' ? (suffix ? amount.toLocaleString() : amount.toFixed(2)) : '0'}{suffix}
      </p>
      {progress !== undefined && (
        <div className="mt-2.5 h-1.5 rounded-full bg-[#003300]/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ background: `linear-gradient(90deg, ${iconColor}, ${iconColor}CC)` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Payment row ───────────────────────────────────────────────────────────────
function PaymentRow({
  payment, isRTL, onDownload, downloading,
}: {
  payment: any; isRTL: boolean;
  onDownload: (id: string) => void; downloading: boolean;
}) {
  const { t } = useTranslation(["dashboardStudent"]);
  const isTransport = payment.type === "transportation";
  const methodCfg = METHOD_CFG[payment.paymentMethod] ?? { label: payment.paymentMethod, labelAr: payment.paymentMethod, Icon: Receipt };
  const MethodIcon = methodCfg.Icon;

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-[#003300]/6 last:border-0 hover:bg-[#003300]/2 transition-colors">
      {/* Icon */}
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: isTransport ? "rgba(249,115,22,0.08)" : "rgba(0,51,0,0.06)" }}
      >
        {isTransport
          ? <Bus className="w-5 h-5 text-orange-500" />
          : <MethodIcon className="w-5 h-5" style={{ color: TEXT_TERTIARY }} />
        }
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
            {isTransport
              ? `${payment.amount.toLocaleString()} S.P.`
              : `$${payment.amount.toFixed(2)}`
            }
          </span>
          <StatusPill status={payment.status} isRTL={isRTL} />
          {isTransport && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
              {isRTL ? "نقل" : "Transport"}
            </span>
          )}
          {payment.installmentNumber && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#003300]/6" style={{ color: TEXT_TERTIARY }}>
              {isRTL ? `قسط ${payment.installmentNumber}` : `Installment ${payment.installmentNumber}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
            {new Date(payment.createdAt).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="text-xs" style={{ color: TEXT_TERTIARY }}>
            {isRTL ? methodCfg.labelAr : methodCfg.label}
          </span>
          {payment.course?.title && (
            <span className="text-xs truncate max-w-[140px]" style={{ color: TEXT_TERTIARY }}>
              {payment.course.title}
            </span>
          )}
        </div>
        {payment.notes && (
          <p className="text-xs mt-0.5 truncate" style={{ color: TEXT_TERTIARY }} dir="auto">
            {payment.notes}
          </p>
        )}
      </div>

      {/* Receipt download */}
      {payment.status === "completed" && payment.receipt?.receiptNumber && (
        <button
          onClick={() => onDownload(payment._id)}
          disabled={downloading}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#003300]/8 transition-colors active:scale-95 disabled:opacity-50"
          style={{ color: TEXT_SECONDARY }}
          aria-label={t("dashboardStudent:receipt")}
        >
          {downloading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />
          }
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudentPayments() {
  const { courseId } = useParams<{ courseId: string }>();
  const { payments, summary, isLoading, error, refetch, downloadReceipt, initiatePayment, confirmPayment } = usePayments(courseId);
  const { t, i18n } = useTranslation(["dashboardCommon", "dashboardStudent"]);
  const isRTL = i18n.language === "ar";
  const toast = useToast();

  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      setDownloadingReceipt(paymentId);
      await downloadReceipt(paymentId);
    } catch {
      toast.error(t("dashboardCommon:error"), t("dashboardCommon:tryAgain"));
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const handleInitiatePayment = async (data: any) => {
    try {
      const payment = await initiatePayment(data);
      setPendingPayment(payment);
      setIsPaymentModalOpen(false);
      setIsConfirmModalOpen(true);
    } catch (err: any) {
      toast.error(t("dashboardCommon:error"), err.message || t("dashboardCommon:errorMessage"));
    }
  };

  const handleConfirmPayment = async (paymentId: string, transactionId: string) => {
    try {
      await confirmPayment(paymentId, transactionId);
      setPendingPayment(null);
      setIsConfirmModalOpen(false);
      toast.success(t("dashboardCommon:successMessage"), "Payment confirmed successfully!");
    } catch (err: any) {
      toast.error(t("dashboardCommon:error"), err.message || t("dashboardCommon:errorMessage"));
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <Alert variant="error">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{t("dashboardCommon:failedToLoad")}</p>
            <p className="text-sm opacity-80 mt-0.5">{error}</p>
          </div>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={refetch}>
            {t("dashboardCommon:retry")}
          </Button>
        </div>
      </Alert>
    );
  }

  const coursePct = summary && summary.totalAmount > 0
    ? (summary.paidAmount / summary.totalAmount) * 100 : 0;
  const transportPct = summary?.transportationTotal && summary.transportationTotal > 0
    ? ((summary.transportationPaid || 0) / summary.transportationTotal) * 100 : 0;

  const isFullyPaid = summary && summary.remainingAmount <= 0
    && (!summary.transportationRemaining || summary.transportationRemaining <= 0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-3 sm:space-y-4"
    >
      {/* ── Back + title ── */}
      <motion.div variants={fade}>
        {courseId ? (
          <Link
            to={`/student/courses/${courseId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.97] mb-3"
            style={{ background: "rgba(0,51,0,0.07)", color: TEXT_PRIMARY }}
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {t("dashboardStudent:backToCourse")}
          </Link>
        ) : null}
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: TEXT_PRIMARY }}>
          {t("dashboardStudent:paymentHistory")}
        </h1>
        <p className="text-sm mt-1" style={{ color: TEXT_SECONDARY }}>
          {t("dashboardStudent:paymentSubtitle")}
        </p>
      </motion.div>

      {/* ── Course summary cards ── */}
      {summary && (
        <motion.div variants={fade} className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatCard
              label={isRTL ? "الإجمالي" : "Total"}
              amount={summary.totalAmount}
              icon={DollarSign}
              iconColor="#003300"
            />
            <StatCard
              label={isRTL ? "المدفوع" : "Paid"}
              amount={summary.paidAmount}
              icon={CheckCircle2}
              iconColor="#16a34a"
              progress={coursePct}
            />
            <StatCard
              label={isRTL ? "المتبقي" : "Remaining"}
              amount={summary.remainingAmount}
              icon={Clock}
              iconColor={summary.remainingAmount > 0 ? "#d97706" : "#16a34a"}
            />
          </div>

          {/* Transportation summary */}
          {summary.transportationTotal && summary.transportationTotal > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatCard
                label={isRTL ? "النقل - الإجمالي" : "Transport Total"}
                amount={summary.transportationTotal}
                currency=""
                suffix=" S.P."
                icon={Bus}
                iconColor="#f97316"
              />
              <StatCard
                label={isRTL ? "النقل - المدفوع" : "Transport Paid"}
                amount={summary.transportationPaid || 0}
                currency=""
                suffix=" S.P."
                icon={CheckCircle2}
                iconColor="#16a34a"
                progress={transportPct}
              />
              <StatCard
                label={isRTL ? "النقل - المتبقي" : "Transport Due"}
                amount={summary.transportationRemaining || 0}
                currency=""
                suffix=" S.P."
                icon={Clock}
                iconColor={(summary.transportationRemaining || 0) > 0 ? "#d97706" : "#16a34a"}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ── Status alert ── */}
      {summary && (
        <motion.div variants={fade}>
          {isFullyPaid ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border" style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.2)" }}>
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-700">{t("dashboardStudent:fullyPaid")}</p>
                <p className="text-xs text-green-600 mt-0.5">{t("dashboardStudent:needPaymentDesc")}</p>
              </div>
            </div>
          ) : summary.nextPaymentDue ? (
            <div
              className="flex items-center gap-3 p-3.5 rounded-2xl border"
              style={{
                background: summary.nextPaymentDue.isOverdue ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                borderColor: summary.nextPaymentDue.isOverdue ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
              }}
            >
              <AlertCircle className={`w-5 h-5 shrink-0 ${summary.nextPaymentDue.isOverdue ? "text-red-600" : "text-amber-600"}`} />
              <div>
                <p className={`text-sm font-bold ${summary.nextPaymentDue.isOverdue ? "text-red-700" : "text-amber-700"}`}>
                  {summary.nextPaymentDue.isOverdue
                    ? t("dashboardStudent:coursePaymentOverdue")
                    : t("dashboardStudent:upcomingCoursePayment")}
                </p>
                <p className={`text-xs mt-0.5 ${summary.nextPaymentDue.isOverdue ? "text-red-600" : "text-amber-600"}`}>
                  ${summary.nextPaymentDue.amount.toFixed(2)} {isRTL ? "بتاريخ" : "due"}{" "}
                  {new Date(summary.nextPaymentDue.dueDate).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { day: "numeric", month: "long" })}
                </p>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* ── Transaction history ── */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,51,0,0.06)" }}>
              <Receipt className="w-4 h-4" style={{ color: TEXT_TERTIARY }} />
            </div>
            <h2 className="font-bold text-base" style={{ color: TEXT_PRIMARY }}>
              {t("dashboardStudent:transactionHistory")}
            </h2>
          </div>
          {payments.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#003300]/6" style={{ color: TEXT_TERTIARY }}>
              {payments.length}
            </span>
          )}
        </div>

        {/* Rows */}
        {payments.length > 0 ? (
          <motion.div variants={container} initial="hidden" animate="show">
            {payments.map((payment: any) => (
              <motion.div key={payment._id} variants={fade}>
                <PaymentRow
                  payment={payment}
                  isRTL={isRTL}
                  onDownload={handleDownloadReceipt}
                  downloading={downloadingReceipt === payment._id}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-14 px-6">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(0,51,0,0.05)" }}>
              <Receipt className="w-7 h-7" style={{ color: TEXT_TERTIARY }} />
            </div>
            <p className="font-semibold text-sm" style={{ color: TEXT_PRIMARY }}>
              {t("dashboardStudent:noPaymentHistory")}
            </p>
          </div>
        )}
      </motion.div>

      {/* ── Accepted methods ── */}
      <motion.div variants={fade} className="rounded-2xl bg-white border border-[#003300]/8 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-[#003300]/6">
          <h3 className="font-bold text-sm" style={{ color: TEXT_PRIMARY }}>
            {t("dashboardStudent:acceptedPaymentMethods")}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#003300]/6">
          {[
            { Icon: Banknote,    label: isRTL ? "نقداً"    : "Cash",    color: "#16a34a" },
            { Icon: Smartphone,  label: isRTL ? "شام كاش"  : "ShamCash", color: "#2563eb" },
          ].map(({ Icon, label, color }) => (
            <div key={label} className="flex items-center gap-2.5 p-3.5 bg-white">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Contact note ── */}
      <motion.div variants={fade}>
        <div className="flex items-start gap-3 p-3.5 rounded-2xl border" style={{ background: "rgba(59,130,246,0.05)", borderColor: "rgba(59,130,246,0.15)" }}>
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-700">{t("dashboardStudent:needPayment")}</p>
            <p className="text-xs text-blue-600 mt-0.5">{t("dashboardStudent:needPaymentDesc")}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Modals ── */}
      {isPaymentModalOpen && (
        <PaymentInitiationModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleInitiatePayment}
          enrollmentId="placeholder-enrollment-id"
          remainingAmount={summary?.remainingAmount || 0}
          courseName="Current Course"
        />
      )}
      {isConfirmModalOpen && pendingPayment && (
        <PaymentConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => { setIsConfirmModalOpen(false); setPendingPayment(null); }}
          onConfirm={handleConfirmPayment}
          paymentId={pendingPayment._id}
          amount={pendingPayment.amount}
          paymentMethod={pendingPayment.paymentMethod}
        />
      )}
    </motion.div>
  );
}
