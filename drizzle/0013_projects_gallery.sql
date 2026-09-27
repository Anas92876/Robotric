CREATE TYPE "public"."student_project_status" AS ENUM('in_progress', 'completed', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."gallery_type" AS ENUM('moment', 'project');--> statement-breakpoint
CREATE TABLE "student_projects" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_ar" varchar(200),
	"description" text,
	"description_ar" varchar(5000),
	"student_id" varchar(24) NOT NULL,
	"group_id" varchar(24),
	"course_id" varchar(24),
	"created_by_id" varchar(24),
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "student_project_status" DEFAULT 'in_progress' NOT NULL,
	"grade" double precision,
	"feedback" varchar(5000),
	"graded_at" timestamp with time zone,
	"graded_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"type" "gallery_type" NOT NULL,
	"uploaded_by_id" varchar(24),
	"storage_path" text NOT NULL,
	"student_id" varchar(24),
	"project_id" varchar(24),
	"title" varchar(200),
	"description" varchar(2000),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_projects" ADD CONSTRAINT "student_projects_graded_by_id_users_id_fk" FOREIGN KEY ("graded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_project_id_student_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."student_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_projects_student_idx" ON "student_projects" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_projects_group_idx" ON "student_projects" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "student_projects_course_idx" ON "student_projects" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "gallery_images_group_type_idx" ON "gallery_images" USING btree ("group_id","type");--> statement-breakpoint
CREATE INDEX "gallery_images_uploader_idx" ON "gallery_images" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "gallery_images_path_idx" ON "gallery_images" USING btree ("storage_path");