/**
 * Every table in the database. drizzle-kit reads this file to generate
 * migrations, and the Drizzle client uses it for typed queries.
 * Each module owns its tables; this file only re-exports them.
 */
export * from '../../modules/users/users.table';
export * from '../../modules/push-tokens/push-tokens.table';
export * from '../../modules/subscription-plans/subscription-plans.table';
export * from '../../modules/interests/interests.table';
export * from '../../modules/courses/courses.table';
export * from '../../modules/training-content/training-content.table';
export * from '../../modules/settings/settings.table';
export * from '../../modules/leads/leads.table';
export * from '../../modules/events/events.table';
export * from '../../modules/contact-history/contact-history.table';
export * from '../../modules/contacts/contacts.table';
export * from '../../modules/job-applications/job-applications.table';
export * from '../../modules/groups/groups.table';
export * from '../../modules/enrollments/enrollments.table';
export * from '../../modules/receipts/receipts.table';
export * from '../../modules/subscriptions/subscriptions.table';
export * from '../../modules/sessions/sessions.table';
export * from '../../modules/attendance/attendance.table';
export * from '../../modules/course-modules/course-modules.table';
export * from '../../modules/quizzes/quizzes.table';
export * from '../../modules/assignments/assignments.table';
export * from '../../modules/tasks/tasks.table';
export * from '../../modules/resources/resources.table';
export * from '../../modules/evaluations/evaluations.table';
export * from '../../modules/certificates/certificates.table';
export * from '../../modules/student-projects/student-projects.table';
export * from '../../modules/gallery/gallery.table';
export * from '../../modules/documents/documents.table';
export * from '../../modules/boards/boards.table';
export * from '../../modules/competitions/competitions.table';
export * from '../../modules/images/images.table';
export * from '../../modules/inventory/inventory.table';
export * from '../../modules/posts/posts.table';
export * from '../../modules/internal-work/internal-work.table';
export * from '../../modules/transport/transport.table';
