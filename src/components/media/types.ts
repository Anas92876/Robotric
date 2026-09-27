export type MediaKind = 'image' | 'video' | 'audio';

export interface StagedMediaFile {
  id: string;
  file: File;
  kind: MediaKind;
  previewUrl: string;
  durationSeconds?: number;
  status: 'staged' | 'uploading' | 'done' | 'error';
  progress: number; // 0-100
  error?: string;
}

export interface RemoteMediaItem {
  _id: string;
  kind: MediaKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  uploadedAt: string;
  url: string;
}

export const MEDIA_LIMITS = {
  image: 15 * 1024 * 1024,
  video: 300 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
} as const;

export const ALLOWED_MEDIA_MIME: Record<MediaKind, string[]> = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/mpeg', 'audio/ogg'],
};

export function kindOfMime(mimetype: string): MediaKind | null {
  if (ALLOWED_MEDIA_MIME.image.includes(mimetype)) return 'image';
  if (ALLOWED_MEDIA_MIME.video.includes(mimetype)) return 'video';
  if (ALLOWED_MEDIA_MIME.audio.includes(mimetype)) return 'audio';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
