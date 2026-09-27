import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import AdminHeader from "../../components/layout/AdminHeader";
import { useTranslation } from 'react-i18next';

type Post = {
  _id: string;
  slug: string;
  title: string;
  body: string;
  tags?: string[];
  status: "draft" | "published";
  publishedAt?: string;
};

export default function Posts() {
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editFor, setEditFor] = useState<Post | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const canEdit =
    user?.role === "editor" ||
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.role === "reception" ||
    user?.role === "social";

  async function load() {
    const res = await api.get("/posts");
    setPosts(res.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const debouncedQuery = useDebounced(query, 250);

  const visible = useMemo(() => {
    let list = posts.slice();
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          p.body.toLowerCase().includes(q)
      );
    }
    if (sortBy === "date") {
      list.sort(
        (a, b) =>
          (new Date(b.publishedAt || 0).getTime() || 0) -
          (new Date(a.publishedAt || 0).getTime() || 0)
      );
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "status") {
      const order = { published: 0, draft: 1 } as any;
      list.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
    }
    return list;
  }, [posts, debouncedQuery, sortBy]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, page]);

  return (
    <div>
      <AdminHeader
        title="Posts"
        subtitle="Create and manage content"
        breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "Posts" }]}
        actions={
          <>
            <input
              className="input w-64"
              placeholder="Search posts..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Newest</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
            </select>
            {canEdit ? (
              <button
                className="btn"
                onClick={() => {
                  setEditFor(null);
                  setEditorOpen(true);
                }}
              >
                New Post
              </button>
            ) : null}
          </>
        }
      />
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-24"></div>
          <div className="skeleton h-24"></div>
          <div className="skeleton h-24"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-surface border border-gray-700 rounded-2xl p-6 text-gray-300">
          No posts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {paged.map((p) => (
            <div
              key={p._id}
              className="bg-surface border border-gray-700 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
            >
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <div className="text-lg font-semibold">{p.title}</div>
                  <div className="text-xs text-gray-400">
                    {p.status.toUpperCase()}{" "}
                    {p.publishedAt
                      ? `• ${new Date(p.publishedAt).toLocaleString()}`
                      : ""}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      className="btn"
                      onClick={async () => {
                        const full = await api.get(`/posts/${p._id}`);
                        setEditFor(full.data);
                        setEditorOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={async () => {
                        if (!confirm("Delete post?")) return;
                        await api.delete(`/posts/${p._id}`);
                        await load();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-300 mt-2 line-clamp-3">
                {p.body}
              </div>
              {p.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="badge">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              className="btn-outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-gray-400 text-sm">
              Page {page} of {Math.max(1, Math.ceil(visible.length / pageSize))}
            </span>
            <button
              className="btn-outline"
              disabled={page >= Math.ceil(visible.length / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editorOpen && (
        <PostEditorModal
          initial={editFor || undefined}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await load();
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function PostEditorModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Post;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(initial?.slug || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [status, setStatus] = useState<Post["status"]>(
    initial?.status || "draft"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!slug.trim() || !title.trim() || !body.trim())
      return "All fields are required";
    if (!/^[-a-z0-9]+$/i.test(slug))
      return "Slug must be alphanumeric and dashes only";
    return null;
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const err = validate();
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    const payload = {
      slug,
      title,
      body,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status,
    };
    try {
      if (initial?._id) {
        await api.put(`/posts/${initial._id}`, payload);
      } else {
        await api.post(`/posts`, payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-2xl w-full">
        <div className="text-lg font-semibold mb-2">
          {initial ? "Edit Post" : "New Post"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-gray-300">Slug</label>
            <input
              className="input w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={!!initial}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm text-gray-300">Status</label>
            <select
              className="select w-full"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm text-gray-300">Title</label>
            <input
              className="input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm text-gray-300">Body</label>
            <textarea
              className="input w-full"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm text-gray-300">
              Tags (comma separated)
            </label>
            <input
              className="input w-full"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn"
            onClick={submit}
            disabled={loading || !slug.trim() || !title.trim() || !body.trim()}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
