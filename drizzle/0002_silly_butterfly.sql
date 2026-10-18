CREATE TABLE "applicant_details" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"city" text,
	"linkedin_url" text,
	"website_url" text,
	"current_company" text,
	"authorized_to_work" boolean,
	"needs_sponsorship" boolean,
	"notice_period" text,
	"cover_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source" text NOT NULL,
	"applied_by" text NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"screenshot" "bytea",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resumes" ADD COLUMN "file" "bytea";--> statement-breakpoint
ALTER TABLE "applicant_details" ADD CONSTRAINT "applicant_details_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_job_idx" ON "applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");