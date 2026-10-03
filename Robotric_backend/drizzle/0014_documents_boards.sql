CREATE TYPE "public"."student_document_type" AS ENUM('national_id', 'official_photo', 'civil_registry', 'family_record', 'travel_permission');--> statement-breakpoint
CREATE TYPE "public"."document_verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."board_task_status" AS ENUM('todo', 'in_progress', 'done');--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"document_type" "student_document_type" NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"verification_status" "document_verification_status" DEFAULT 'pending' NOT NULL,
	"verification_note" text,
	"verified_by_id" varchar(24),
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_notes" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"author_id" varchar(24) NOT NULL,
	"content" varchar(2000) NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_task_assignees" (
	"task_id" varchar(24) NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "board_task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "board_tasks" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"group_id" varchar(24) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" varchar(2000),
	"priority" integer DEFAULT 3 NOT NULL,
	"status" "board_task_status" DEFAULT 'todo' NOT NULL,
	"created_by_id" varchar(24),
	"due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_notes" ADD CONSTRAINT "board_notes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_notes" ADD CONSTRAINT "board_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_task_assignees" ADD CONSTRAINT "board_task_assignees_task_id_board_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."board_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_task_assignees" ADD CONSTRAINT "board_task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_tasks" ADD CONSTRAINT "board_tasks_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_tasks" ADD CONSTRAINT "board_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_documents_student_type_idx" ON "student_documents" USING btree ("student_id","document_type");--> statement-breakpoint
CREATE INDEX "student_documents_status_idx" ON "student_documents" USING btree ("verification_status","created_at");--> statement-breakpoint
CREATE INDEX "board_notes_group_idx" ON "board_notes" USING btree ("group_id","created_at");--> statement-breakpoint
CREATE INDEX "board_task_assignees_user_idx" ON "board_task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "board_tasks_group_idx" ON "board_tasks" USING btree ("group_id","priority","status");