CREATE TYPE "public"."client_urgency" AS ENUM('whenever', 'soon', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."time_extension_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."internal_task_status" AS ENUM('pending_review', 'todo', 'in_progress', 'done', 'declined');--> statement-breakpoint
CREATE TYPE "public"."internal_project_member_role" AS ENUM('engineer', 'client');--> statement-breakpoint
CREATE TYPE "public"."internal_task_source" AS ENUM('internal', 'client');--> statement-breakpoint
CREATE TABLE "employee_of_month" (
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"user_id" varchar(24) NOT NULL,
	CONSTRAINT "employee_of_month_year_month_pk" PRIMARY KEY("year","month")
);
--> statement-breakpoint
CREATE TABLE "internal_project_members" (
	"project_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"role" "internal_project_member_role" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "internal_project_members_project_id_user_id_role_pk" PRIMARY KEY("project_id","user_id","role")
);
--> statement-breakpoint
CREATE TABLE "internal_projects" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(2000),
	"priority" integer DEFAULT 3 NOT NULL,
	"created_by_id" varchar(24),
	"parent_project_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_task_assignees" (
	"task_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "internal_task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "internal_tasks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"project_id" varchar(24) NOT NULL,
	"sub_project_id" varchar(24),
	"title" varchar(300) NOT NULL,
	"description" varchar(5000),
	"priority" integer DEFAULT 3 NOT NULL,
	"status" "internal_task_status" DEFAULT 'todo' NOT NULL,
	"created_by_id" varchar(24),
	"due_date" timestamp with time zone,
	"hard_deadline" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submission_note" varchar(1000) DEFAULT '' NOT NULL,
	"source" "internal_task_source" DEFAULT 'internal' NOT NULL,
	"client_id" varchar(24),
	"client_urgency" "client_urgency",
	"rejected_reason" varchar(1000) DEFAULT '' NOT NULL,
	"client_media" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sub_tasks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"task_id" varchar(24) NOT NULL,
	"title" varchar(500) NOT NULL,
	"note" varchar(2000),
	"is_done" boolean DEFAULT false NOT NULL,
	"created_by_id" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_extension_requests" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"task_id" varchar(24) NOT NULL,
	"requested_by_id" varchar(24) NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"proposed_date" timestamp with time zone NOT NULL,
	"status" time_extension_status DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" varchar(24),
	"review_note" varchar(500) DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_sessions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"clock_in" timestamp with time zone NOT NULL,
	"clock_out" timestamp with time zone,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"auto_closed" boolean DEFAULT false NOT NULL,
	"edited_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_of_month" ADD CONSTRAINT "employee_of_month_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_project_members" ADD CONSTRAINT "internal_project_members_project_id_internal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."internal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_project_members" ADD CONSTRAINT "internal_project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_projects" ADD CONSTRAINT "internal_projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_projects" ADD CONSTRAINT "internal_projects_parent_project_id_internal_projects_id_fk" FOREIGN KEY ("parent_project_id") REFERENCES "public"."internal_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_task_assignees" ADD CONSTRAINT "internal_task_assignees_task_id_internal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."internal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_task_assignees" ADD CONSTRAINT "internal_task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tasks" ADD CONSTRAINT "internal_tasks_project_id_internal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."internal_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tasks" ADD CONSTRAINT "internal_tasks_sub_project_id_internal_projects_id_fk" FOREIGN KEY ("sub_project_id") REFERENCES "public"."internal_projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tasks" ADD CONSTRAINT "internal_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_tasks" ADD CONSTRAINT "internal_tasks_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_task_id_internal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."internal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_tasks" ADD CONSTRAINT "sub_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_extension_requests" ADD CONSTRAINT "time_extension_requests_task_id_internal_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."internal_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_extension_requests" ADD CONSTRAINT "time_extension_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_extension_requests" ADD CONSTRAINT "time_extension_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_edited_by_id_users_id_fk" FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internal_project_members_user_idx" ON "internal_project_members" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "internal_projects_parent_idx" ON "internal_projects" USING btree ("parent_project_id");--> statement-breakpoint
CREATE INDEX "internal_projects_priority_idx" ON "internal_projects" USING btree ("priority","created_at");--> statement-breakpoint
CREATE INDEX "internal_task_assignees_user_idx" ON "internal_task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "internal_tasks_project_idx" ON "internal_tasks" USING btree ("project_id","priority","status");--> statement-breakpoint
CREATE INDEX "internal_tasks_subproject_idx" ON "internal_tasks" USING btree ("sub_project_id","priority","status");--> statement-breakpoint
CREATE INDEX "internal_tasks_status_idx" ON "internal_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sub_tasks_task_idx" ON "sub_tasks" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "time_extension_requests_task_idx" ON "time_extension_requests" USING btree ("task_id","status");--> statement-breakpoint
CREATE INDEX "work_sessions_user_idx" ON "work_sessions" USING btree ("user_id","clock_in");--> statement-breakpoint
CREATE UNIQUE INDEX "work_sessions_one_open_per_user" ON "work_sessions" USING btree ("user_id") WHERE "work_sessions"."clock_out" is null;