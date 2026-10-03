import { newId } from '../../shared/db/ids';
import { BadRequestError } from '../../shared/http/errors';
import type { Logger } from '../../shared/logger';
import type { FileStorage } from '../../shared/storage/file-storage';
import type { TrainingContentRepository } from './training-content.repository';
import {
  type ContentImage,
  type Lang,
  LANGS,
  PROGRAM_TRACKS,
  type ProgramTrack,
  type StatsValues,
  type Tracks,
} from './training-content.schemas';
import type { TrainingPageContentRow } from './training-content.table';

export interface ImageUpload {
  buffer: Buffer;
  mimetype: string;
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Parses a URL index segment; throws 400 with the old API's message if invalid. */
export function parseIndex(raw: string, message: string): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) throw new BadRequestError(message);
  return n;
}

export function assertLang(lang: string): asserts lang is Lang {
  if (!(LANGS as readonly string[]).includes(lang)) throw new BadRequestError('lang must be "ar" or "en"');
}

function assertProgramTrack(track: string): asserts track is ProgramTrack {
  if (!(PROGRAM_TRACKS as readonly string[]).includes(track)) throw new BadRequestError('Invalid trackId');
}

/**
 * Images are shared between the Arabic and English documents: uploading
 * adds the same image to the same program in both languages.
 */
export class TrainingContentService {
  constructor(
    private readonly content: TrainingContentRepository,
    private readonly storage: FileStorage,
    private readonly imagesBucket: string,
    private readonly logger: Logger,
  ) {}

  get(lang: Lang): Promise<TrainingPageContentRow | null> {
    return this.content.find(lang);
  }

  async getBoth(): Promise<{ ar: TrainingPageContentRow | null; en: TrainingPageContentRow | null }> {
    const [ar, en] = await Promise.all([this.content.find('ar'), this.content.find('en')]);
    return { ar, en };
  }

  upsert(lang: Lang, statsValues: StatsValues, tracks: Tracks): Promise<TrainingPageContentRow> {
    return this.content.upsert(lang, statsValues, tracks);
  }

  private async storeImage(file: ImageUpload | undefined, prefix: string): Promise<ContentImage> {
    if (!file) throw new BadRequestError('No image provided');
    const ext = EXTENSIONS[file.mimetype] ?? 'img';
    const stored = await this.storage.upload({
      bucket: this.imagesBucket,
      path: `${prefix}_${newId()}.${ext}`,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return { url: this.storage.publicUrl(stored), publicId: stored.path };
  }

  private async deleteStored(publicId: string): Promise<void> {
    if (publicId) await this.storage.remove({ bucket: this.imagesBucket, path: publicId });
  }

  // ─── summer / winter / competitions programs ─────────────────────────────

  async addProgramImage(track: string, rawIndex: string, file: ImageUpload | undefined): Promise<ContentImage> {
    assertProgramTrack(track);
    const idx = parseIndex(rawIndex, 'Invalid programIndex');
    const image = await this.storeImage(file, `training_${track}`);
    await this.content.editTracksOfAll((tracks) => {
      const program = tracks[track].programs[idx];
      if (!program) return false;
      program.images.push(image);
      return true;
    });
    return image;
  }

  async removeProgramImage(track: string, rawIndex: string, publicId: string): Promise<void> {
    assertProgramTrack(track);
    const idx = parseIndex(rawIndex, 'Invalid programIndex');
    await this.deleteStored(publicId);
    await this.content.editTracksOfAll((tracks) => {
      const program = tracks[track].programs[idx];
      if (!program) return false;
      program.images = program.images.filter((i) => i.publicId !== publicId);
      return true;
    });
  }

  // ─── yearRound departments ───────────────────────────────────────────────

  /** Replaces the department cover; the previous cover file is deleted. */
  async setDepartmentCover(rawDept: string, file: ImageUpload | undefined): Promise<ContentImage> {
    const di = parseIndex(rawDept, 'Invalid deptIndex');
    const image = await this.storeImage(file, 'training_department');
    const replaced = new Set<string>();
    await this.content.editTracksOfAll((tracks) => {
      const dept = tracks.yearRound.departments[di];
      if (!dept) return false;
      if (dept.coverImage.publicId) replaced.add(dept.coverImage.publicId);
      dept.coverImage = image;
      return true;
    });
    for (const old of replaced) await this.deleteStored(old).catch((err: unknown) => this.logger.warn({ err }, 'Old cover delete failed'));
    return image;
  }

  async removeDepartmentCover(rawDept: string): Promise<void> {
    const di = parseIndex(rawDept, 'Invalid deptIndex');
    const removed = new Set<string>();
    await this.content.editTracksOfAll((tracks) => {
      const dept = tracks.yearRound.departments[di];
      if (!dept) return false;
      if (dept.coverImage.publicId) removed.add(dept.coverImage.publicId);
      dept.coverImage = { url: '', publicId: '' };
      return true;
    });
    for (const old of removed) await this.deleteStored(old);
  }

  async addDepartmentProgramImage(rawDept: string, rawProgram: string, file: ImageUpload | undefined): Promise<ContentImage> {
    const di = parseIndex(rawDept, 'Invalid index');
    const pi = parseIndex(rawProgram, 'Invalid index');
    const image = await this.storeImage(file, `training_dept${di}`);
    await this.content.editTracksOfAll((tracks) => {
      const program = tracks.yearRound.departments[di]?.programs[pi];
      if (!program) return false;
      program.images.push(image);
      return true;
    });
    return image;
  }

  async removeDepartmentProgramImage(rawDept: string, rawProgram: string, publicId: string): Promise<void> {
    const di = parseIndex(rawDept, 'Invalid index');
    const pi = parseIndex(rawProgram, 'Invalid index');
    await this.deleteStored(publicId);
    await this.content.editTracksOfAll((tracks) => {
      const program = tracks.yearRound.departments[di]?.programs[pi];
      if (!program) return false;
      program.images = program.images.filter((i) => i.publicId !== publicId);
      return true;
    });
  }
}
