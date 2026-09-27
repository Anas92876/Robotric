CREATE TYPE "public"."certificate_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "certificate_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"certificate_number" varchar(30) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"course_id" varchar(24),
	"group_id" varchar(24),
	"issued_by_id" varchar(24),
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"student_name" varchar(200) NOT NULL,
	"course_name" varchar(200) NOT NULL,
	"course_level" varchar(50) DEFAULT '' NOT NULL,
	"training_hours" double precision DEFAULT 0 NOT NULL,
	"gender" "certificate_gender" DEFAULT 'male' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_id_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_student_group_unique" ON "certificates" USING btree ("student_id","group_id");--> statement-breakpoint
CREATE INDEX "certificates_student_idx" ON "certificates" USING btree ("student_id","issued_at");