CREATE TYPE "public"."interest_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."course_level" AS ENUM('beginner', 'intermediate', 'advanced', 'Beginner', 'Intermediate', 'Advanced');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."course_type" AS ENUM('single', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."content_lang" AS ENUM('ar', 'en');--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"monthly_hours" integer DEFAULT 20 NOT NULL,
	"price" double precision NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interests" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"status" "interest_status" DEFAULT 'active' NOT NULL,
	"created_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"instructor_id" varchar(24),
	"duration" varchar(50) NOT NULL,
	"total_hours" double precision DEFAULT 0 NOT NULL,
	"price" double precision NOT NULL,
	"thumbnail" text,
	"category" varchar(100) NOT NULL,
	"level" "course_level" NOT NULL,
	"status" "course_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"max_students" integer,
	"enrolled_students" integer DEFAULT 0 NOT NULL,
	"syllabus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prerequisites" text[] DEFAULT '{}' NOT NULL,
	"objectives" text[] DEFAULT '{}' NOT NULL,
	"learning_outcomes" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"wro_documents_required" boolean DEFAULT false NOT NULL,
	"type" "course_type" DEFAULT 'single' NOT NULL,
	"bundle_price" double precision,
	"parent_bundle_id" varchar(24),
	"bundle_linked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_page_content" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"lang" "content_lang" NOT NULL,
	"stats_values" jsonb NOT NULL,
	"tracks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interests" ADD CONSTRAINT "interests_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_parent_bundle_id_courses_id_fk" FOREIGN KEY ("parent_bundle_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_name_unique" ON "subscription_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "subscription_plans_active_idx" ON "subscription_plans" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "interests_name_unique" ON "interests" USING btree ("name");--> statement-breakpoint
CREATE INDEX "courses_instructor_status_idx" ON "courses" USING btree ("instructor_id","status");--> statement-breakpoint
CREATE INDEX "courses_category_level_idx" ON "courses" USING btree ("category","level");--> statement-breakpoint
CREATE INDEX "courses_parent_bundle_idx" ON "courses" USING btree ("parent_bundle_id");--> statement-breakpoint
CREATE INDEX "courses_type_idx" ON "courses" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "training_page_content_lang_unique" ON "training_page_content" USING btree ("lang");