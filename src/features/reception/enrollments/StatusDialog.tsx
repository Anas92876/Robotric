import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Field, TextArea } from '../../../ui';
import { readApiError } from '../../../app/apiError';
import type { Enrollment } from './api';

interface StatusDialogProps {
  enrollment: Enrollment | null;
  onClose: () => void;
  onSave: (status: 'active' | 'inactive', reason?: string) => Promise<unknown>;
}

/** Make an enrollment inactive (a reason is required and kept in its history) or active again. */
export function StatusDialog({ enrollment, onClose, onSave }: StatusDialogProps) {
  const { t } = useTranslation('dashboardReception');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const deactivating = enrollment?.status !== ('inactive' as string);

  useEffect(() => {
    setReason('');
    setError('');
  }, [enrollment]);

  const save = async () => {
    if (deactivating && !reason.trim()) return setError(t('enrollments.status.reasonRequired'));
    setSaving(true);
    try {
      await onSave(deactivating ? 'inactive' : 'active', deactivating ? reason.trim() : undefined);
      onClose();
    } catch (err) {
      setError(readApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!enrollment}
      onClose={saving ? () => {} : onClose}
      size="sm"
      title={deactivating ? t('enrollments.status.deactivateTitle') : t('enrollments.status.activateTitle')}
      description={enrollment ? `${enrollment.student?.name ?? '—'} · ${enrollment.course?.title ?? '—'}` : undefined}
      closeLabel={t('enrollments.cancel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t('enrollments.cancel')}
          </Button>
          <Button variant={deactivating ? 'danger' : 'primary'} onClick={() => void save()} loading={saving}>
            {deactivating ? t('enrollments.status.deactivate') : t('enrollments.status.activate')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-2">{deactivating ? t('enrollments.status.deactivateText') : t('enrollments.status.activateText')}</p>
      {deactivating && (
        <Field label={t('enrollments.status.reason')} required error={error || undefined} className="mt-4">
          {(p) => <TextArea {...p} value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} placeholder={t('enrollments.status.reasonPlaceholder')} />}
        </Field>
      )}
      {!deactivating && error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Dialog>
  );
}
