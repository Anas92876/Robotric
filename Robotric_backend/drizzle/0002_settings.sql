CREATE TABLE "app_settings" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"key" varchar(20) DEFAULT 'default' NOT NULL,
	"usd_to_syp_exchange_rate" double precision DEFAULT 120 NOT NULL,
	"minimum_app_version" varchar(20) DEFAULT '1.0.0' NOT NULL,
	"force_update" boolean DEFAULT false NOT NULL,
	"update_message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_settings_key_unique" ON "app_settings" USING btree ("key");