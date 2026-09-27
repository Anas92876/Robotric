import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, CreditCard, Wallet, AlertCircle } from 'lucide-react';
import { Button, Input, Alert } from '../ui';

interface PaymentInitiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PaymentData) => Promise<void>;
  enrollmentId: string;
  remainingAmount: number;
  courseName: string;
}

export interface PaymentData {
  enrollmentId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'sham_cash_app' | 'online';
  installmentNumber?: number;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: DollarSign, description: 'Pay with cash at reception' },
  { value: 'sham_cash_app', label: 'Sham Cash App', icon: Wallet, description: 'Pay via Sham Cash App' },
  { value: 'card', label: 'Credit/Debit Card', icon: CreditCard, description: 'Pay online with card' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Wallet, description: 'Direct bank transfer' },
  { value: 'online', label: 'Online Payment', icon: CreditCard, description: 'Pay online' },
];

export default function PaymentInitiationModal({
  isOpen,
  onClose,
  onSubmit,
  enrollmentId,
  remainingAmount,
  courseName
}: PaymentInitiationModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'sham_cash_app' | 'online'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);

    // Validation
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > remainingAmount) {
      setError(`Amount cannot exceed remaining balance (${remainingAmount.toFixed(2)} DZD)`);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        enrollmentId,
        amount: amountNum,
        paymentMethod,
      });

      // Reset form
      setAmount('');
      setPaymentMethod('cash');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      setPaymentMethod('cash');
      setError(null);
      onClose();
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Make a Payment</h2>
                  <p className="text-sm text-gray-600 mt-1">{courseName}</p>
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
                {/* Remaining Balance Info */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Remaining Balance</span>
                    <span className="text-2xl font-bold text-green-700">
                      {remainingAmount.toFixed(2)} <span className="text-base">DZD</span>
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

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount (DZD) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={remainingAmount}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg
                                focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                                bg-white text-gray-900 text-lg font-semibold"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Maximum: {remainingAmount.toFixed(2)} DZD
                  </p>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Accepted Payment Methods *
                  </label>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.value;

                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() => setPaymentMethod(method.value as any)}
                          disabled={isSubmitting}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all
                            ${isSelected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-gray-100'}`}>
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                                {method.label}
                              </span>
                              {isSelected && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{method.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Important Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Important Information:</p>
                      <ul className="space-y-1 list-disc list-inside text-blue-800">
                        <li>Payment will be marked as pending until confirmed by reception</li>
                        <li>You will receive a receipt after payment confirmation</li>
                        {paymentMethod === 'cash' && (
                          <li>Please visit the reception desk to complete your payment</li>
                        )}
                      </ul>
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
                    {isSubmitting ? 'Processing...' : 'Initiate Payment'}
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
