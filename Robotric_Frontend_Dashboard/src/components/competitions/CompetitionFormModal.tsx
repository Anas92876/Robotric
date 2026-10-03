import { useEffect, useState } from 'react';
import { Modal, Input, Button } from '../ui';
import type { Competition } from '../../hooks/common/useCompetitionsData';

export interface CompetitionFormData {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  maxTeams?: number;
}

interface CompetitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Given → edit mode; otherwise a new competition. */
  competition?: (Competition & { maxTeams?: number }) | null;
  onSubmit: (data: CompetitionFormData) => Promise<{ success: boolean; error?: string }>;
}

const toDateInput = (value?: string) => (value ? value.slice(0, 10) : '');

/** Create or edit a competition. The backend requires title, start and end date. */
export function CompetitionFormModal({ isOpen, onClose, competition, onSubmit }: CompetitionFormModalProps) {
  const isEdit = !!competition;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxTeams, setMaxTeams] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill the form each time it opens
  useEffect(() => {
    if (!isOpen) return;
    setTitle(competition?.title ?? '');
    setDescription(competition?.description ?? '');
    setStartDate(toDateInput(competition?.startDate));
    setEndDate(toDateInput(competition?.endDate));
    setMaxTeams(competition?.maxTeams ? String(competition.maxTeams) : '');
    setError(null);
  }, [isOpen, competition]);

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!startDate || !endDate) return 'Start and end dates are required';
    if (endDate < startDate) return 'The end date must be on or after the start date';
    if (maxTeams && (!Number.isInteger(Number(maxTeams)) || Number(maxTeams) < 0)) return 'Max teams must be a whole number (0 = no limit)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);
    setSaving(true);
    setError(null);
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
      maxTeams: maxTeams ? Number(maxTeams) : 0,
    });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Could not save the competition');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Competition' : 'New Competition'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. WRO Syria 2026" autoFocus />
        <div>
          <label className="block text-sm font-medium text-ink mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-primary/20 text-ink focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Start date" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date" type="date" required value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Input label="Max teams" type="number" min={0} value={maxTeams} onChange={(e) => setMaxTeams(e.target.value)} helperText="Leave empty or 0 for no limit" />

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create competition'}</Button>
        </div>
      </form>
    </Modal>
  );
}
