import 'server-only';
import { SITE } from './config';

// Shapes returned by the Robotrick backend (bilingual fields: xxxEn / xxxAr)
export type Job = {
  _id: string; slug: string; titleEn: string; titleAr: string; subtitleEn?: string; subtitleAr?: string;
  descriptionEn?: string; descriptionAr?: string; imageSrc?: string; whatsapp?: boolean; badge?: boolean; status?: string; order?: number;
  duties?: { icon?: string; titleEn?: string; titleAr?: string; textEn?: string; textAr?: string }[];
  requirements?: { icon?: string; textEn?: string; textAr?: string }[];
  perks?: { icon?: string; textEn?: string; textAr?: string }[];
  workDetails?: { icon?: string; labelEn?: string; labelAr?: string; valueEn?: string; valueAr?: string }[];
};

export type Certificate = {
  certificateNumber?: string; studentName?: string; displayName?: string; courseName?: string; courseLevel?: string; trainingHours?: number | string; issuedAt?: string;
};

// Job list refreshes every 5 minutes; a backend outage shows the "couldn't load" state instead of breaking the page
export async function getJobs(): Promise<Job[] | null> {
  try {
    const res = await fetch(`${SITE.apiBase}/public/jobs`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return ((json.data ?? []) as Job[])
      .filter((j) => !j.status || j.status === 'published')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch { return null; }
}

export async function getJob(slug: string): Promise<Job | null | 'error'> {
  try {
    const res = await fetch(`${SITE.apiBase}/public/jobs/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (res.status === 404) return null;
    if (!res.ok) return 'error';
    const json = await res.json();
    const job = json?.data?.job ?? json?.data ?? null; // single-job responses nest the role under data.job
    return job?.slug ? (job as Job) : null;
  } catch { return 'error'; }
}

// Certificates are always checked live (never cached)
export async function verifyCertificate(number: string): Promise<Certificate | null | 'error'> {
  try {
    const res = await fetch(`${SITE.apiBase}/certificates/verify/${encodeURIComponent(number.toUpperCase())}`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return 'error';
    const json = await res.json();
    const c = (json.data ?? json.certificate ?? json) as Certificate;
    if (json.success === false || !(c.studentName || c.displayName || c.courseName)) return null;
    return c;
  } catch { return 'error'; }
}

// Current language first, the other language when the dashboard left it empty
export const pick = (obj: object | undefined, base: string, lang: 'en' | 'ar') => {
  const o = obj as Record<string, unknown> | undefined;
  const a = o?.[base + (lang === 'ar' ? 'Ar' : 'En')], b = o?.[base + (lang === 'ar' ? 'En' : 'Ar')];
  return (typeof a === 'string' && a.trim()) || (typeof b === 'string' && b.trim()) || '';
};

// Blog posts are written in the dashboard (one language per post) and published there
export type Post = { _id: string; slug: string; title: string; body: string; tags?: string[]; publishedAt?: string | null };

export async function getPosts(): Promise<Post[] | null> {
  try {
    const res = await fetch(`${SITE.apiBase}/posts`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return ((await res.json()) as Post[]).filter((p) => p.slug && p.title);
  } catch { return null; }
}

export async function getPost(slug: string): Promise<Post | null | 'error'> {
  try {
    const res = await fetch(`${SITE.apiBase}/posts/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    if (res.status === 404) return null;
    if (!res.ok) return 'error';
    const post = (await res.json()) as Post;
    return post?.slug ? post : null;
  } catch { return 'error'; }
}
