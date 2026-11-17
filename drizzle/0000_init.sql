CREATE TYPE "public"."listing_type" AS ENUM('hotel', 'restaurant', 'attraction', 'shopping', 'park', 'trail', 'venue', 'nightlife', 'golf', 'arts', 'services', 'recreation', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('office', 'industrial', 'retail', 'commercial', 'land', 'development');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'editor', 'tourism_staff', 'edo_staff', 'stakeholder');--> statement-breakpoint
CREATE TYPE "public"."site" AS ENUM('visit', 'edo');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('new', 'in_progress', 'approved', 'rejected', 'closed');--> statement-breakpoint
CREATE TYPE "public"."submission_type" AS ENUM('event', 'listing_update', 'partner', 'meeting_rfp', 'wedding', 'contact', 'visitor_guide', 'investor', 'property_enquiry', 'business_enquiry', 'site_selection', 'lets_talk_business');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"name" varchar(64) NOT NULL,
	"path" text,
	"entity" varchar(32),
	"entity_id" integer,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"session_hash" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_cache" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" DEFAULT 'visit' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body_html" text DEFAULT '' NOT NULL,
	"author" text,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_on" date,
	"hero_media_id" integer,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"og_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(48) NOT NULL,
	"entity" varchar(32),
	"entity_id" integer,
	"site" "site",
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" DEFAULT 'visit' NOT NULL,
	"share_token" varchar(24) NOT NULL,
	"title" text NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity" varchar(32) NOT NULL,
	"entity_id" integer NOT NULL,
	"version" integer NOT NULL,
	"data" jsonb NOT NULL,
	"note" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"body_html" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"hero_media_id" integer,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"numeric_value" double precision,
	"unit" text,
	"category" text,
	"source_name" text NOT NULL,
	"source_url" text NOT NULL,
	"as_of" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" DEFAULT 'visit' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" date,
	"end_date" date,
	"times_text" text,
	"recurrence_text" text,
	"location_name" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"admission" text,
	"website" text,
	"host_name" text,
	"contact_email" text,
	"listing_id" integer,
	"primary_media_id" integer,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"og_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text,
	"body_html" text DEFAULT '' NOT NULL,
	"employers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hero_media_id" integer,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"key" varchar(48) PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"site" "site",
	"enabled" boolean DEFAULT false NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_status" varchar(24) DEFAULT 'unknown' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" serial PRIMARY KEY NOT NULL,
	"share_token" varchar(24) NOT NULL,
	"edit_token" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_media" (
	"listing_id" integer NOT NULL,
	"media_id" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "listing_media_listing_id_media_id_pk" PRIMARY KEY("listing_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "listing_type" NOT NULL,
	"category" text,
	"subcategory" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"address" text,
	"city" text,
	"state" varchar(8) DEFAULT 'AZ',
	"zip" varchar(12),
	"region" text,
	"latitude" double precision,
	"longitude" double precision,
	"phone" text,
	"email" text,
	"website" text,
	"booking_url" text,
	"social" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hours" text,
	"primary_media_id" integer,
	"owner_user_id" integer,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"og_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site",
	"url" text NOT NULL,
	"source_url" text,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text,
	"credit" text,
	"width" integer,
	"height" integer,
	"format" varchar(16),
	"folder" varchar(64),
	"permission" varchar(24) DEFAULT 'pending' NOT NULL,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nav_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"menu" varchar(24) NOT NULL,
	"parent_id" integer,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" text,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_status" varchar(24) DEFAULT 'pending' NOT NULL,
	"unsubscribed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"path" text NOT NULL,
	"title" text NOT NULL,
	"template" varchar(48) DEFAULT 'standard' NOT NULL,
	"section" varchar(64),
	"summary" text,
	"body_html" text DEFAULT '' NOT NULL,
	"hero_media_id" integer,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"og_image" text,
	"noindex" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"district_id" integer,
	"available_sqft" integer,
	"total_sqft" integer,
	"acreage" numeric(10, 2),
	"zoning" text,
	"zoning_verified" boolean DEFAULT false NOT NULL,
	"availability" varchar(24) DEFAULT 'available' NOT NULL,
	"description" text,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"primary_media_id" integer,
	"is_fixture" boolean DEFAULT false NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301 NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"file_url" text NOT NULL,
	"category" text,
	"published_on" date,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"expire_at" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"csrf_token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"site" "site" NOT NULL,
	"key" varchar(64) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_site_key_pk" PRIMARY KEY("site","key")
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" DEFAULT 'edo' NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"email" text,
	"phone" text,
	"focus" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" "site" NOT NULL,
	"type" "submission_type" NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"name" text,
	"email" text,
	"organisation" text,
	"subject" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entity" varchar(32),
	"entity_id" integer,
	"submitted_by" integer,
	"assigned_to" integer,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"crm_sync_status" varchar(24) DEFAULT 'pending' NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"sites" jsonb DEFAULT '["visit"]'::jsonb NOT NULL,
	"organisation" text,
	"active" boolean DEFAULT true NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "districts" ADD CONSTRAINT "districts_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_primary_media_id_media_id_fk" FOREIGN KEY ("primary_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_media" ADD CONSTRAINT "listing_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_primary_media_id_media_id_fk" FOREIGN KEY ("primary_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_primary_media_id_media_id_fk" FOREIGN KEY ("primary_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_name_idx" ON "analytics_events" USING btree ("site","name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "articles_site_slug_uq" ON "articles" USING btree ("site","slug");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_share_uq" ON "collections" USING btree ("share_token");--> statement-breakpoint
CREATE UNIQUE INDEX "content_versions_uq" ON "content_versions" USING btree ("entity","entity_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "districts_slug_uq" ON "districts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "econ_ind_key_uq" ON "economic_indicators" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "events_source_uq" ON "events" USING btree ("site","source_id");--> statement-breakpoint
CREATE INDEX "events_dates_idx" ON "events" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "industries_slug_uq" ON "industries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "itineraries_share_uq" ON "itineraries" USING btree ("share_token");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_source_uq" ON "listings" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "listings_type_idx" ON "listings" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "listings_geo_idx" ON "listings" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "media_url_uq" ON "media" USING btree ("url");--> statement-breakpoint
CREATE INDEX "media_folder_idx" ON "media" USING btree ("folder");--> statement-breakpoint
CREATE INDEX "nav_site_menu_idx" ON "nav_items" USING btree ("site","menu");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_site_email_uq" ON "newsletter_subscribers" USING btree ("site","email");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_site_path_uq" ON "pages" USING btree ("site","path");--> statement-breakpoint
CREATE INDEX "pages_section_idx" ON "pages" USING btree ("site","section");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_uq" ON "properties" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "properties_type_idx" ON "properties" USING btree ("type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "redirects_site_from_uq" ON "redirects" USING btree ("site","from_path");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_type_status_idx" ON "submissions" USING btree ("site","type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");