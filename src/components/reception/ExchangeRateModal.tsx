/**
 * ExchangeRateModal - Modal to edit USD to Syrian Pound exchange rate
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, useToast } from '../ui';

export interface ExchangeRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  exchangeRate: number;
  onSave: (newRate: number) => Promise<void>;
  isSaving?: boolean;
}

const MIN_RATE = 1;
const MAX_RATE = 10000;

export const ExchangeRateModal: React.FC<ExchangeRateModalProps> = ({
  isOpen,
  onClose,
  exchangeRate,
  onSave,
  isSaving = false
}) => {
  const toast = useToast();
  const [inputValue, setInputValue] = useState(exchangeRate.toString());
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(exchangeRate.toString());
      setLocalError(null);
    }
  }, [isOpen, exchangeRate]);

  const handleSave = async () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setLocalError('Please enter a valid number');
      return;
    }
    if (parsed < MIN_RATE || parsed > MAX_RATE) {
      setLocalError(`Exchange rate must be between ${MIN_RATE} and ${MAX_RATE} S.P. per USD`);
      return;
    }
    setLocalError(null);
    try {
      await onSave(parsed);
      toast.success('Exchange Rate Updated', `Rate updated to $1 = ${parsed} S.P.`);
      onClose();
    } catch (err: unknown) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Failed to update exchange rate');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Exchange Rate"
      description="Set the exchange rate used for converting between USD and Syrian Pounds (S.P.) across the system."
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="exchangeRate" className="block text-sm font-medium text-[#003300] mb-2">
            Exchange Rate: $1 = ? S.P.
          </label>
          <Input
            id="exchangeRate"
            type="number"
            min={MIN_RATE}
            max={MAX_RATE}
            step="0.1"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (localError) setLocalError(null);
            }}
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="120"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {localError && (
            <p className="text-red-500 text-sm mt-1">{localError}</p>
          )}
          <p className="text-xs text-[#003300]/50 mt-1">
            Valid range: {MIN_RATE} - {MAX_RATE} S.P. per USD
          </p>
        </div>
      </div>
    </Modal>
  );
};
