import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Hash } from 'lucide-react';
import { Button, Input, Alert } from '../ui';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentId: string, transactionId: string) => Promise<void>;
  paymentId: string;
  amount: number;
  paymentMethod: string;
}

export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  paymentId,
  amount,
  paymentMethod
}: PaymentConfirmationModalProps) {
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transactionId.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(paymentId, transactionId.trim());

      // Reset form
      setTransactionId('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTransactionId('');
      setError(null);
      onClose();
    }
  };

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'card': return 'Credit/Debit Card';
      case 'cash': return 'Cash';
      case 'bank_transfer': return 'Bank Transfer';
      case 'sham_cash_app': return 'Sham Cash App';
      case 'online': return 'Online Payment';
      default: return paymentMethod;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Confirm Payment</h2>
                    <p className="text-sm text-gray-600">Verify payment details</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Payment Details */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-5 border border-green-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Amount</span>
                    <span className="text-2xl font-bold text-green-700">
                      {amount.toFixed(2)} <span className="text-base">DZD</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">Payment Method</span>
                    <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded-lg">
                      {getPaymentMethodLabel()}
                    </span>
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="error">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </Alert>
                )}

                {/* Transaction ID Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID / Reference Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Hash className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter transaction ID"
                      className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg
                                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                                bg-white text-gray-900"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the transaction ID from your payment receipt or bank statement
                  </p>
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Payment Verification:</p>
                      <p className="text-blue-800">
                        {paymentMethod === 'cash'
                          ? 'Your payment will be verified by reception staff. Please keep your cash receipt for reference.'
                          : 'This transaction ID will be used to verify your payment. Please ensure it matches your bank statement.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Confirming...' : 'Confirm Payment'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
