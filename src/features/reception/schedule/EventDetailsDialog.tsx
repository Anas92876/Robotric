import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, CalendarClock, ClipboardList, Pencil, Trash2, UserRound } from 'lucide-react';
import { useFormat } from '../../../app/format';
import { Badge, Button, Dialog } from '../../../ui';
import { studentOf } from '../sessions/api';
import type { CalendarItem } from './api';
import { EVENT_SWATCH, SESSION_SWATCH } from './colors';

interface Props {
  item: CalendarItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** What a calendar block is: time, notes and who takes part. Sessions link to their request/report pages. */
export function EventDetailsDialog({ item, onClose, onEdit, onDelete }: Props) {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  // Keep the content while the dialog fades out
  const last = useRef<CalendarItem | null>(null);
  if (item) last.current = item;
  const shown = item ?? last.current;
  if (!shown) return null;

  const swatch = shown.kind === 'session' ? SESSION_SWATCH.bar : EVENT_SWATCH[shown.event.color].bar;
  const when = `${f.custom(shown.start, { weekday: 'long', day: 'numeric', month: 'long' })} · ${f.time(shown.start)} – ${f.time(shown.end)}`;
  const notes = shown.kind === 'event' ? shown.event.description : shown.session.description;

  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2.5">
          <span className="size-3 shrink-0 rounded-full" style={{ background: swatch }} aria-hidden />
          {shown.title}
        </span>
      }
      closeLabel={t('enrollments.cancel')}
      footer={
        shown.kind === 'event' ? (
          <>
            <Button variant="ghost" className="text-danger" icon={<Trash2 />} onClick={onDelete}>
              {t('cal.delete')}
            </Button>
            <Button icon={<Pencil />} onClick={onEdit}>
              {t('cal.edit')}
            </Button>
          </>
        ) : (
          <Link to="/reception/session-requests" className="inline-flex h-11 items-center gap-2 rounded-pill border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-white focus-visible:focus-ring">
            <ClipboardList className="size-[18px]" aria-hidden />
            {t('cal.openRequests')}
          </Link>
        )
      }
    >
      <dl className="space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <dt className="sr-only">{t('cal.when')}</dt>
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          <dd className="tabular-nums text-ink">{when}</dd>
        </div>

        {shown.kind === 'session' && (
          <div className="flex items-start gap-3">
            <dt className="sr-only">{t('cal.student')}</dt>
            <UserRound className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
            <dd>
              <p className="text-ink">{studentOf(shown.session)?.name ?? t('enrollments.unknownStudent')}</p>
              <p className="text-xs text-ink-4" dir="ltr">
                {studentOf(shown.session)?.email}
              </p>
              <Badge className="mt-2" tone={shown.session.status === 'completed' ? 'neutral' : 'success'}>
                {t(`cal.session.${shown.session.status === 'completed' ? 'completed' : 'booked'}`, { hours: shown.session.durationHours })}
              </Badge>
            </dd>
          </div>
        )}

        {notes && (
          <div>
            <dt className="mb-1 text-xs font-medium text-ink-3">{t('cal.notes')}</dt>
            <dd className="whitespace-pre-line text-ink-2">{notes}</dd>
          </div>
        )}

        {shown.kind === 'event' && (
          <div>
            <dt className="mb-1.5 text-xs font-medium text-ink-3">{t('cal.f.people')}</dt>
            <dd>
              {shown.event.participants.length === 0 ? (
                <p className="text-ink-4">{t('cal.noPeople')}</p>
              ) : (
                <ul className="divide-y divide-line rounded-input border border-line">
                  {shown.event.participants.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        {p.type === 'company' ? <Building2 className="size-4 shrink-0 text-ink-3" aria-hidden /> : <UserRound className="size-4 shrink-0 text-ink-3" aria-hidden />}
                        <span className="truncate text-ink">{p.type === 'lead' ? p.leadId?.fullName : p.type === 'company' ? p.companyRole : p.customName}</span>
                        <span className="shrink-0 text-xs text-ink-4">{t(`cal.who.${p.type}`)}</span>
                      </span>
                      {(p.type === 'lead' ? p.leadId?.mobileNumber : p.type === 'custom' ? p.customPhone : null) && (
                        <a href={`tel:${p.type === 'lead' ? p.leadId.mobileNumber : p.type === 'custom' ? p.customPhone : ''}`} className="shrink-0 text-xs text-ink-3 underline-offset-2 hover:underline" dir="ltr">
                          {p.type === 'lead' ? p.leadId.mobileNumber : p.type === 'custom' ? p.customPhone : ''}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        )}

        {shown.kind === 'event' && shown.event.createdBy && <p className="text-xs text-ink-4">{t('cal.createdBy', { name: shown.event.createdBy.name })}</p>}
      </dl>
    </Dialog>
  );
}
