CREATE TYPE "public"."group_status" AS ENUM('active', 'completed', 'archived', 'cancelled');--> statement-breakpoint
CREATE TABLE "group_students" (
	"group_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_students_group_id_student_id_pk" PRIMARY KEY("group_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"course_id" varchar(24) NOT NULL,
	"trainer_id" varchar(24) NOT NULL,
	"max_students" integer DEFAULT 30 NOT NULL,
	"schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" "group_status" DEFAULT 'active' NOT NULL,
	"board_enabled" boolean DEFAULT false NOT NULL,
	"thumbnail" text,
	"color" varchar(7) DEFAULT '#30c59b' NOT NULL,
	"starting_session_number" integer DEFAULT 1 NOT NULL,
	"completed_sessions" integer DEFAULT 0 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"percentage_complete" integer DEFAULT 0 NOT NULL,
	"average_attendance" double precision DEFAULT 0 NOT NULL,
	"average_performance" double precision DEFAULT 0 NOT NULL,
	"total_assignments" integer DEFAULT 0 NOT NULL,
	"total_quizzes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_students_student_idx" ON "group_students" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "groups_trainer_status_idx" ON "groups" USING btree ("trainer_id","status");--> statement-breakpoint
CREATE INDEX "groups_course_idx" ON "groups" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "groups_dates_idx" ON "groups" USING btree ("start_date","end_date");