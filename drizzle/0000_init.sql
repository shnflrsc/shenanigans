CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "admin_allowlist" (
	"github_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_allowlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "post_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cover_image" text,
	"cover_alt" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "posts_slug_format" CHECK ("posts"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "posts_cover_alt_required" CHECK ("posts"."cover_image" is null or ("posts"."cover_alt" is not null and length(trim("posts"."cover_alt")) > 0))
);
--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "project_tags" (
	"project_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "project_tags_project_id_tag_id_pk" PRIMARY KEY("project_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "project_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text,
	"cover_image" text,
	"cover_alt" text,
	"live_url" text,
	"repo_url" text,
	"year" integer,
	"role" text,
	"team" text,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug"),
	CONSTRAINT "projects_slug_format" CHECK ("projects"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "projects_cover_alt_required" CHECK ("projects"."cover_image" is null or ("projects"."cover_alt" is not null and length(trim("projects"."cover_alt")) > 0))
);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tags_slug_format" CHECK ("tags"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_tags_tag_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "posts_status_published_idx" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "project_tags_tag_idx" ON "project_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_one_featured" ON "projects" USING btree ("featured") WHERE "projects"."featured";--> statement-breakpoint
CREATE INDEX "projects_status_order_idx" ON "projects" USING btree ("status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_lower_idx" ON "tags" USING btree (lower("name"));--> statement-breakpoint
-- Hand-written: policies below call public.is_admin(); keep this block ahead of them.
CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
	select exists (
		select 1
		from auth.identities i
		join public.admin_allowlist a on a.github_id = i.provider_id
		where i.user_id = auth.uid() and i.provider = 'github'
	)
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;--> statement-breakpoint
-- Internal tables are never reachable through Supabase's API, with or without RLS.
REVOKE ALL ON TABLE public.rate_limits, public.admin_allowlist FROM anon, authenticated;--> statement-breakpoint
CREATE POLICY "post_tags_public_read" ON "post_tags" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from posts p where p.id = "post_tags"."post_id" and p.status = 'published'));--> statement-breakpoint
CREATE POLICY "post_tags_admin_all" ON "post_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "posts_public_read" ON "posts" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("posts"."status" = 'published');--> statement-breakpoint
CREATE POLICY "posts_admin_all" ON "posts" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "project_tags_public_read" ON "project_tags" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from projects p where p.id = "project_tags"."project_id" and p.status = 'published'));--> statement-breakpoint
CREATE POLICY "project_tags_admin_all" ON "project_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "projects_public_read" ON "projects" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("projects"."status" = 'published');--> statement-breakpoint
CREATE POLICY "projects_admin_all" ON "projects" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint
CREATE POLICY "tags_public_read" ON "tags" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from post_tags pt join posts p on p.id = pt.post_id where pt.tag_id = "tags"."id" and p.status = 'published') or exists (select 1 from project_tags pt join projects p on p.id = pt.project_id where pt.tag_id = "tags"."id" and p.status = 'published'));--> statement-breakpoint
CREATE POLICY "tags_admin_all" ON "tags" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_admin()) WITH CHECK (public.is_admin());