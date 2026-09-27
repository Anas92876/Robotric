import { useState } from "react";
import { api } from "../../lib/api";

type Props = {
  partId: string;
  partName: string;
  onClose: () => void;
  onSuccess: () => void;
};

const REASONS = [
  { value: "purchase", label: "Purchase (increase)" },
  { value: "adjustment", label: "Adjustment" },
];

export default function AdjustStockModal({
  partId,
  partName,
  onClose,
  onSuccess,
}: Props) {
  const [qtyChange, setQtyChange] = useState<number>(0);
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/stock/adjust", { partId, qtyChange, reason });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to adjust stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-lg font-semibold mb-2">Adjust Stock</div>
        <div className="text-sm text-gray-400 mb-4">{partName}</div>

        <div className="space-y-3">
          <div>
            <label className="block mb-1 text-sm text-gray-300">Reason</label>
            <select
              className="select w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-300">
              Quantity change
            </label>
            <input
              type="number"
              className="input w-full"
              value={qtyChange}
              onChange={(e) => setQtyChange(Number(e.target.value))}
            />
            <div className="text-xs text-gray-400 mt-1">
              Positive increases available quantity; negative decreases.
            </div>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={submit}
            disabled={loading || qtyChange === 0}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
