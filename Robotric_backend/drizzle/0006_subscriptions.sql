CREATE TYPE "public"."session_request_status" AS ENUM('pending', 'approved', 'declined', 'canceled', 'completed', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."user_subscription_status" AS ENUM('active', 'expired', 'canceled');--> statement-breakpoint
CREATE TABLE "session_reports" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"session_request_id" varchar(24) NOT NULL,
	"created_by_id" varchar(24),
	"notes" text NOT NULL,
	"pdf_path" text,
	"attendance" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_requests" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"subscription_id" varchar(24) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"duration_hours" double precision NOT NULL,
	"description" varchar(1000),
	"status" "session_request_status" DEFAULT 'pending' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_id" varchar(24),
	"declined_at" timestamp with time zone,
	"declined_by_id" varchar(24),
	"decline_reason" varchar(500),
	"canceled_at" timestamp with time zone,
	"canceled_by_id" varchar(24),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"plan_id" varchar(24) NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"remaining_hours" double precision DEFAULT 0 NOT NULL,
	"status" "user_subscription_status" DEFAULT 'active' NOT NULL,
	"canceled_at" timestamp with time zone,
	"canceled_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_session_request_id_session_requests_id_fk" FOREIGN KEY ("session_request_id") REFERENCES "public"."session_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reports" ADD CONSTRAINT "session_reports_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_declined_by_id_users_id_fk" FOREIGN KEY ("declined_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_requests" ADD CONSTRAINT "session_requests_canceled_by_id_users_id_fk" FOREIGN KEY ("canceled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_canceled_by_id_users_id_fk" FOREIGN KEY ("canceled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_reports_request_unique" ON "session_reports" USING btree ("session_request_id");--> statement-breakpoint
CREATE INDEX "session_reports_creator_idx" ON "session_reports" USING btree ("created_by_id","created_at");--> statement-breakpoint
CREATE INDEX "session_requests_user_status_idx" ON "session_requests" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "session_requests_user_date_idx" ON "session_requests" USING btree ("user_id","date","status");--> statement-breakpoint
CREATE INDEX "session_requests_date_status_idx" ON "session_requests" USING btree ("date","status");--> statement-breakpoint
CREATE INDEX "user_subscriptions_user_status_idx" ON "user_subscriptions" USING btree ("user_id","status","ends_at");--> statement-breakpoint
CREATE INDEX "user_subscriptions_plan_idx" ON "user_subscriptions" USING btree ("plan_id","status");