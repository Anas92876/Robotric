import { useEffect, useState } from 'react';
import { Modal, Input, Button } from '../ui';
import type { Team } from '../../hooks/common/useTeamsData';

export interface TeamFormData {
  name: string;
  competitionId?: string;
  members: string[];
}

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Given → edit mode; otherwise a new team. */
  team?: Team | null;
  competitions: { _id: string; title: string }[];
  onSubmit: (data: TeamFormData) => Promise<{ success: boolean; error?: string }>;
}

const memberNames = (team?: Team | null) =>
  (team?.members ?? []).map((m) => (typeof m === 'string' ? m : m.name)).join('\n');

/**
 * Create or edit a team. A team belongs to one competition, chosen when it is
 * created (the backend doesn't move teams between competitions). Members are names.
 */
export function TeamFormModal({ isOpen, onClose, team, competitions, onSubmit }: TeamFormModalProps) {
  const isEdit = !!team;
  const [name, setName] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [members, setMembers] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(team?.name ?? '');
    setCompetitionId(typeof team?.competitionId === 'string' ? team.competitionId : team?.competitionId?._id ?? '');
    setMembers(memberNames(team));
    setError(null);
  }, [isOpen, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Team name is required');
    if (!isEdit && !competitionId) return setError('Choose the competition this team plays in');
    setSaving(true);
    setError(null);
    const list = members.split(/[\n,]/).map((m) => m.trim()).filter(Boolean);
    const result = await onSubmit({ name: name.trim(), members: list, ...(isEdit ? {} : { competitionId }) });
    setSaving(false);
    if (result.success) onClose();
    else setError(result.error ?? 'Could not save the team');
  };

  const competitionTitle = competitions.find((c) => c._id === competitionId)?.title;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Team' : 'New Team'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input label="Team name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aleppo Bots" autoFocus />
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">
            Competition{!isEdit && <span className="text-red-500 ml-1">*</span>}
          </label>
          {isEdit ? (
            <p className="px-4 py-2.5 rounded-lg bg-[#003300]/5 text-[#003300]">{competitionTitle ?? '—'}</p>
          ) : (
            <select
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-primary/20 text-[#003300] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Choose a competition…</option>
              {competitions.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
          )}
          {!isEdit && competitions.length === 0 && <p className="text-sm text-[#003300]/60 mt-1">Create a competition first.</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#003300] mb-2">Members</label>
          <textarea
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            rows={4}
            placeholder={'One name per line\nOmar\nLina'}
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-primary/20 text-[#003300] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create team'}</Button>
        </div>
      </form>
    </Modal>
  );
}
