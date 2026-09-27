CREATE TYPE "public"."criteria_scope" AS ENUM('course', 'groups');--> statement-breakpoint
CREATE TYPE "public"."criteria_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "evaluation_criteria" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(500),
	"applies_to" "criteria_scope" DEFAULT 'course' NOT NULL,
	"created_by_id" varchar(24) NOT NULL,
	"parameters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"include_overall_rating" boolean DEFAULT true NOT NULL,
	"overall_rating_scale" jsonb DEFAULT '{"min":1,"max":5}'::jsonb NOT NULL,
	"status" "criteria_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_criteria_courses" (
	"criteria_id" varchar(24) NOT NULL,
	"course_id" varchar(24) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "evaluation_criteria_courses_criteria_id_course_id_pk" PRIMARY KEY("criteria_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "evaluation_criteria_groups" (
	"criteria_id" varchar(24) NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "evaluation_criteria_groups_criteria_id_group_id_pk" PRIMARY KEY("criteria_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "student_evaluations" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"trainer_id" varchar(24),
	"session_id" varchar(24) NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"overall_rating" integer NOT NULL,
	"skill_ratings" jsonb NOT NULL,
	"attendance" jsonb NOT NULL,
	"participation" jsonb NOT NULL,
	"comprehension" jsonb NOT NULL,
	"behavior" jsonb NOT NULL,
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"improvements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"homework" jsonb NOT NULL,
	"trainer_notes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"progress" jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"criteria_metadata" jsonb,
	"needs_attention" boolean DEFAULT false NOT NULL,
	"excelling" boolean DEFAULT false NOT NULL,
	"at_risk" boolean DEFAULT false NOT NULL,
	"parent_contact_needed" boolean DEFAULT false NOT NULL,
	"shared_with_student" boolean DEFAULT false NOT NULL,
	"shared_with_parent" boolean DEFAULT false NOT NULL,
	"shared_at" timestamp with time zone,
	"evaluation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criteria_courses" ADD CONSTRAINT "evaluation_criteria_courses_criteria_id_evaluation_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criteria_courses" ADD CONSTRAINT "evaluation_criteria_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criteria_groups" ADD CONSTRAINT "evaluation_criteria_groups_criteria_id_evaluation_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criteria_groups" ADD CONSTRAINT "evaluation_criteria_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluation_criteria_creator_idx" ON "evaluation_criteria" USING btree ("created_by_id","updated_at");--> statement-breakpoint
CREATE INDEX "evaluation_criteria_status_idx" ON "evaluation_criteria" USING btree ("status");--> statement-breakpoint
CREATE INDEX "evaluation_criteria_courses_course_idx" ON "evaluation_criteria_courses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "evaluation_criteria_groups_group_idx" ON "evaluation_criteria_groups" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_evaluations_session_student_unique" ON "student_evaluations" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "student_evaluations_student_date_idx" ON "student_evaluations" USING btree ("student_id","evaluation_date");--> statement-breakpoint
CREATE INDEX "student_evaluations_trainer_session_idx" ON "student_evaluations" USING btree ("trainer_id","session_id");--> statement-breakpoint
CREATE INDEX "student_evaluations_group_date_idx" ON "student_evaluations" USING btree ("group_id","evaluation_date");--> statement-breakpoint
CREATE INDEX "student_evaluations_attention_idx" ON "student_evaluations" USING btree ("needs_attention");