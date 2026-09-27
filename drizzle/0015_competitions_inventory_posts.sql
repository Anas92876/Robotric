CREATE TYPE "public"."image_type" AS ENUM('profile', 'part', 'project', 'post', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_reason" AS ENUM('purchase', 'adjustment', 'used', 'damaged', 'return', 'reserve', 'release', 'fulfill', 'cancel', 'other');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "competition_evaluations" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"judge_id" varchar(24) NOT NULL,
	"team_id" varchar(24) NOT NULL,
	"competition_id" varchar(24) NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"total_score" double precision DEFAULT 0 NOT NULL,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"description" text,
	"max_teams" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"competition_id" varchar(24) NOT NULL,
	"coach_id" varchar(24) NOT NULL,
	"name" varchar(200) NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"originalname" text NOT NULL,
	"mimetype" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"storage_path" text NOT NULL,
	"image_type" "image_type" NOT NULL,
	"associated_id" varchar(24),
	"associated_model" varchar(20),
	"uploaded_by_id" varchar(24),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_projects" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"owner_id" varchar(24) NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"order_id" varchar(24) NOT NULL,
	"part_id" varchar(24) NOT NULL,
	"qty" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_items_order_id_part_id_pk" PRIMARY KEY("order_id","part_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"student_id" varchar(24) NOT NULL,
	"project_id" varchar(24),
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"name" varchar(300) NOT NULL,
	"category" varchar(200) DEFAULT '' NOT NULL,
	"description" text,
	"sku" varchar(200) DEFAULT '' NOT NULL,
	"group" varchar(200),
	"part_number" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_ledger" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"part_id" varchar(24) NOT NULL,
	"qty_change" integer NOT NULL,
	"reason" "stock_reason" NOT NULL,
	"order_id" varchar(24),
	"created_by_id" varchar(24),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_levels" (
	"part_id" varchar(24) PRIMARY KEY NOT NULL,
	"available_qty" integer DEFAULT 0 NOT NULL,
	"reserved_qty" integer DEFAULT 0 NOT NULL,
	"used_qty" integer DEFAULT 0 NOT NULL,
	"damaged_qty" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"slug" varchar(300) NOT NULL,
	"title" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_id" varchar(24),
	"status" "post_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competition_evaluations" ADD CONSTRAINT "competition_evaluations_judge_id_users_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_evaluations" ADD CONSTRAINT "competition_evaluations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_evaluations" ADD CONSTRAINT "competition_evaluations_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_projects" ADD CONSTRAINT "inventory_projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_part_id_parts_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competition_evaluations_judge_team_unique" ON "competition_evaluations" USING btree ("judge_id","team_id");--> statement-breakpoint
CREATE INDEX "competition_evaluations_competition_team_idx" ON "competition_evaluations" USING btree ("competition_id","team_id");--> statement-breakpoint
CREATE INDEX "teams_competition_coach_idx" ON "teams" USING btree ("competition_id","coach_id");--> statement-breakpoint
CREATE INDEX "teams_coach_idx" ON "teams" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "images_type_associated_idx" ON "images" USING btree ("image_type","associated_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_projects_owner_idx" ON "inventory_projects" USING btree ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_student_idx" ON "orders" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "parts_name_idx" ON "parts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "parts_sku_idx" ON "parts" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "parts_category_idx" ON "parts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "stock_ledger_part_idx" ON "stock_ledger" USING btree ("part_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_ledger_created_idx" ON "stock_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_unique" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "posts_status_published_idx" ON "posts" USING btree ("status","published_at");