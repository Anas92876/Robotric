CREATE TYPE "public"."otp_purpose" AS ENUM('password_change', 'email_change', 'forgot_password');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'trainer', 'teacher', 'admin', 'judge', 'editor', 'organizer', 'superadmin', 'reception', 'clo', 'social', 'cto', 'engineer', 'driver', 'client');--> statement-breakpoint
CREATE TYPE "public"."push_platform" AS ENUM('android', 'ios');--> statement-breakpoint
CREATE TYPE "public"."push_token_type" AS ENUM('expo', 'fcm');--> statement-breakpoint
CREATE TABLE "user_otps" (
	"user_id" varchar(24) NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"pending_value" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"assigned_competition_id" varchar(24),
	"profile" jsonb,
	"token_version" integer DEFAULT 0 NOT NULL,
	"is_hourly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"token" varchar(512) NOT NULL,
	"platform" "push_platform" NOT NULL,
	"device_id" varchar(200),
	"token_type" "push_token_type" DEFAULT 'expo' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_otps" ADD CONSTRAINT "user_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_otps_user_purpose_unique" ON "user_otps" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_assigned_competition_idx" ON "users" USING btree ("assigned_competition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_unique" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_tokens_user_active_idx" ON "push_tokens" USING btree ("user_id","is_active");