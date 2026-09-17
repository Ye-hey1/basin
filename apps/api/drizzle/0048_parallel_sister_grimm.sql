CREATE TABLE "requirement_document" (
	"id" text PRIMARY KEY NOT NULL,
	"requirement_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_document_version" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "requirement_document_version_unique" UNIQUE("document_id","version")
);
--> statement-breakpoint
ALTER TABLE "requirement_document" ADD CONSTRAINT "requirement_document_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement_document" ADD CONSTRAINT "requirement_document_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement_document_version" ADD CONSTRAINT "requirement_document_version_document_id_requirement_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."requirement_document"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "requirement_document_version" ADD CONSTRAINT "requirement_document_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "requirement_document_requirementId_idx" ON "requirement_document" USING btree ("requirement_id");--> statement-breakpoint
CREATE INDEX "requirement_document_version_documentId_idx" ON "requirement_document_version" USING btree ("document_id");--> statement-breakpoint
-- Existing PRDs move into a document rather than disappearing with the column.
-- One statement, so the version rows can only ever be written for the documents
-- this creates; the document is named after its requirement, and the old text
-- becomes version 1.
WITH created AS (
	INSERT INTO "requirement_document" ("id", "requirement_id", "title", "position", "created_by", "created_at", "updated_at")
	SELECT gen_random_uuid()::text, r."id", r."title", 0, r."created_by", now(), now()
	FROM "requirement" r
	WHERE r."prd_content" IS NOT NULL AND btrim(r."prd_content") <> ''
	RETURNING "id", "requirement_id", "created_by"
)
INSERT INTO "requirement_document_version" ("id", "document_id", "version", "content", "created_by", "created_at")
SELECT gen_random_uuid()::text, c."id", 1, r."prd_content", c."created_by", now()
FROM created c
JOIN "requirement" r ON r."id" = c."requirement_id";--> statement-breakpoint
ALTER TABLE "requirement" DROP COLUMN "prd_content";