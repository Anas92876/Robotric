import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { readApiError } from '../../../app/apiError';
import { cn } from '../../../lib/utils';
import { Button, Dialog, Field, TextArea, TextInput } from '../../../ui';
import { slugify, type Post, type PostInput } from './api';

interface Props {
  open: boolean;
  onClose: () => void;
  post: Post | null;
  saving: boolean;
  onSave: (d: PostInput) => Promise<void>;
}

/** Write or edit a post: title, link name, text, tags, draft or published. */
export function PostDialog({ open, onClose, post, saving, onSave }: Props) {
  const { t } = useTranslation('dashboardCommon');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [status, setStatus] = useState<Post['status']>('draft');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(post?.title ?? '');
    setSlug(post?.slug ?? '');
    setSlugTouched(!!post);
    setBody(post?.body ?? '');
    setTags(post?.tags ?? []);
    setTagDraft('');
    setStatus(post?.status ?? 'draft');
    setError('');
  }, [open, post]);

  const addTag = () => {
    const v = tagDraft.trim().replace(/^#/, '').replace(/,$/, '');
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagDraft('');
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !tagDraft && tags.length) setTags(tags.slice(0, -1));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(t('posts.errTitle'));
    if (!post && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return setError(t('posts.errSlug'));
    if (!body.trim()) return setError(t('posts.errBody'));
    setError('');
    const pending = tagDraft.trim() ? [...tags, tagDraft.trim()] : tags;
    try {
      await onSave({ ...(post ? {} : { slug }), title: title.trim(), body, tags: [...new Set(pending)], status });
    } catch (err) {
      setError(readApiError(err).message);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t(post ? 'posts.editTitle' : 'posts.newTitle')}
      closeLabel={t('close')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" form="post-form" loading={saving}>
            {t(status === 'published' ? (post?.status === 'published' ? 'posts.saveChanges' : 'posts.publishNow') : 'posts.saveDraft')}
          </Button>
        </>
      }
    >
      <form id="post-form" onSubmit={submit} className="space-y-4" noValidate>
        <Field label={t('posts.f.title')} required>
          {(c) => (
            <TextInput
              {...c}
              value={title}
              autoFocus
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          )}
        </Field>
        <Field label={t('posts.f.slug')} required={!post} hint={post ? t('posts.f.slugLocked') : t('posts.f.slugHint')}>
          {(c) => (
            <div className="flex items-center rounded-input border border-line-strong bg-paper focus-within:border-ink focus-within:focus-ring" dir="ltr">
              <span className="ps-3.5 text-sm text-ink-4">/blog/</span>
              <input
                {...c}
                value={slug}
                disabled={!!post}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                className="h-11 w-full min-w-0 rounded-input bg-transparent pe-3.5 text-[15px] text-ink outline-none disabled:text-ink-3"
              />
            </div>
          )}
        </Field>
        <Field label={t('posts.f.body')} required hint={t('posts.f.words', { count: body.trim() ? body.trim().split(/\s+/).length : 0 })}>
          {(c) => <TextArea {...c} rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="leading-relaxed" />}
        </Field>
        <Field label={t('posts.f.tags')} hint={t('posts.f.tagsHint')}>
          {(c) => (
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-input border border-line-strong bg-paper px-2 py-1.5 focus-within:border-ink focus-within:focus-ring">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex h-7 items-center gap-1 rounded-pill bg-rail ps-2.5 pe-1 text-sm text-ink">
                  #{tag}
                  <button type="button" onClick={() => setTags(tags.filter((x) => x !== tag))} aria-label={t('posts.f.removeTag', { tag })} className="grid size-5 place-items-center rounded-full text-ink-3 hover:bg-ink/10 hover:text-ink">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input {...c} value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={addTag} className="h-7 min-w-28 flex-1 bg-transparent px-1 text-sm text-ink outline-none" />
            </div>
          )}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-ink">{t('posts.f.visibility')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['draft', 'published'] as const).map((s) => (
              <label key={s} className={cn('flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors has-[:focus-visible]:focus-ring', status === s ? 'border-ink bg-frost' : 'border-line-strong hover:border-ink')}>
                <input type="radio" name="post-status" value={s} checked={status === s} onChange={() => setStatus(s)} className="mt-1 size-4 accent-[#0f1f33]" />
                <span>
                  <span className="block text-sm font-medium text-ink">{t(`posts.status.${s}`)}</span>
                  <span className="block text-xs text-ink-4">{t(`posts.status.${s}Hint`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
