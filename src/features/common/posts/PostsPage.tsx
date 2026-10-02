import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Eye, FilePen, FileText, Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../providers/AuthProvider';
import { useToast } from '../../../components/ui/Toast';
import { useFormat } from '../../../app/format';
import { readApiError } from '../../../app/apiError';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, PageHeader, Panel, RowMenu, SearchInput, SelectInput, StatTile, type Column } from '../../../ui';
import { usePostMutations, usePosts, WRITERS, type Post } from './api';
import { PostDialog } from './PostDialog';

type Sort = 'recent' | 'title';
type View = '' | Post['status'];

/** Blog posts of the centre: writers draft, publish and edit them; other staff can read them. */
export default function PostsPage() {
  const { t } = useTranslation('dashboardCommon');
  const f = useFormat();
  const toast = useToast();
  const { user } = useAuth();
  const writer = WRITERS.includes(user?.role ?? '');
  const posts = usePosts(writer);
  const { save, remove } = usePostMutations();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [view, setView] = useState<View>('');
  const [form, setForm] = useState<{ post: Post | null } | null>(null);
  const [reading, setReading] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const lastForm = useRef<Post | null>(null);
  const lastReading = useRef<Post | null>(null);
  const lastDeleting = useRef<Post | null>(null);
  if (form) lastForm.current = form.post;
  if (reading) lastReading.current = reading;
  if (deleting) lastDeleting.current = deleting;
  const shownRead = reading ?? lastReading.current;

  const all = posts.data ?? [];
  const q = search.trim().toLowerCase();
  const rows = all
    .filter((p) => !view || p.status === view)
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.tags.some((x) => x.toLowerCase().includes(q)))
    .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : +new Date(b.publishedAt ?? b.updatedAt) - +new Date(a.publishedAt ?? a.updatedAt)));

  const columns: Column<Post>[] = useMemo(
    () => [
      {
        key: 'post',
        header: t('posts.col.post'),
        cell: (p) => (
          <button type="button" onClick={() => setReading(p)} className="block max-w-xl text-start focus-visible:focus-ring rounded-md">
            <span className="block truncate font-medium text-ink hover:underline underline-offset-2">{p.title}</span>
            <span className="mt-0.5 line-clamp-1 text-xs text-ink-4">{p.body}</span>
          </button>
        ),
      },
      {
        key: 'tags',
        header: t('posts.col.tags'),
        hideOnMobile: true,
        cell: (p) =>
          p.tags.length ? (
            <div className="flex max-w-56 flex-wrap gap-1">
              {p.tags.slice(0, 3).map((x) => (
                <span key={x} className="rounded-pill bg-rail px-2 py-0.5 text-xs text-ink-2">
                  #{x}
                </span>
              ))}
              {p.tags.length > 3 && <span className="text-xs text-ink-4">+{p.tags.length - 3}</span>}
            </div>
          ) : (
            <span className="text-ink-4">—</span>
          ),
      },
      { key: 'status', header: t('posts.col.status'), cell: (p) => <Badge tone={p.status === 'published' ? 'success' : 'neutral'}>{t(`posts.status.${p.status}`)}</Badge> },
      {
        key: 'date',
        header: t('posts.col.date'),
        hideOnMobile: true,
        cell: (p) => (
          <div className="whitespace-nowrap tabular-nums">
            <p className="text-ink-2">{f.date(p.publishedAt ?? p.updatedAt)}</p>
            <p className="text-xs text-ink-4">{t(p.publishedAt ? 'posts.publishedOn' : 'posts.editedOn')}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">{t('actions')}</span>,
        align: 'end',
        cell: (p) => (
          <RowMenu
            label={t('posts.actionsFor', { title: p.title })}
            actions={[
              { label: t('posts.read'), icon: <Eye />, onClick: () => setReading(p) },
              { label: t('edit'), icon: <Pencil />, onClick: () => setForm({ post: p }), hidden: !writer },
              { label: t('delete'), icon: <Trash2 />, tone: 'danger', onClick: () => setDeleting(p), hidden: !writer },
            ]}
          />
        ),
      },
    ],
    [t, f, writer],
  );

  const tile = (v: View) => ({ onClick: () => setView(v), active: view === v });
  const newButton = writer ? (
    <Button icon={<Plus />} onClick={() => setForm({ post: null })}>
      {t('posts.new')}
    </Button>
  ) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title={t('posts.title')} description={t(writer ? 'posts.subtitle' : 'posts.subtitleReader')} actions={newButton} />

      {writer && (
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={<FileText />} tint="bg-tint-leaf" label={t('posts.allPosts')} value={all.length} loading={posts.isLoading} {...tile('')} />
          <StatTile icon={<Globe />} tint="bg-tint-straw" label={t('posts.status.published')} value={all.filter((p) => p.status === 'published').length} loading={posts.isLoading} {...tile('published')} />
          <StatTile icon={<FilePen />} tint="bg-tint-sand" label={t('posts.status.draft')} value={all.filter((p) => p.status === 'draft').length} loading={posts.isLoading} {...tile('draft')} />
        </div>
      )}

      <Panel className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="min-w-56 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder={t('posts.search')} />
          </div>
          <SelectInput aria-label={t('posts.sort')} value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-auto min-w-40">
            <option value="recent">{t('posts.sortRecent')}</option>
            <option value="title">{t('posts.sortTitle')}</option>
          </SelectInput>
        </div>
        {posts.isError ? (
          <EmptyState icon={<BookOpen />} title={t('posts.loadError')} action={<Button variant="secondary" onClick={() => void posts.refetch()}>{t('retry')}</Button>} />
        ) : (
          <DataTable
            label={t('posts.title')}
            columns={columns}
            rows={rows}
            rowKey={(p) => p._id}
            loading={posts.isLoading}
            empty={<EmptyState icon={<BookOpen />} title={t(all.length ? 'posts.noMatch' : 'posts.none')} action={all.length ? undefined : newButton} />}
          />
        )}
      </Panel>

      <Dialog
        open={!!reading}
        onClose={() => setReading(null)}
        size="lg"
        title={shownRead?.title ?? ''}
        description={shownRead ? `${t(`posts.status.${shownRead.status}`)} · ${f.date(shownRead.publishedAt ?? shownRead.updatedAt)}` : ''}
        closeLabel={t('close')}
        footer={
          writer && shownRead ? (
            <Button icon={<Pencil />} onClick={() => { const p = shownRead; setReading(null); setForm({ post: p }); }}>
              {t('edit')}
            </Button>
          ) : undefined
        }
      >
        {shownRead && (
          <article>
            <p className="max-h-[55vh] overflow-y-auto whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{shownRead.body}</p>
            {shownRead.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {shownRead.tags.map((x) => (
                  <span key={x} className="rounded-pill bg-rail px-2.5 py-0.5 text-xs text-ink-2">
                    #{x}
                  </span>
                ))}
              </div>
            )}
          </article>
        )}
      </Dialog>

      <PostDialog
        open={!!form}
        onClose={() => setForm(null)}
        post={form ? form.post : lastForm.current}
        saving={save.isPending}
        onSave={async (d) => {
          const id = form?.post?._id;
          await save.mutateAsync({ id, d });
          toast.success(t(d.status === 'published' ? 'posts.toast.published' : 'posts.toast.saved'));
          setForm(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        tone="danger"
        loading={remove.isPending}
        title={t('posts.deleteTitle')}
        message={t('posts.deleteText', { title: (deleting ?? lastDeleting.current)?.title ?? '' })}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        onConfirm={() =>
          void remove
            .mutateAsync(deleting!._id)
            .then(() => toast.success(t('posts.toast.deleted')))
            .catch((err) => toast.error(t('errorMessage'), readApiError(err).message))
            .finally(() => setDeleting(null))
        }
      />
    </div>
  );
}
