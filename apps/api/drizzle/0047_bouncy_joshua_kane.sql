ALTER TABLE "task" ADD COLUMN "requirement_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_requirement_id_requirement_id_fk" FOREIGN KEY ("requirement_id") REFERENCES "public"."requirement"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "task_requirementId_idx" ON "task" USING btree ("requirement_id");