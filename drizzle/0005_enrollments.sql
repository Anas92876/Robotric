CREATE TYPE "public"."enrollment_history_status" AS ENUM('active', 'inactive', 'completed', 'dropped', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."enrollment_source" AS ENUM('direct', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."installment_kind" AS ENUM('course', 'transportation');--> statement-breakpoint
CREATE TYPE "public"."installment_status" AS ENUM('pending', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bank_transfer', 'online', 'sham_cash_app', 'check', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_currency" AS ENUM('usd', 'sp');--> statement-breakpoint
CREATE TYPE "public"."receipt_type" AS ENUM('course', 'transportation');--> statement-breakpoint
CREATE TABLE "enrollment_installments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"enrollment_id" varchar(24) NOT NULL,
	"kind" "installment_kind" NOT NULL,
	"position" integer NOT NULL,
	"amount" double precision NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_date" timestamp with time zone,
	"status" "installment_status" DEFAULT 'pending' NOT NULL,
	"payment_id" varchar(24)
);
--> statement-breakpoint
CREATE TABLE "enrollment_status_changes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"enrollment_id" varchar(24) NOT NULL,
	"status" "enrollment_history_status" NOT NULL,
	"reason" varchar(500),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"completed_module_ids" text[] DEFAULT '{}' NOT NULL,
	"current_module_id" varchar(24),
	"percentage_complete" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"payment_total" double precision NOT NULL,
	"payment_paid" double precision DEFAULT 0 NOT NULL,
	"discount" double precision DEFAULT 0 NOT NULL,
	"last_payment_date" timestamp with time zone,
	"attendance_total_sessions" integer DEFAULT 0 NOT NULL,
	"attendance_attended_sessions" integer DEFAULT 0 NOT NULL,
	"attendance_percentage" integer DEFAULT 0 NOT NULL,
	"quiz_average" double precision,
	"assignment_average" double precision,
	"overall_grade" double precision,
	"completed_at" timestamp with time zone,
	"certificate_issued" boolean DEFAULT false NOT NULL,
	"certificate_issued_at" timestamp with time zone,
	"certificate_url" text,
	"certificate_number" varchar(100),
	"notes" varchar(1000),
	"source" "enrollment_source" DEFAULT 'direct' NOT NULL,
	"bundle_enrollment_id" varchar(24),
	"transport_enabled" boolean DEFAULT false NOT NULL,
	"transport_total" double precision DEFAULT 0 NOT NULL,
	"transport_paid" double precision DEFAULT 0 NOT NULL,
	"transport_route_id" varchar(24),
	"home_lat" double precision,
	"home_lng" double precision,
	"home_address" text,
	"raw_distance_km" double precision,
	"road_distance_km" double precision,
	"monthly_fee_estimate" double precision,
	"location_updated_at" timestamp with time zone,
	"location_updated_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"enrollment_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"amount" double precision NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"notes" varchar(1000),
	"processed_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"receipt_number" varchar(30) NOT NULL,
	"enrollment_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"type" "receipt_type" DEFAULT 'course' NOT NULL,
	"amount" double precision NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"payment_date" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"payment_currency" "payment_currency" DEFAULT 'usd' NOT NULL,
	"paid_in_sp" double precision,
	"billing_total" double precision NOT NULL,
	"billing_paid_before" double precision NOT NULL,
	"billing_paid_now" double precision NOT NULL,
	"billing_remaining" double precision NOT NULL,
	"issued_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollment_installments" ADD CONSTRAINT "enrollment_installments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_status_changes" ADD CONSTRAINT "enrollment_status_changes_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_bundle_enrollment_id_enrollments_id_fk" FOREIGN KEY ("bundle_enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_location_updated_by_id_users_id_fk" FOREIGN KEY ("location_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_processed_by_id_users_id_fk" FOREIGN KEY ("processed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issued_by_id_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollment_installments_enrollment_idx" ON "enrollment_installments" USING btree ("enrollment_id","kind","position");--> statement-breakpoint
CREATE INDEX "enrollment_status_changes_enrollment_idx" ON "enrollment_status_changes" USING btree ("enrollment_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_student_course_unique" ON "enrollments" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "enrollments_student_status_idx" ON "enrollments" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_course_status_idx" ON "enrollments" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "enrollments_bundle_idx" ON "enrollments" USING btree ("bundle_enrollment_id");--> statement-breakpoint
CREATE INDEX "enrollments_enrolled_at_idx" ON "enrollments" USING btree ("enrolled_at");--> statement-breakpoint
CREATE INDEX "payments_enrollment_idx" ON "payments" USING btree ("enrollment_id","status");--> statement-breakpoint
CREATE INDEX "payments_student_course_idx" ON "payments" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_number_unique" ON "receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_enrollment_idx" ON "receipts" USING btree ("enrollment_id","created_at");--> statement-breakpoint
CREATE INDEX "receipts_student_idx" ON "receipts" USING btree ("student_id","created_at");