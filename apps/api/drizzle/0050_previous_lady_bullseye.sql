CREATE TABLE "agent_run_step" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"tool_name" text NOT NULL,
	"args" jsonb,
	"result_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_run" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"trigger_id" text,
	"project_id" text,
	"trigger_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"prompt" text NOT NULL,
	"output" text,
	"error" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"duration_ms" integer,
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_trigger" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"event_type" text,
	"condition" jsonb,
	"cron" text,
	"project_id" text,
	"instruction" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"last_fired_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_server" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"transport" text NOT NULL,
	"url" text,
	"command" text,
	"args" jsonb,
	"env" jsonb,
	"headers" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_run_step" ADD CONSTRAINT "agent_run_step_run_id_agent_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_run"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_trigger_id_agent_trigger_id_fk" FOREIGN KEY ("trigger_id") REFERENCES "public"."agent_trigger"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_trigger" ADD CONSTRAINT "agent_trigger_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_trigger" ADD CONSTRAINT "agent_trigger_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "agent_trigger" ADD CONSTRAINT "agent_trigger_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD CONSTRAINT "mcp_server_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "agent_run_step_runId_idx" ON "agent_run_step" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "agent_run_workspaceId_idx" ON "agent_run" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_run_triggerId_idx" ON "agent_run" USING btree ("trigger_id");--> statement-breakpoint
CREATE INDEX "agent_run_status_idx" ON "agent_run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_trigger_workspaceId_idx" ON "agent_trigger" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "agent_trigger_type_idx" ON "agent_trigger" USING btree ("type");--> statement-breakpoint
CREATE INDEX "mcp_server_workspaceId_idx" ON "mcp_server" USING btree ("workspace_id");