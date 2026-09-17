CREATE TABLE "acceptance_item" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"title" text NOT NULL,
	"criterion" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"verified_by" text,
	"verified_at" timestamp,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_project" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"project_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_project_unique" UNIQUE("requirement_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "requirement" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"parent_id" text,
	"title" text NOT NULL,
	"description" text,
	"prd_content" text,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"priority" text DEFAULT 'P2' NOT NULL,
	"type" text DEFAULT 'feature' NOT NULL,
	"source" text,
	"module" text,
	"assignee_id" text,
	"expected_date" timestamp,
	"created_by" text,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acceptance_item" ADD CONSTRAINT "acceptance_item_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "acceptance_item" ADD CONSTRAINT "acceptance_item_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement_project" ADD CONSTRAINT "requirement_project_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement_project" ADD CONSTRAINT "requirement_project_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_parent_id_requirement_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement" ADD CONSTRAINT "requirement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "acceptance_item_requirementId_idx" ON "acceptance_item" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "requirement_project_requirementId_idx" ON "requirement_project" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "requirement_project_projectId_idx" ON "requirement_project" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "requirement_workspaceId_idx" ON "requirement" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "requirement_parentId_idx" ON "requirement" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "requirement_status_idx" ON "requirement" USING btree ("status");--> statement-breakpoint
CREATE INDEX "requirement_assigneeId_idx" ON "requirement" USING btree ("assignee_id");