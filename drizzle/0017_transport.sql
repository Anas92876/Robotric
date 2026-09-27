CREATE TYPE "public"."transport_currency" AS ENUM('SYP', 'USD');--> statement-breakpoint
CREATE TYPE "public"."transport_trip_direction" AS ENUM('to_academy', 'from_academy');--> statement-breakpoint
CREATE TYPE "public"."transport_trip_status" AS ENUM('scheduled', 'in_travel', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"user_id" varchar(24) NOT NULL,
	"vehicle_plate" varchar(50),
	"vehicle_model" varchar(100),
	"vehicle_color" varchar(50),
	"vehicle_capacity" integer DEFAULT 5 NOT NULL,
	"phone_number" varchar(50),
	"photo_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"home_lat" double precision,
	"home_lng" double precision,
	"notes" text,
	"created_by_id" varchar(24),
	"updated_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "driver_students" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"driver_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"enrollment_id" varchar(24),
	"home_lat" double precision,
	"home_lng" double precision,
	"home_address" text,
	"phone_number" varchar(50),
	"pickup_order" integer DEFAULT 0 NOT NULL,
	"pickup_order_to_academy" integer,
	"pickup_order_from_academy" integer,
	"distance_km" double precision,
	"sessions_per_month" double precision DEFAULT 0 NOT NULL,
	"monthly_fee" double precision,
	"fee_breakdown" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"location_updated_at" timestamp with time zone,
	"location_updated_by_id" varchar(24),
	"created_by_id" varchar(24),
	"updated_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_pricing" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"student_rate_per_km" double precision NOT NULL,
	"driver_rate_per_km" double precision NOT NULL,
	"driver_rate_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"leg_multiplier" double precision DEFAULT 3 NOT NULL,
	"currency" "transport_currency" DEFAULT 'SYP' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_by_id" varchar(24),
	"updated_by_id" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_trips" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"driver_id" varchar(24) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"direction" "transport_trip_direction" NOT NULL,
	"status" "transport_trip_status" DEFAULT 'scheduled' NOT NULL,
	"is_extra" boolean DEFAULT false NOT NULL,
	"extra_charge" double precision DEFAULT 0 NOT NULL,
	"students_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"student_statuses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"optimized_waypoint_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_lat" double precision,
	"current_lng" double precision,
	"current_location_at" timestamp with time zone,
	"driver_earnings" double precision,
	"total_route_km" double precision,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"cancelled_by_id" varchar(24),
	"notes" text,
	"created_by_id" varchar(24),
	"updated_by_id" varchar(24),
	"driver_changed_by_id" varchar(24),
	"driver_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_trip_feedback" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"trip_id" varchar(24) NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"driver_id" varchar(24),
	"rating" integer NOT NULL,
	"comment" varchar(2000) DEFAULT '' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "academy_lat" double precision;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "academy_lng" double precision;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_location_updated_by_id_users_id_fk" FOREIGN KEY ("location_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_students" ADD CONSTRAINT "driver_students_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_pricing" ADD CONSTRAINT "transport_pricing_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_pricing" ADD CONSTRAINT "transport_pricing_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_driver_changed_by_id_users_id_fk" FOREIGN KEY ("driver_changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trip_feedback" ADD CONSTRAINT "transport_trip_feedback_trip_id_transport_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."transport_trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trip_feedback" ADD CONSTRAINT "transport_trip_feedback_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_trip_feedback" ADD CONSTRAINT "transport_trip_feedback_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_students_driver_idx" ON "driver_students" USING btree ("driver_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "driver_students_one_active_seat" ON "driver_students" USING btree ("student_id") WHERE "driver_students"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "transport_pricing_one_active" ON "transport_pricing" USING btree ("is_active") WHERE "transport_pricing"."is_active";--> statement-breakpoint
CREATE INDEX "transport_trips_driver_date_idx" ON "transport_trips" USING btree ("driver_id","date");--> statement-breakpoint
CREATE INDEX "transport_trips_status_date_idx" ON "transport_trips" USING btree ("status","date");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_trips_one_in_travel" ON "transport_trips" USING btree ("driver_id") WHERE "transport_trips"."status" = 'in_travel';--> statement-breakpoint
CREATE UNIQUE INDEX "transport_trip_feedback_trip_student_unique" ON "transport_trip_feedback" USING btree ("trip_id","student_id");--> statement-breakpoint
CREATE INDEX "transport_trip_feedback_driver_idx" ON "transport_trip_feedback" USING btree ("driver_id","created_at");