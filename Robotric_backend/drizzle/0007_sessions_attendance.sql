CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."attendance_session_type" AS ENUM('lecture', 'lab', 'workshop', 'exam', 'project', 'other');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('present', 'absent', 'late');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"course_id" varchar(24),
	"trainer_id" varchar(24) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"session_number" integer,
	"override_schedule" boolean DEFAULT false NOT NULL,
	"scheduled_date" timestamp with time zone,
	"start_time" varchar(5),
	"end_time" varchar(5),
	"duration" integer NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"meeting_link" text,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"cancellation_reason" varchar(500),
	"lesson_plan" jsonb DEFAULT '{"objectives":[],"outline":[],"materialsNeeded":[],"attachments":[]}'::jsonb NOT NULL,
	"video_has" boolean DEFAULT false NOT NULL,
	"video_youtube_id" varchar(50) DEFAULT '' NOT NULL,
	"evaluation_id" varchar(24),
	"actual_start_time" timestamp with time zone,
	"actual_end_time" timestamp with time zone,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_rule" jsonb DEFAULT '{"frequency":"none","interval":1,"endDate":null,"occurrences":null}'::jsonb NOT NULL,
	"parent_session_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"sheet_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"status" "attendance_status" DEFAULT 'absent' NOT NULL,
	"marked_by_id" varchar(24),
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" varchar(500),
	"check_in_time" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attendance_sheets" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_id" varchar(24) NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"title" varchar(200) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"start_time" varchar(5),
	"end_time" varchar(5),
	"type" "attendance_session_type" DEFAULT 'lecture' NOT NULL,
	"location" text,
	"notes" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_parent_session_id_sessions_id_fk" FOREIGN KEY ("parent_session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sheet_id_attendance_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."attendance_sheets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sheets" ADD CONSTRAINT "attendance_sheets_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_trainer_date_idx" ON "sessions" USING btree ("trainer_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "sessions_group_date_idx" ON "sessions" USING btree ("group_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "sessions_course_idx" ON "sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "sessions_status_date_idx" ON "sessions" USING btree ("status","scheduled_date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_sheet_student_unique" ON "attendance_records" USING btree ("sheet_id","student_id");--> statement-breakpoint
CREATE INDEX "attendance_records_student_idx" ON "attendance_records" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sheets_session_unique" ON "attendance_sheets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_sheets_group_date_idx" ON "attendance_sheets" USING btree ("group_id","date");