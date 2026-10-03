import { isValidId } from "../../shared/db/ids";
import { AppError } from "../../shared/http/errors";
import type { PdfRenderer } from "../../shared/pdf/pdf-renderer";
import type { CourseRepository } from "../courses/courses.repository";
import type { GroupRepository } from "../groups/groups.repository";
import type { LeadRepository } from "../leads/leads.repository";
import { certificateHtml } from "./certificate-html";
import type {
  Certificate,
  CertificateCourse,
  CertificateRepository,
} from "./certificates.repository";

/** The course's training hours: `totalHours`, else the first number in `duration` ("40 hours"). */
export function courseHours(
  course: Pick<CertificateCourse, "totalHours" | "duration"> | null | undefined,
): number {
  if (!course) return 0;
  if (course.totalHours) return course.totalHours;
  const m = String(course.duration ?? "").match(/(\d+\.?\d*)/);
  return m ? Number.parseFloat(m[1]!) : 0;
}

export interface IssueResult {
  studentId: string;
  studentName: string;
  certificateNumber?: string;
  alreadyExisted: boolean;
  skipped?: boolean;
  skippedReason?: string;
}

export class CertificateService {
  constructor(
    private readonly certificates: CertificateRepository,
    private readonly groups: Pick<GroupRepository, "findById" | "membersOf">,
    private readonly courses: Pick<CourseRepository, "findById">,
    private readonly leads: Pick<LeadRepository, "findForUser">,
    private readonly pdf: PdfRenderer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Issues a certificate to every student in the group who does not have one
   * yet. The printed name is the English name from the student's lead record;
   * students without one are skipped.
   */
  async issueForGroup(groupId: string, issuedById: string) {
    const group = isValidId(groupId)
      ? await this.groups.findById(groupId)
      : null;
    if (!group) throw new AppError("Group not found", 404, "NOT_FOUND");
    const members =
      (await this.groups.membersOf([group.id])).get(group.id) ?? [];
    if (members.length === 0) return { empty: true as const };

    const course = await this.courses.findById(group.courseId);
    if (!course)
      throw new AppError("Group has no associated course", 400, "BAD_REQUEST");
    const trainingHours = courseHours(course);
    const warning = trainingHours
      ? undefined
      : `Course "${course.title}" has no training hours set — certificates will show 0 hours. Please set "Total Hours" on the course before generating.`;

    const issuedAt = this.now();
    const results: IssueResult[] = [];
    let skipped = 0;
    for (const student of members) {
      const existing = await this.certificates.findForStudentGroup(
        student.id,
        group.id,
      );
      if (existing) {
        if (!existing.trainingHours && trainingHours)
          await this.certificates.setHours(existing.id, trainingHours);
        skipped++;
        results.push({
          studentId: student.id,
          studentName: existing.studentName,
          certificateNumber: existing.certificateNumber,
          alreadyExisted: true,
        });
        continue;
      }
      const lead = await this.leads.findForUser(student.id, student.name);
      const englishName = lead?.englishName?.trim();
      if (!englishName) {
        skipped++;
        results.push({
          studentId: student.id,
          studentName: student.name,
          skippedReason: "No English name found in Lead records",
          alreadyExisted: false,
          skipped: true,
        });
        continue;
      }
      const certificateNumber = await this.certificates.nextNumber(
        issuedAt.getFullYear(),
      );
      await this.certificates.create({
        certificateNumber,
        studentId: student.id,
        courseId: course.id,
        groupId: group.id,
        issuedById,
        issuedAt,
        studentName: englishName,
        courseName: course.title,
        courseLevel: course.level ?? "",
        trainingHours,
        gender: lead?.gender === "female" ? "female" : "male",
      });
      results.push({
        studentId: student.id,
        studentName: englishName,
        certificateNumber,
        alreadyExisted: false,
        skipped: false,
      });
    }
    return {
      empty: false as const, // Only certificates actually created (the old count included students skipped for having no English name).
      issued: results.filter((r) => !r.alreadyExisted && !r.skipped).length,
      skipped,
      results,
      issuedAt,
      warning,
    };
  }

  async deleteForGroup(groupId: string): Promise<number> {
    return isValidId(groupId) ? this.certificates.deleteForGroup(groupId) : 0;
  }

  /** Certificates issued while a course had no hours pick them up once the course has some. */
  private async heal(c: Certificate): Promise<number> {
    if (c.trainingHours) return c.trainingHours;
    const hours = courseHours(c.course);
    if (hours) await this.certificates.setHours(c.id, hours);
    return hours;
  }

  async mine(studentId: string) {
    const list = await this.certificates.listForStudent(studentId);
    return Promise.all(
      list.map(async (c) => ({
        certificate: c,
        trainingHours: await this.heal(c),
      })),
    );
  }

  async pdfFor(certificateNumber: string, studentId: string): Promise<Buffer> {
    const c = await this.certificates.findByNumber(
      certificateNumber,
      studentId,
    );
    if (!c) throw new AppError("Certificate not found", 404, "NOT_FOUND");
    const trainingHours = await this.heal(c);
    const html = certificateHtml({
      certificateNumber: c.certificateNumber,
      studentName: c.studentName,
      courseName: c.courseName,
      courseLevel: c.courseLevel,
      trainingHours,
      issuedAt: c.issuedAt,
      gender: c.gender,
    });
    return this.pdf.render(html, "landscape");
  }

  verify(certificateNumber: string) {
    return this.certificates.findByNumber(certificateNumber.toUpperCase());
  }
}
