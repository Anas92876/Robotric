CREATE TYPE "public"."module_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."module_type" AS ENUM('video', 'pdf', 'text', 'quiz', 'assignment', 'live_session');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('in_progress', 'submitted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."assignment_submission_status" AS ENUM('submitted', 'grading', 'graded', 'returned', 'resubmit_required');--> statement-breakpoint
CREATE TABLE "course_modules" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(1000),
	"order" integer NOT NULL,
	"type" "module_type" NOT NULL,
	"content" jsonb DEFAULT '{"videoUrl":null,"videoDuration":null,"pdfUrl":null,"textContent":null,"duration":null}'::jsonb NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"unlock_after_id" varchar(24),
	"quiz_id" varchar(24),
	"assignment_id" varchar(24),
	"is_active" boolean DEFAULT true NOT NULL,
	"live_session" jsonb DEFAULT '{"date":null,"startTime":null,"endTime":null,"location":null,"instructorNotes":null,"attendanceRecord":null}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_progress" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"module_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"status" "module_progress_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"video_progress" jsonb DEFAULT '{"currentTime":0,"duration":0,"completed":false}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"quiz_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"attempt_number" integer NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"score" double precision,
	"total_points" double precision DEFAULT 0 NOT NULL,
	"earned_points" double precision DEFAULT 0 NOT NULL,
	"passed" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"time_spent" integer DEFAULT 0 NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_id" varchar(24),
	"module_id" varchar(24),
	"course_id" varchar(24) NOT NULL,
	"group_id" varchar(24),
	"title" varchar(200) NOT NULL,
	"description" varchar(1000),
	"instructions" varchar(2000),
	"passing_score" double precision DEFAULT 70 NOT NULL,
	"time_limit" integer,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"shuffle_options" boolean DEFAULT false NOT NULL,
	"show_feedback" boolean DEFAULT true NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_submissions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"assignment_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"status" "assignment_submission_status" DEFAULT 'submitted' NOT NULL,
	"grade" jsonb DEFAULT '{"score":null,"rubricScores":[]}'::jsonb NOT NULL,
	"resubmission_allowed" boolean DEFAULT false NOT NULL,
	"resubmission_count" integer DEFAULT 0 NOT NULL,
	"resubmission_deadline" timestamp with time zone,
	"comments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"module_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000) NOT NULL,
	"instructions" varchar(5000),
	"due_date" timestamp with time zone NOT NULL,
	"max_score" double precision DEFAULT 100 NOT NULL,
	"allowed_file_types" text[] DEFAULT '{}' NOT NULL,
	"max_file_size" integer DEFAULT 5 NOT NULL,
	"max_files" integer DEFAULT 5 NOT NULL,
	"allow_late_submission" boolean DEFAULT false NOT NULL,
	"late_submission_deadline" timestamp with time zone,
	"late_penalty" double precision DEFAULT 0 NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rubric" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_unlock_after_id_course_modules_id_fk" FOREIGN KEY ("unlock_after_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_module_id_course_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_modules_course_order_idx" ON "course_modules" USING btree ("course_id","order");--> statement-breakpoint
CREATE INDEX "course_modules_course_type_idx" ON "course_modules" USING btree ("course_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "module_progress_student_module_unique" ON "module_progress" USING btree ("student_id","module_id");--> statement-breakpoint
CREATE INDEX "module_progress_student_course_idx" ON "module_progress" USING btree ("student_id","course_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_student_quiz_number_unique" ON "quiz_attempts" USING btree ("student_id","quiz_id","attempt_number");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_course_idx" ON "quiz_attempts" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_status_idx" ON "quiz_attempts" USING btree ("quiz_id","status");--> statement-breakpoint
CREATE INDEX "quizzes_course_idx" ON "quizzes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "quizzes_module_idx" ON "quizzes" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "quizzes_session_idx" ON "quizzes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "quizzes_group_idx" ON "quizzes" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "assignment_submissions_student_assignment_idx" ON "assignment_submissions" USING btree ("student_id","assignment_id","version");--> statement-breakpoint
CREATE INDEX "assignment_submissions_assignment_status_idx" ON "assignment_submissions" USING btree ("assignment_id","status");--> statement-breakpoint
CREATE INDEX "assignments_module_idx" ON "assignments" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "assignments_course_idx" ON "assignments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "assignments_due_idx" ON "assignments" USING btree ("due_date");