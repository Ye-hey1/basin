CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TABLE "ai_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_provider_config" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"base_url" text,
	"api_key_encrypted" text,
	"chat_model" text NOT NULL,
	"embedding_model" text NOT NULL,
	"embedding_dimensions" integer DEFAULT 1536 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_thread" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer NOT NULL,
	"embedding" vector,
	"embedding_dimensions" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_document" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"indexed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brain_document_source_unique" UNIQUE("source_type","source_id")
);
--> statement-breakpoint
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_thread_id_ai_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ai_thread"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ai_thread" ADD CONSTRAINT "ai_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ai_thread" ADD CONSTRAINT "ai_thread_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "brain_chunk" ADD CONSTRAINT "brain_chunk_document_id_brain_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."brain_document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "brain_chunk" ADD CONSTRAINT "brain_chunk_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "brain_chunk" ADD CONSTRAINT "brain_chunk_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "brain_document" ADD CONSTRAINT "brain_document_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "brain_document" ADD CONSTRAINT "brain_document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "ai_message_threadId_idx" ON "ai_message" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ai_thread_userId_idx" ON "ai_thread" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_thread_workspaceId_idx" ON "ai_thread" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_chunk_documentId_idx" ON "brain_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "brain_chunk_workspaceId_idx" ON "brain_chunk" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_chunk_projectId_idx" ON "brain_chunk" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "brain_document_workspaceId_idx" ON "brain_document" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "brain_document_projectId_idx" ON "brain_document" USING btree ("project_id");