import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Archive, CheckCheck, Eye, Inbox, Mail, MailOpen, MessageCircle, Phone, Reply, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { deleteContact, getAllContacts, getContactById, updateContact, type Contact } from '../../../services/contact.service';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, PageHeader, Pagination, Panel, RowMenu, SearchInput, StatTile, type BadgeTone, type Column } from '../../../ui';

type Status = Contact['status'];
interface Filters {
  search: string;
  status: '' | Status;
  page: number;
}
const PAGE_SIZE = 20;
const ROOT = ['reception', 'contacts'] as const;
const STATUS_TONE: Record<Status, BadgeTone> = { new: 'info', read: 'neutral', replied: 'success', archived: 'neutral' };
const whatsapp = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, '').replace(/^0/, '963')}`;

/** Reception: messages sent through the website's contact form. */
export default function ContactsPage() {
  const { t } = useTranslation('dashboardReception');
  const f = useFormat();
  const toast = useToast();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>({ search: '', status: '', page: 1 });
  const patch = (p: Partial<Filters>) => setFilters((x) => ({ ...x, ...p, page: p.page ?? 1 }));

  const list = useQuery({
    queryKey: [...ROOT, filters],
    queryFn: () => getAllContacts({ page: filters.page, limit: PAGE_SIZE, search: filters.search || undefined, status: filters.status || undefined }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ROOT });
  const setStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: Status }) => updateContact(id, { status }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => deleteContact(id), onSuccess: refresh });

  const [open, setOpen] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const lastDeleting = useRef<Contact | null>(null);
  if (deleting) lastDeleting.current = deleting;
  const lastOpen = useRef<Contact | null>(null);
  if (open) lastOpen.current = open;
  const shown = open ?? lastOpen.current;

  /** Opening a new message marks it as read (as before). */
  const view = async (c: Contact) => {
    setOpen(c);
    try {
      const full = await getContactById(c._id);
      setOpen(full.status === 'new' ? { ...full, status: 'read' } : full);
      if (full.status === 'new') await setStatus.mutateAsync({ id: c._id, status: 'read' });
    } catch (err) {
      toast.error(t('enrollments.errorTitle'), readApiError(err).message);
    }
  };
  const mark = async (c: Contact, status: Status) => {
    try {
      await setStatus.mutateAsync({ id: c._id, status });
      if (open?._id === c._id) setOpen({ ...open, status });
      toast.success(t(`contacts.toast.${status}`));
    } catch (err) {
      toast.error(t('enrollments.errorTitle'), readApiError(err).message);
    }
  };
  const who = (c: Contact) => (c.who ? (c.who === 'other' && c.otherType ? `${t('contacts.who.other')} · ${c.otherType}` : t(`contacts.who.${c.who}`)) : '');

  const columns: Column<Contact>[] = useMemo(
    () => [
      {
        key: 'sender',
        header: t('contacts.col.sender'),
        cell: (c) => (
          <button type="button" onClick={() => void view(c)} className="flex items-center gap-3 rounded-input text-start focus-visible:focus-ring">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', c.status === 'new' ? 'bg-ink text-white' : 'bg-rail text-ink-3')}>
              {c.status === 'new' ? <Mail className="size-[18px]" /> : <MailOpen className="size-[18px]" />}
            </span>
            <span className="min-w-0">
              <span className={cn('block truncate text-ink', c.status === 'new' ? 'font-semibold' : 'font-medium')}>{c.name}</span>
              {c.who && <span className="block truncate text-xs text-ink-4">{who(c)}</span>}
            </span>
          </button>
        ),
      },
      {
        key: 'phone',
        header: t('contacts.col.phone'),
        cell: (c) => (
          <a href={`tel:${c.phone}`} dir="ltr" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
            <Phone className="size-3.5 text-ink-4" aria-hidden />
            {c.phone}
          </a>
        ),
      },
      { key: 'subject', header: t('contacts.col.subject'), cell: (c) => <span className={cn('line-clamp-2', c.status === 'new' ? 'font-medium text-ink' : 'text-ink-2')}>{c.subject}</span> },
      { key: 'date', header: t('contacts.col.received'), hideOnMobile: true, cell: (c) => <span className="tabular-nums">{f.date(c.createdAt)}</span> },
      { key: 'status', header: t('contacts.col.status'), cell: (c) => <Badge tone={STATUS_TONE[c.status]}>{t(`contacts.status.${c.status}`)}</Badge> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('contacts.col.actions')}</span>,
        align: 'end',
        cell: (c) => (
          <RowMenu
            label={t('contacts.actionsFor', { name: c.name })}
            actions={[
              { label: t('contacts.menu.open'), icon: <Eye />, onClick: () => void view(c) },
              { label: t('contacts.menu.replied'), icon: <CheckCheck />, onClick: () => void mark(c, 'replied'), hidden: c.status === 'replied' },
              { label: t('contacts.menu.archive'), icon: <Archive />, onClick: () => void mark(c, 'archived'), hidden: c.status === 'archived' },
              { label: t('contacts.menu.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(c) },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f],
  );

  const s = list.data?.stats;
  const tile = (status: Filters['status']) => ({ onClick: () => patch({ status }), active: filters.status === status && !filters.search });

  return (
    <div className="space-y-5">
      <PageHeader title={t('contacts.title')} description={t('contacts.subtitle')} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile icon={<Inbox />} tint="bg-tint-leaf" label={t('contacts.stats.total')} value={s?.total} loading={list.isLoading} {...tile('')} />
        <StatTile icon={<Mail />} tint="bg-tint-straw" label={t('contacts.status.new')} value={s?.new} loading={list.isLoading} {...tile('new')} />
        <StatTile icon={<MailOpen />} tint="bg-tint-sand" label={t('contacts.status.read')} value={s?.read} loading={list.isLoading} {...tile('read')} />
        <StatTile icon={<Reply />} tint="bg-tint-sage" label={t('contacts.status.replied')} value={s?.replied} loading={list.isLoading} {...tile('replied')} />
        <StatTile icon={<Archive />} tint="bg-tint-khaki" label={t('contacts.status.archived')} value={s?.archived} loading={list.isLoading} {...tile('archived')} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="border-b border-line p-4">
          <SearchInput value={filters.search} onChange={(search) => patch({ search })} placeholder={t('contacts.search')} />
        </div>
        {list.isError ? (
          <EmptyState icon={<Inbox />} title={t('contacts.loadError')} action={<Button variant="secondary" onClick={() => void list.refetch()}>{t('leads.retry')}</Button>} />
        ) : (
          <div className={cn('transition-opacity', list.isFetching && !list.isLoading && 'opacity-60')}>
            <DataTable
              label={t('contacts.title')}
              columns={columns}
              rows={list.data?.data ?? []}
              rowKey={(c) => c._id}
              loading={list.isLoading}
              empty={<EmptyState icon={<Inbox />} title={filters.search || filters.status ? t('contacts.noMatch') : t('contacts.empty')} />}
            />
          </div>
        )}
        <Pagination
          page={filters.page}
          pages={list.data?.pagination?.pages ?? 1}
          total={list.data?.pagination?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPage={(page) => patch({ page })}
          summary={(from, to, total) => t('users.pageSummary', { from, to, total })}
          labels={{ previous: t('users.previous'), next: t('users.next') }}
        />
      </Panel>

      <Dialog
        open={!!open}
        onClose={() => setOpen(null)}
        size="lg"
        title={shown?.subject ?? ''}
        description={shown ? t('contacts.receivedOn', { date: f.date(shown.createdAt), time: f.time(shown.createdAt) }) : undefined}
        closeLabel={t('enrollments.cancel')}
        footer={
          shown && (
            <>
              <Button variant="ghost" icon={<Trash2 />} className="me-auto text-danger" onClick={() => { setDeleting(shown); setOpen(null); }}>
                {t('contacts.menu.delete')}
              </Button>
              {shown.status !== 'archived' && (
                <Button variant="secondary" icon={<Archive />} onClick={() => void mark(shown, 'archived')}>
                  {t('contacts.menu.archive')}
                </Button>
              )}
              {shown.status !== 'replied' && (
                <Button icon={<CheckCheck />} onClick={() => void mark(shown, 'replied')}>
                  {t('contacts.menu.replied')}
                </Button>
              )}
            </>
          )
        }
      >
        {shown && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-card bg-rail p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{shown.name}</p>
                <p className="text-sm text-ink-3">{[who(shown), shown.location].filter(Boolean).join(' · ')}</p>
              </div>
              <Badge tone={STATUS_TONE[shown.status]}>{t(`contacts.status.${shown.status}`)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${shown.phone}`} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink">
                <Phone className="size-4" aria-hidden />
                <span dir="ltr">{shown.phone}</span>
              </a>
              <a href={whatsapp(shown.phone)} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-pill bg-success px-4 text-sm font-medium text-white hover:brightness-95">
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
              {shown.email && (
                <a href={`mailto:${shown.email}`} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm font-medium text-ink hover:border-ink">
                  <Mail className="size-4" aria-hidden />
                  <span dir="ltr">{shown.email}</span>
                </a>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-ink">{t('contacts.message')}</p>
              <p className="whitespace-pre-wrap rounded-card border border-line p-4 text-sm leading-relaxed text-ink-2">{shown.message || t('contacts.noMessage')}</p>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={remove.isPending}
        title={t('contacts.deleteTitle')}
        message={t('contacts.deleteText', { name: (deleting ?? lastDeleting.current)?.name ?? '' })}
        confirmLabel={t('contacts.menu.delete')}
        cancelLabel={t('enrollments.cancel')}
        onConfirm={() =>
          void remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('contacts.toast.deleted')))
            .catch((err) => toast.error(t('enrollments.errorTitle'), readApiError(err).message))
            .finally(() => setDeleting(null))
        }
      />
    </div>
  );
}
