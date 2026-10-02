import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { SelectInput } from '../../../ui';
import { useTrainerSessionList } from '../../trainer/sessions/api';

/** Pick the classes a task belongs to (any groups); the task goes to the students of their groups. */
export function ClassPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation('dashboardCLO');
  const f = useFormat();
  const q = useTrainerSessionList();
  const all = useMemo(() => (q.data ?? []).filter((s) => s.status !== 'cancelled' && s.groupId), [q.data]);
  const picked = all.filter((s) => value.includes(s._id));
  const [course, setCourse] = useState(() => picked[0]?.courseId?._id ?? '');
  const courses = [...new Map(all.filter((s) => s.courseId).map((s) => [s.courseId!._id, s.courseId!.title])).entries()];
  const shown = all.filter((s) => !course || s.courseId?._id === course).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.sessionNumber - b.sessionNumber);
  const byGroup = [...shown.reduce((m, s) => m.set(s.groupId!._id, [...(m.get(s.groupId!._id) ?? []), s]), new Map<string, typeof shown>()).entries()];
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SelectInput aria-label={t('gr.course')} value={course} onChange={(e) => setCourse(e.target.value)} className="h-10 w-full sm:w-auto sm:min-w-48">
          <option value="">{t('gr.allCourses')}</option>
          {courses.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </SelectInput>
        <span className="text-sm text-ink-3">{t('ctk.pickedN', { count: value.length })}</span>
      </div>
      {q.isLoading ? <div className="h-24 animate-pulse rounded-card bg-rail" /> : byGroup.length === 0 ? <p className="text-sm text-ink-4">{t('ctk.noClasses')}</p> : (
        <div className="max-h-80 space-y-3 overflow-y-auto pe-1">
          {byGroup.map(([gid, list]) => (
            <fieldset key={gid}>
              <legend className="mb-1.5 text-xs font-semibold text-ink-3" dir="auto">{list[0].groupId!.name}{list[0].courseId ? ` · ${list[0].courseId.title}` : ''}</legend>
              <div className="flex flex-wrap gap-1.5">
                {list.map((s) => {
                  const on = value.includes(s._id);
                  return (
                    <button key={s._id} type="button" aria-pressed={on} onClick={() => toggle(s._id)} title={s.title}
                      className={cn('h-9 rounded-pill border px-3 text-sm tabular-nums focus-visible:focus-ring', on ? 'border-ink bg-ink text-white' : 'border-line-strong text-ink-2 hover:border-ink')}>
                      {t('ctk.classN', { n: s.sessionNumber })} · {f.dayMonth(s.scheduledDate)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}
