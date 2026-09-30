import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, CheckCircle2, GraduationCap, Pencil, Presentation, Trash2, UserPlus, UserX, Users } from 'lucide-react';
import { useAuth } from '../../../providers';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, PageHeader, Pagination, Panel, RowMenu, SearchInput, SelectInput, StatTile, type Column } from '../../../ui';
import { PAGE_SIZE, useAccountCounts, useAccountMutations, useAccounts, type Account, type AccountFilters } from './api';
import { AccountFormDialog } from './AccountFormDialog';
import { filterableRoles, permissionsFor, roleIcon } from './roles';

type Pending = { kind: 'toggle' | 'delete'; account: Account } | null;

/** Reception: every account (students, trainers, staff) — search, filter, create, edit, disable, delete. */
export default function AccountsPage() {
  const { t } = useTranslation(['dashboardReception', 'dashboardNav']);
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const me = user ? { id: user.id ?? user._id ?? '', role: user.role } : null;

  const [filters, setFilters] = useState<AccountFilters>({ search: '', role: '', status: 'active', page: 1 });
  const accounts = useAccounts(filters);
  const counts = useAccountCounts();
  const { create, update, remove } = useAccountMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  // The confirm dialog keeps showing the last action while it fades out
  const lastPending = useRef<Pending>(null);
  if (pending) lastPending.current = pending;
  const shown = pending ?? lastPending.current;

  const patch = (p: Partial<AccountFilters>) => setFilters((x) => ({ ...x, ...p, page: p.page ?? 1 }));
  const roleName = (r: string) => t(`dashboardNav:role.${r}`, r);
  const isDisabled = (a: Account) => a.profile?.status === 'inactive';

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setFormOpen(true);
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, account } = pending;
    try {
      if (kind === 'delete') {
        await remove.mutateAsync(account._id);
        toast.success(t('users.toast.deleted', { name: account.name }));
      } else {
        const next = isDisabled(account) ? 'active' : 'inactive';
        await update.mutateAsync({ id: account._id, body: { status: next } });
        toast.success(t(next === 'inactive' ? 'users.toast.disabled' : 'users.toast.enabled', { name: account.name }));
      }
      setPending(null);
    } catch (err) {
      const { code, message } = readApiError(err);
      const key = { USER_IN_USE: 'inUse', SELF_DELETE: 'self', SELF_DISABLE: 'self', PRIVILEGED_ROLE: 'privileged' }[code ?? ''];
      toast.error(t('users.errors.title'), key ? t(`users.errors.${key}`) : message);
      setPending(null);
    }
  };

  const columns: Column<Account>[] = useMemo(
    () => [
      {
        key: 'person',
        header: t('users.col.person'),
        cell: (a) => (
          <div className="flex items-center gap-3">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-full font-semibold', isDisabled(a) ? 'bg-rail text-ink-4' : 'bg-tint-leaf text-ink')}>{a.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <p className={cn('truncate font-medium', isDisabled(a) ? 'text-ink-3' : 'text-ink')}>
                {a.name}
                {me?.id === a._id && <span className="ms-2 rounded-pill bg-rail px-2 py-0.5 text-[11px] font-medium text-ink-3">{t('users.you')}</span>}
              </p>
              {a.profile?.phone && (
                <p className="text-xs text-ink-4" dir="ltr">
                  {a.profile.phone}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: t('users.col.email'),
        hideOnMobile: true,
        cell: (a) => (
          <span dir="ltr" className="text-ink-2">
            {a.email}
          </span>
        ),
      },
      {
        key: 'role',
        header: t('users.col.role'),
        cell: (a) => {
          const Icon = roleIcon(a.role);
          return (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-rail px-2.5 py-1 text-xs font-medium text-ink">
              <Icon className="size-3.5" aria-hidden />
              {roleName(a.role)}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: t('users.col.status'),
        cell: (a) => (isDisabled(a) ? <Badge tone="neutral">{t('users.disabled')}</Badge> : <Badge tone="success">{t('users.active')}</Badge>),
      },
      { key: 'joined', header: t('users.col.joined'), hideOnMobile: true, cell: (a) => <span className="tabular-nums">{f.date(a.createdAt)}</span> },
      {
        key: 'actions',
        header: <span className="sr-only">{t('users.col.actions')}</span>,
        align: 'end',
        cell: (a) => {
          const can = permissionsFor({ id: a._id, role: a.role }, me);
          return (
            <RowMenu
              label={t('users.actionsFor', { name: a.name })}
              actions={[
                { label: t('users.edit'), icon: <Pencil />, onClick: () => openEdit(a), hidden: !can.canEdit },
                isDisabled(a)
                  ? { label: t('users.enable'), icon: <CheckCircle2 />, onClick: () => setPending({ kind: 'toggle', account: a }), hidden: !can.canToggle }
                  : { label: t('users.disable'), icon: <Ban />, onClick: () => setPending({ kind: 'toggle', account: a }), hidden: !can.canToggle },
                { label: t('users.delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setPending({ kind: 'delete', account: a }), hidden: !can.canDelete },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, f, me?.id, me?.role],
  );

  const data = accounts.data;
  const filtered = !!(filters.search || filters.role);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('users.title')}
        description={t('users.subtitle')}
        actions={
          <Button icon={<UserPlus />} onClick={openCreate}>
            {t('users.new')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Users />} tint="bg-tint-leaf" label={t('users.stats.active')} value={counts.data?.active} loading={counts.isLoading} onClick={() => patch({ status: 'active', role: '' })} active={filters.status === 'active' && !filters.role} />
        <StatTile icon={<GraduationCap />} tint="bg-tint-straw" label={t('users.stats.students')} value={counts.data?.students} loading={counts.isLoading} onClick={() => patch({ status: 'active', role: 'student' })} active={filters.status === 'active' && filters.role === 'student'} />
        <StatTile icon={<Presentation />} tint="bg-tint-sage" label={t('users.stats.trainers')} value={counts.data?.trainers} loading={counts.isLoading} onClick={() => patch({ status: 'active', role: 'trainer' })} active={filters.status === 'active' && filters.role === 'trainer'} />
        <StatTile icon={<UserX />} tint="bg-tint-sand" label={t('users.stats.disabled')} value={counts.data?.disabled} loading={counts.isLoading} onClick={() => patch({ status: 'inactive', role: '' })} active={filters.status === 'inactive' && !filters.role} />
      </div>

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput value={filters.search} onChange={(search) => patch({ search })} placeholder={t('users.search')} />
          </div>
          <SelectInput aria-label={t('users.col.role')} value={filters.role} onChange={(e) => patch({ role: e.target.value })} className="w-auto min-w-44">
            <option value="">{t('users.allRoles')}</option>
            {filterableRoles(me?.role).map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </SelectInput>
          <div role="group" aria-label={t('users.col.status')} className="flex h-11 items-center gap-0.5 rounded-pill border border-line bg-rail p-1">
            {(['active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filters.status === s}
                onClick={() => patch({ status: s })}
                className={cn('h-full rounded-pill px-4 text-sm font-medium transition-colors focus-visible:focus-ring', filters.status === s ? 'bg-ink text-white' : 'text-ink-3 hover:text-ink')}
              >
                {s === 'active' ? t('users.active') : t('users.disabled')}
              </button>
            ))}
          </div>
        </div>

        {accounts.isError ? (
          <EmptyState icon={<UserX />} title={t('users.loadError')} action={<Button variant="secondary" onClick={() => void accounts.refetch()}>{t('users.retry')}</Button>} />
        ) : (
          <div className={cn('transition-opacity', accounts.isFetching && !accounts.isLoading && 'opacity-60')}>
            <DataTable
              label={t('users.title')}
              columns={columns}
              rows={data?.rows ?? []}
              rowKey={(a) => a._id}
              loading={accounts.isLoading}
              empty={
                <EmptyState
                  icon={<Users />}
                  title={filtered ? t('users.noMatch') : filters.status === 'inactive' ? t('users.noDisabled') : t('users.empty')}
                  description={filtered ? t('users.noMatchHint') : undefined}
                  action={filtered ? <Button variant="secondary" onClick={() => patch({ search: '', role: '' })}>{t('users.clearFilters')}</Button> : undefined}
                />
              }
            />
          </div>
        )}
        <Pagination
          page={filters.page}
          pages={data?.pages ?? 1}
          total={data?.total ?? 0}
          pageSize={PAGE_SIZE}
          onPage={(page) => patch({ page })}
          summary={(from, to, total) => t('users.pageSummary', { from, to, total })}
          labels={{ previous: t('users.previous'), next: t('users.next') }}
        />
      </Panel>

      <AccountFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        account={editing}
        viewerRole={me?.role}
        onSubmit={async (input) => {
          if (editing) {
            await update.mutateAsync({ id: editing._id, body: input });
            toast.success(t('users.toast.saved', { name: input.name }));
          } else {
            await create.mutateAsync(input);
            toast.success(t('users.toast.created', { name: input.name }));
          }
        }}
      />

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmPending()}
        loading={remove.isPending || update.isPending}
        tone={shown?.kind === 'delete' || (shown && !isDisabled(shown.account)) ? 'danger' : 'default'}
        title={
          shown?.kind === 'delete' ? t('users.confirm.deleteTitle') : shown && isDisabled(shown.account) ? t('users.confirm.enableTitle') : t('users.confirm.disableTitle')
        }
        message={
          shown
            ? t(shown.kind === 'delete' ? 'users.confirm.deleteText' : isDisabled(shown.account) ? 'users.confirm.enableText' : 'users.confirm.disableText', { name: shown.account.name })
            : ''
        }
        confirmLabel={shown?.kind === 'delete' ? t('users.delete') : shown && isDisabled(shown.account) ? t('users.enable') : t('users.disable')}
        cancelLabel={t('users.form.cancel')}
      />
    </div>
  );
}
