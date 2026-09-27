import React, { useState, useEffect } from 'react';
import { X, Plus, History, AlertTriangle, Package } from 'lucide-react';
import { api } from '../../lib/api';

// Local type definitions (consistent with Inventory.tsx)
interface PartWithStock {
  _id: string;
  name: string;
  category: string;
  description?: string;
  sku: string;
  group?: string;
  createdAt: string;
  updatedAt: string;
  availableQty: number;
  usedQty: number;
  damagedQty: number;
  reservedQty?: number;
  totalQty: number;
  imageUrl?: string;
}

interface StockMovement {
  _id: string;
  partId: string;
  qtyChange: number;
  reason: string;
  orderId?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface StockDetailsModalProps {
  part: PartWithStock;
  onClose: () => void;
  onStockUpdated: () => void;
}

/**
 * Stock Details Modal Component
 * Displays stock information and allows stock adjustments
 * Shows stock movement history and provides quick adjustment actions
 */
export const StockDetailsModal: React.FC<StockDetailsModalProps> = ({
  part,
  onClose,
  onStockUpdated
}) => {
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('adjustment');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showAdjustment, setShowAdjustment] = useState(false);

  const lowStock = part.availableQty < 5;

  // Load stock movement history
  const loadStockHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/stock/history', {
        params: { partId: part._id, limit: 50 }
      });
      setStockHistory(response.data);
    } catch (error) {
      console.error('Error loading stock history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStockHistory();
  }, [part._id]);

  // Handle stock adjustment
  const handleStockAdjustment = async () => {
    if (adjustmentQty === 0) {
      alert('Please enter an adjustment quantity');
      return;
    }

    setLoading(true);
    try {
      await api.post('/stock/adjust', {
        partId: part._id,
        qtyChange: adjustmentQty,
        reason: adjustmentReason,
        notes: adjustmentNotes
      });

      // Reset form
      setAdjustmentQty(0);
      setAdjustmentReason('adjustment');
      setAdjustmentNotes('');
      setShowAdjustment(false);

      // Reload data
      loadStockHistory();
      onStockUpdated();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  // Quick adjustment buttons
  const quickAdjustments = [
    { label: '+1', value: 1, color: 'text-green-400' },
    { label: '+5', value: 5, color: 'text-green-400' },
    { label: '+10', value: 10, color: 'text-green-400' },
    { label: '-1', value: -1, color: 'text-red-400' },
    { label: '-5', value: -5, color: 'text-red-400' },
    { label: '-10', value: -10, color: 'text-red-400' },
  ];

  // Stock reasons for dropdown
  const stockReasons = [
    { value: 'purchase', label: 'Purchase/Delivery' },
    { value: 'adjustment', label: 'Inventory Adjustment' },
    { value: 'used', label: 'Used in Project' },
    { value: 'damaged', label: 'Damaged/Lost' },
    { value: 'return', label: 'Return to Stock' },
    { value: 'other', label: 'Other' }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'purchase':
      case 'return':
        return 'text-green-400';
      case 'used':
      case 'damaged':
        return 'text-red-400';
      case 'adjustment':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-primary">{part.name}</h2>
            <p className="text-gray-400 mt-1">{part.category} • SKU: {part.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left Column - Stock Overview */}
            <div className="lg:col-span-1 space-y-6">
              {/* Current Stock Levels */}
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Current Stock
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Available:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${lowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                        {part.availableQty}
                      </span>
                      {lowStock && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">In Use:</span>
                    <span className="text-xl font-semibold text-yellow-400">{part.usedQty}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Damaged:</span>
                    <span className="text-xl font-semibold text-red-400">{part.damagedQty}</span>
                  </div>
                  
                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Total:</span>
                      <span className="text-xl font-bold text-primary">{part.totalQty}</span>
                    </div>
                  </div>
                  
                  {/* Reorder point removed */}
                </div>
              </div>

              {/* Stock Adjustment Panel */}
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Adjustments</h3>
                
                {!showAdjustment ? (
                  <div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {quickAdjustments.map((adj) => (
                        <button
                          key={adj.label}
                          onClick={() => {
                            setAdjustmentQty(adj.value);
                            setShowAdjustment(true);
                          }}
                          className={`btn-outline py-2 px-3 text-sm ${adj.color} border-current hover:bg-current/10`}
                        >
                          {adj.label}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setShowAdjustment(true)}
                      className="btn w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Custom Adjustment
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Adjustment Quantity
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={adjustmentQty}
                        onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                        placeholder="Enter quantity..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use negative numbers to decrease stock
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Reason
                      </label>
                      <select
                        className="select w-full"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                      >
                        {stockReasons.map(reason => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        className="input w-full h-20 resize-none"
                        value={adjustmentNotes}
                        onChange={(e) => setAdjustmentNotes(e.target.value)}
                        placeholder="Add notes about this adjustment..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowAdjustment(false);
                          setAdjustmentQty(0);
                          setAdjustmentNotes('');
                        }}
                        className="btn-outline flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleStockAdjustment}
                        disabled={loading || adjustmentQty === 0}
                        className="btn flex-1"
                      >
                        {loading ? 'Applying...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Stock Movement History */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800/50 rounded-xl p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Stock Movement History
                </h3>

                <div className="flex-1 overflow-y-auto">
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton h-16"></div>
                      ))}
                    </div>
                  ) : stockHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No stock movements recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stockHistory.map((movement) => (
                        <div
                          key={movement._id}
                          className="bg-gray-700/30 rounded-lg p-4 border border-gray-700"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`font-semibold ${getReasonColor(movement.reason)}`}>
                                {movement.qtyChange > 0 ? '+' : ''}{movement.qtyChange}
                              </span>
                              <span className="text-gray-400 ml-2 capitalize">
                                {movement.reason}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(movement.createdAt)}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-400">
                            By: {movement.createdBy?.name || 'System'}
                            {movement.orderId && (
                              <span className="ml-2">• Order: {movement.orderId}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Last updated: {formatDate(part.updatedAt || new Date().toISOString())}
            </div>
            <button onClick={onClose} className="btn-outline">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};