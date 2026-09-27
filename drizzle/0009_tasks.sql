CREATE TYPE "public"."task_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."task_submission_status" AS ENUM('not_submitted', 'pending_review', 'graded', 'returned');--> statement-breakpoint
CREATE TABLE "task_groups" (
	"task_id" varchar(24) NOT NULL,
	"group_id" varchar(24) NOT NULL,
	CONSTRAINT "task_groups_task_id_group_id_pk" PRIMARY KEY("task_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "task_sessions" (
	"task_id" varchar(24) NOT NULL,
	"session_id" varchar(24) NOT NULL,
	CONSTRAINT "task_sessions_task_id_session_id_pk" PRIMARY KEY("task_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "task_submissions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"task_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attached_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"status" "task_submission_status" DEFAULT 'not_submitted' NOT NULL,
	"score" double precision,
	"feedback" text,
	"graded_at" timestamp with time zone,
	"graded_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"course_id" varchar(24),
	"session_id" varchar(24),
	"created_by_id" varchar(24),
	"title" varchar(200) NOT NULL,
	"title_ar" varchar(200),
	"description" varchar(5000) NOT NULL,
	"description_ar" varchar(5000),
	"deadline" timestamp with time zone NOT NULL,
	"max_score" double precision DEFAULT 100 NOT NULL,
	"has_questions" boolean DEFAULT false NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allow_late_submission" boolean DEFAULT false NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_groups" ADD CONSTRAINT "task_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_graded_by_id_users_id_fk" FOREIGN KEY ("graded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_groups_group_idx" ON "task_groups" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "task_sessions_session_idx" ON "task_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_submissions_task_student_unique" ON "task_submissions" USING btree ("task_id","student_id");--> statement-breakpoint
CREATE INDEX "task_submissions_student_status_idx" ON "task_submissions" USING btree ("student_id","status");--> statement-breakpoint
CREATE INDEX "tasks_group_status_idx" ON "tasks" USING btree ("group_id","status");--> statement-breakpoint
CREATE INDEX "tasks_deadline_idx" ON "tasks" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "tasks_creator_idx" ON "tasks" USING btree ("created_by_id");