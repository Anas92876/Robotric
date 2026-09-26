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
