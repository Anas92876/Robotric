import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { DbExecutor } from '../../shared/db/client';
import { groups } from '../groups/groups.table';
import { studentProjects } from '../student-projects/student-projects.table';
import { users } from '../users/users.table';
import { type GalleryImageRow, galleryImages, type NewGalleryImageRow } from './gallery.table';

type Person = { id: string; name: string; email: string } | null;

export interface GalleryImage extends GalleryImageRow {
  group: { id: string; name: string; trainerId: string; courseId: string } | null;
  uploadedBy: Person;
  student: Person;
  project: { id: string; title: string } | null;
}

export interface GalleryFilter {
  groupId?: string;
  groupIds?: string[];
  courseId?: string;
  type?: string;
}

export interface GalleryRepository {
  list(filter: GalleryFilter, page?: { limit: number; offset: number }): Promise<GalleryImage[]>;
  count(filter: GalleryFilter): Promise<number>;
  findById(id: string): Promise<GalleryImage | null>;
  createMany(rows: NewGalleryImageRow[]): Promise<string[]>;
  delete(id: string): Promise<void>;
  countByPath(storagePath: string): Promise<number>;
}

const uploader = alias(users, 'gallery_uploader');
const student = alias(users, 'gallery_student');

function where(f: GalleryFilter): SQL | undefined {
  const g = galleryImages;
  return and(
    f.groupId ? eq(g.groupId, f.groupId) : undefined,
    f.groupIds ? (f.groupIds.length ? inArray(g.groupId, f.groupIds) : sql`false`) : undefined,
    f.courseId ? eq(groups.courseId, f.courseId) : undefined,
    f.type ? sql`${g.type}::text = ${f.type}` : undefined,
  );
}

export class DrizzleGalleryRepository implements GalleryRepository {
  constructor(private readonly db: DbExecutor) {}

  private base() {
    return this.db
      .select({
        i: galleryImages,
        group: { id: groups.id, name: groups.name, trainerId: groups.trainerId, courseId: groups.courseId },
        uploader: { id: uploader.id, name: uploader.name, email: uploader.email },
        student: { id: student.id, name: student.name, email: student.email },
        project: { id: studentProjects.id, title: studentProjects.title },
      })
      .from(galleryImages)
      .leftJoin(groups, eq(groups.id, galleryImages.groupId))
      .leftJoin(uploader, eq(uploader.id, galleryImages.uploadedById))
      .leftJoin(student, eq(student.id, galleryImages.studentId))
      .leftJoin(studentProjects, eq(studentProjects.id, galleryImages.projectId));
  }

  private static merge(r: Awaited<ReturnType<DrizzleGalleryRepository['base']>>[number]): GalleryImage {
    return {
      ...r.i,
      group: r.group?.id ? r.group : null,
      uploadedBy: r.uploader?.id ? r.uploader : null,
      student: r.student?.id ? r.student : null,
      project: r.project?.id ? r.project : null,
    };
  }

  async list(f: GalleryFilter, page?: { limit: number; offset: number }) {
    let q = this.base().where(where(f)).orderBy(asc(galleryImages.order), desc(galleryImages.createdAt)).$dynamic();
    if (page) q = q.limit(page.limit).offset(page.offset);
    return (await q).map(DrizzleGalleryRepository.merge);
  }

  async count(f: GalleryFilter) {
    const [row] = await this.db.select({ n: count() }).from(galleryImages).leftJoin(groups, eq(groups.id, galleryImages.groupId)).where(where(f));
    return row?.n ?? 0;
  }

  async findById(id: string) {
    const [row] = await this.base().where(eq(galleryImages.id, id)).limit(1);
    return row ? DrizzleGalleryRepository.merge(row) : null;
  }

  async createMany(rows: NewGalleryImageRow[]) {
    const created = await this.db.insert(galleryImages).values(rows).returning({ id: galleryImages.id });
    return created.map((r) => r.id);
  }

  async delete(id: string) {
    await this.db.delete(galleryImages).where(eq(galleryImages.id, id));
  }

  async countByPath(storagePath: string) {
    const [row] = await this.db.select({ n: count() }).from(galleryImages).where(eq(galleryImages.storagePath, storagePath));
    return row?.n ?? 0;
  }
}
