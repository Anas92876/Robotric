CREATE TYPE "public"."deposit_method" AS ENUM('cash', 'sham_cash_app', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('interest', 'waiting', 'student', 'blacklist');--> statement-breakpoint
CREATE TYPE "public"."company_role" AS ENUM('CEO', 'CLO', 'CTO');--> statement-breakpoint
CREATE TYPE "public"."event_color" AS ENUM('blue', 'green', 'red', 'yellow', 'purple', 'gray');--> statement-breakpoint
CREATE TYPE "public"."event_participant_type" AS ENUM('lead', 'custom', 'company');--> statement-breakpoint
CREATE TYPE "public"."contact_outcome" AS ENUM('successful', 'no_answer', 'callback_requested', 'not_interested', 'converted', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('call', 'meeting', 'email', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'replied', 'archived');--> statement-breakpoint
CREATE TYPE "public"."contact_who" AS ENUM('student', 'parent', 'business-owner', 'other');--> statement-breakpoint
CREATE TYPE "public"."applicant_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('full_time', 'part_time', 'flexible');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('none', 'beginner', 'intermediate', 'professional');--> statement-breakpoint
CREATE TYPE "public"."job_application_status" AS ENUM('new', 'reviewed', 'interview', 'accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "lead_follow_ups" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"lead_id" varchar(24) NOT NULL,
	"note" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"by_id" varchar(24)
);
--> statement-breakpoint
CREATE TABLE "lead_status_changes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"lead_id" varchar(24) NOT NULL,
	"from_status" "lead_status",
	"to_status" "lead_status" NOT NULL,
	"reason" text NOT NULL,
	"changed_by_id" varchar(24),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"english_name" varchar(200),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"gender" "gender",
	"father_name" varchar(100),
	"mother_name" varchar(100),
	"date_of_birth" timestamp with time zone,
	"age" integer,
	"residence" varchar(200),
	"school_name" varchar(200),
	"mobile_number" varchar(50) NOT NULL,
	"mobile_number_label" varchar(50) DEFAULT 'Main' NOT NULL,
	"additional_numbers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"social_media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_to_id" varchar(24),
	"interest_field" varchar(200),
	"referral_source" varchar(200),
	"notes" text,
	"lead_date" timestamp with time zone DEFAULT now(),
	"status" "lead_status" DEFAULT 'interest' NOT NULL,
	"waiting_course_id" varchar(24),
	"deposit_amount" double precision DEFAULT 0 NOT NULL,
	"deposit_paid_at" timestamp with time zone,
	"deposit_method" "deposit_method" DEFAULT 'cash' NOT NULL,
	"deposit_notes" text DEFAULT '' NOT NULL,
	"is_banned_from_platform" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"next_follow_up_date" timestamp with time zone,
	"converted_to_student_id" varchar(24),
	"converted_at" timestamp with time zone,
	"created_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"event_id" varchar(24) NOT NULL,
	"position" integer NOT NULL,
	"type" "event_participant_type" NOT NULL,
	"lead_id" varchar(24),
	"custom_name" varchar(200),
	"custom_phone" varchar(50),
	"company_role" "company_role"
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"color" "event_color" DEFAULT 'blue' NOT NULL,
	"created_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_history" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"lead_id" varchar(24) NOT NULL,
	"contact_type" "contact_type" NOT NULL,
	"call_reason" text NOT NULL,
	"outcome" "contact_outcome" NOT NULL,
	"notes" text,
	"contact_date" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"scheduled_event_id" varchar(24),
	"next_follow_up_date" timestamp with time zone,
	"created_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(320) DEFAULT '' NOT NULL,
	"location" varchar(200) DEFAULT '' NOT NULL,
	"who" "contact_who",
	"other_type" varchar(100) DEFAULT '' NOT NULL,
	"subject" varchar(200) NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"converted_to_lead_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"position" varchar(200) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(320) DEFAULT '' NOT NULL,
	"age" integer,
	"location" varchar(200) DEFAULT '' NOT NULL,
	"gender" "applicant_gender",
	"experience_level" "experience_level",
	"experience_details" text DEFAULT '' NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"portfolio_link" text DEFAULT '' NOT NULL,
	"availability" "availability",
	"why_us" text DEFAULT '' NOT NULL,
	"additional_info" text DEFAULT '' NOT NULL,
	"cv_url" text DEFAULT '' NOT NULL,
	"cv_bucket" varchar(100) DEFAULT '' NOT NULL,
	"status" "job_application_status" DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"reviewed_by_id" varchar(24),
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_by_id_users_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_changes" ADD CONSTRAINT "lead_status_changes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_status_changes" ADD CONSTRAINT "lead_status_changes_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_waiting_course_id_courses_id_fk" FOREIGN KEY ("waiting_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_to_student_id_users_id_fk" FOREIGN KEY ("converted_to_student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_scheduled_event_id_events_id_fk" FOREIGN KEY ("scheduled_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_history" ADD CONSTRAINT "contact_history_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_converted_to_lead_id_leads_id_fk" FOREIGN KEY ("converted_to_lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_follow_ups_lead_idx" ON "lead_follow_ups" USING btree ("lead_id","date");--> statement-breakpoint
CREATE INDEX "lead_status_changes_lead_idx" ON "lead_status_changes" USING btree ("lead_id","changed_at");--> statement-breakpoint
CREATE INDEX "leads_mobile_idx" ON "leads" USING btree ("mobile_number");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "leads_next_follow_up_idx" ON "leads" USING btree ("next_follow_up_date");--> statement-breakpoint
CREATE INDEX "leads_waiting_course_idx" ON "leads" USING btree ("waiting_course_id");--> statement-breakpoint
CREATE INDEX "event_participants_event_idx" ON "event_participants" USING btree ("event_id","position");--> statement-breakpoint
CREATE INDEX "event_participants_lead_idx" ON "event_participants" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "events_start_time_idx" ON "events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "contact_history_lead_date_idx" ON "contact_history" USING btree ("lead_id","contact_date");--> statement-breakpoint
CREATE INDEX "contact_history_creator_date_idx" ON "contact_history" USING btree ("created_by_id","contact_date");--> statement-breakpoint
CREATE INDEX "contact_history_outcome_idx" ON "contact_history" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "contact_history_type_idx" ON "contact_history" USING btree ("contact_type");--> statement-breakpoint
CREATE INDEX "contacts_status_idx" ON "contacts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "contacts_created_at_idx" ON "contacts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "job_applications_status_idx" ON "job_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_applications_position_idx" ON "job_applications" USING btree ("position");--> statement-breakpoint
CREATE INDEX "job_applications_created_at_idx" ON "job_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "job_applications_phone_idx" ON "job_applications" USING btree ("phone");