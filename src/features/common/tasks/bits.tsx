import { useTranslation } from 'react-i18next';
import { AlarmClock, CalendarDays, Clock, Flame } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { cn } from '../../../lib/utils';
import { Badge, type BadgeTone } from '../../../ui';
import { dueOf, type Task, type TaskStatus } from './api';

export const STATUS_TONE: Record<TaskStatus, BadgeTone> = { todo: 'neutral', in_progress: 'info', done: 'success', pending_review: 'warning', declined: 'danger' };

/** P1 critical / P2 high / P3 normal. */
export function PriorityBadge({ p }: { p: 1 | 2 | 3 }) {
  const { t } = useTranslation('dashboardCommon');
  const tone: BadgeTone = p === 1 ? 'danger' : p === 2 ? 'warning' : 'neutral';
  return <Badge tone={tone}>{t(`myTasks.priority.${p}`)}</Badge>;
}

/** "Overdue by 2 days" / "Due today" / "3 days left" with the date. */
export function DueChip({ task, compact }: { task: Task; compact?: boolean }) {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const d = dueOf(task);
  if (d.urgency === 'none' || d.days === null) return compact ? <span className="text-ink-4">—</span> : null;
  const label = d.urgency === 'overdue' ? t('myTasks.due.overdue', { count: -d.days }) : d.urgency === 'today' ? t('myTasks.due.today') : d.days === 1 ? t('myTasks.due.tomorrow') : t('myTasks.due.left', { count: d.days });
  const Icon = d.urgency === 'overdue' ? Flame : d.urgency === 'today' ? AlarmClock : d.urgency === 'soon' ? Clock : CalendarDays;
  const tone = d.urgency === 'overdue' ? 'text-danger' : d.urgency === 'today' || d.urgency === 'soon' ? 'text-warning' : 'text-ink-3';
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', tone)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="text-xs text-ink-4 tabular-nums">
        · {f.dayMonth(d.date!)}
        {task.hardDeadline && <span className="ms-1 font-medium text-danger">{t('myTasks.hard')}</span>}
      </span>
    </span>
  );
}
