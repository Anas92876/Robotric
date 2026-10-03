import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { api } from '../../../lib/api';
import { readApiError } from '../../../app/apiError';
import { useToast } from '../../../components/ui/Toast';
import { Button, Dialog, Field, SelectInput, TextArea, TextInput } from '../../../ui';
import { useDayName } from '../../trainer/groups/GroupsPage';
import { useCloCourseOptions, useCloTrainerOptions, type CloGroup, type GroupSlot } from '../api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const day10 = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** Create or edit a group: course, trainer, dates, size and weekly times. */
export function GroupDialog({ open, onClose, group, courseId }: { open: boolean; onClose: () => void; group: CloGroup | null; courseId?: string }) {
  const { t } = useTranslation('dashboardCLO');
  const dayName = useDayName();
  const toast = useToast();
  const qc = useQueryClient();
  const courses = useCloCourseOptions();
  const trainers = useCloTrainerOptions();
  const [form, setForm] = useState({ name: '', courseId: '', trainerId: '', startDate: '', endDate: '', maxStudents: 12, startingSessionNumber: 1, description: '' });
  const [slots, setSlots] = useState<GroupSlot[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setForm({
      name: group?.name ?? '', courseId: group?.courseId?._id ?? courseId ?? '', trainerId: group?.trainerId?._id ?? '',
      startDate: day10(group?.startDate), endDate: day10(group?.endDate), maxStudents: group?.maxStudents ?? 12, startingSessionNumber: group?.startingSessionNumber ?? 1, description: group?.description ?? '',
    });
    setSlots(group?.schedule?.length ? group.schedule.map(({ day, startTime, endTime, location }) => ({ day, startTime, endTime, location: location ?? '' })) : [{ day: 'Saturday', startTime: '16:00', endTime: '18:00', location: '' }]);
    setError('');
  }, [open, group, courseId]);

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, name: form.name.trim(), description: form.description.trim(), schedule: slots.map((s) => ({ ...s, location: s.location?.trim() || null })) };
      return group ? api.put(`/clo/groups/${group._id}`, body) : api.post('/clo/groups', body);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['clo', 'groups'] }); void qc.invalidateQueries({ queryKey: ['clo', 'courses'] }); toast.success(t(group ? 'gr.toast.saved' : 'gr.toast.created')); onClose(); },
    onError: (e) => setError(readApiError(e).message),
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: typeof f[k] === 'number' ? Number(e.target.value) : e.target.value }));
  const setSlot = (i: number, patch: Partial<GroupSlot>) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t('gr.errName'));
    if (!form.courseId) return setError(t('gr.errCourse'));
    if (!form.trainerId) return setError(t('gr.errTrainer'));
    if (!form.startDate || !form.endDate) return setError(t('gr.errDates'));
    if (form.endDate <= form.startDate) return setError(t('gr.errOrder'));
    if (form.maxStudents < 1 || form.maxStudents > 100) return setError(t('gr.errSize'));
    if (!slots.length) return setError(t('gr.errSlots'));
    if (slots.some((s) => !s.startTime || !s.endTime || s.endTime <= s.startTime)) return setError(t('gr.errSlotTime'));
    setError('');
    save.mutate();
  };
  const activeTrainers = (trainers.data ?? []).filter((x) => x.profile?.status !== 'inactive' || x._id === form.trainerId);

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={t(group ? 'gr.editTitle' : 'gr.newTitle')} closeLabel={t('tr.cancel')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('tr.cancel')}</Button><Button type="submit" form="group-form" loading={save.isPending}>{t(group ? 'tr.save' : 'gr.create')}</Button></>}>
      <form id="group-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label={t('gr.name')} required>{(c) => <TextInput {...c} value={form.name} onChange={set('name')} maxLength={100} dir="auto" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('gr.course')} required>
            {(c) => (
              <SelectInput {...c} value={form.courseId} onChange={set('courseId')}>
                <option value="">{t('gr.pickCourse')}</option>
                {(courses.data ?? []).filter((x) => x.status !== 'archived' || x._id === form.courseId).map((x) => <option key={x._id} value={x._id}>{x.title}</option>)}
              </SelectInput>
            )}
          </Field>
          <Field label={t('gr.trainer')} required>
            {(c) => (
              <SelectInput {...c} value={form.trainerId} onChange={set('trainerId')}>
                <option value="">{t('gr.pickTrainer')}</option>
                {activeTrainers.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
              </SelectInput>
            )}
          </Field>
          <Field label={t('gr.start')} required>{(c) => <TextInput {...c} type="date" value={form.startDate} onChange={set('startDate')} />}</Field>
          <Field label={t('gr.end')} required>{(c) => <TextInput {...c} type="date" value={form.endDate} onChange={set('endDate')} />}</Field>
          <Field label={t('gr.size')} hint={t('gr.sizeHint')}>{(c) => <TextInput {...c} type="number" min={1} max={100} value={form.maxStudents} onChange={set('maxStudents')} />}</Field>
          <Field label={t('gr.firstClass')} hint={t('gr.firstClassHint')}>{(c) => <TextInput {...c} type="number" min={1} value={form.startingSessionNumber} onChange={set('startingSessionNumber')} />}</Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('gr.weekly')}</legend>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-card border border-line p-2 sm:grid-cols-[150px_110px_110px_minmax(0,1fr)_auto]">
                <SelectInput aria-label={t('gr.day', { n: i + 1 })} value={s.day} onChange={(e) => setSlot(i, { day: e.target.value })} className="h-10">
                  {DAYS.map((d) => <option key={d} value={d}>{dayName(d)}</option>)}
                </SelectInput>
                <Button variant="ghost" size="sm" iconOnly icon={<X />} aria-label={t('gr.removeSlot', { n: i + 1 })} onClick={() => setSlots((x) => x.filter((_, j) => j !== i))} className="h-10 sm:order-last" />
                <TextInput type="time" aria-label={t('gr.from', { n: i + 1 })} value={s.startTime} onChange={(e) => setSlot(i, { startTime: e.target.value })} dir="ltr" className="h-10" />
                <TextInput type="time" aria-label={t('gr.to', { n: i + 1 })} value={s.endTime} onChange={(e) => setSlot(i, { endTime: e.target.value })} dir="ltr" className="h-10" />
                <TextInput aria-label={t('gr.room', { n: i + 1 })} placeholder={t('gr.roomHint')} value={s.location ?? ''} onChange={(e) => setSlot(i, { location: e.target.value })} className="col-span-2 h-10 sm:col-span-1" dir="auto" />
              </div>
            ))}
            <Button variant="ghost" size="sm" icon={<Plus />} onClick={() => setSlots((x) => [...x, { day: 'Saturday', startTime: '16:00', endTime: '18:00', location: '' }])}>{t('gr.addSlot')}</Button>
          </div>
        </fieldset>
        <Field label={t('gr.description')}>{(c) => <TextArea {...c} rows={2} value={form.description} onChange={set('description')} maxLength={1000} dir="auto" />}</Field>
        {error && <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </form>
    </Dialog>
  );
}
