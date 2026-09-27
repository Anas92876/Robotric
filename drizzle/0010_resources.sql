CREATE TYPE "public"."resource_status" AS ENUM('active', 'archived', 'deleted');--> statement-breakpoint
CREATE TABLE "resource_assignments" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"resource_id" varchar(24) NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"session_id" varchar(24) NOT NULL,
	"assigned_by_id" varchar(24),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"available_from" timestamp with time zone,
	"available_until" timestamp with time zone,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_view_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"resource_id" varchar(24) NOT NULL,
	"ip_address" varchar(100) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" varchar(2000) DEFAULT '' NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"storage_path" text NOT NULL,
	"storage_bucket" varchar(100) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"uploaded_by_id" varchar(24),
	"status" "resource_status" DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_assignments" ADD CONSTRAINT "resource_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_view_tokens" ADD CONSTRAINT "resource_view_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_view_tokens" ADD CONSTRAINT "resource_view_tokens_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_assignments_unique" ON "resource_assignments" USING btree ("resource_id","group_id","session_id");--> statement-breakpoint
CREATE INDEX "resource_assignments_group_session_idx" ON "resource_assignments" USING btree ("group_id","session_id");--> statement-breakpoint
CREATE INDEX "resource_assignments_session_idx" ON "resource_assignments" USING btree ("session_id","is_visible");--> statement-breakpoint
CREATE INDEX "resource_view_tokens_expires_idx" ON "resource_view_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "resources_course_status_idx" ON "resources" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "resources_uploader_idx" ON "resources" USING btree ("uploaded_by_id","created_at");