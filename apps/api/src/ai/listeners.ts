import type { BrainSourceType } from "@basin/ai";
import { subscribeToEvent } from "../events";
import { enqueueIndexJob, type IndexJobPayload } from "./queue";

type TaskEventPayload = {
  taskId?: string;
  projectId?: string;
};

type CommentEventPayload = {
  id?: string;
  taskId?: string;
  type?: string;
};

type RequirementEventPayload = {
  requirementId?: string;
};

type RequirementDocumentEventPayload = {
  documentId?: string;
};

function indexJob(
  sourceType: BrainSourceType,
  sourceId: string | undefined,
): IndexJobPayload | null {
  if (!sourceId) {
    return null;
  }
  return { sourceType, sourceId };
}

// Bridges in-process domain events to the Brain index queue. Only content
// surfaces are indexed; status/assignee churn still fires task.updated, but
// the pipeline's content hash makes those re-index runs cheap no-ops.
export function registerAiIndexListeners(): void {
  const taskEvents = [
    "task.created",
    "task.updated",
    "task.title_changed",
    "task.description_changed",
  ];
  for (const eventType of taskEvents) {
    subscribeToEvent<TaskEventPayload>(eventType, async (data) => {
      const job = indexJob("task", data.taskId);
      if (job) {
        await enqueueIndexJob(job);
      }
    });
  }

  subscribeToEvent<TaskEventPayload>("task.deleted", async (data) => {
    const job = indexJob("task", data.taskId);
    if (job) {
      // indexSource deletes the document when the source row is gone.
      await enqueueIndexJob(job);
    }
  });

  const commentEvents = [
    "comment.created",
    "comment.updated",
    "comment.deleted",
  ];
  for (const eventType of commentEvents) {
    subscribeToEvent<CommentEventPayload>(eventType, async (data) => {
      // Only actual comments are indexed; the activity table also carries
      // status changes and other noise.
      if (data.type && data.type !== "comment") {
        return;
      }
      const job = indexJob("comment", data.id);
      if (job) {
        await enqueueIndexJob(job);
      }
    });
  }

  const requirementEvents = ["requirement.created", "requirement.updated"];
  for (const eventType of requirementEvents) {
    subscribeToEvent<RequirementEventPayload>(eventType, async (data) => {
      const job = indexJob("requirement", data.requirementId);
      if (job) {
        await enqueueIndexJob(job);
      }
    });
  }

  subscribeToEvent<RequirementEventPayload>(
    "requirement.deleted",
    async (data) => {
      const job = indexJob("requirement", data.requirementId);
      if (job) {
        await enqueueIndexJob(job);
      }
    },
  );

  for (const eventType of [
    "requirement_document.saved",
    "requirement_document.created",
  ]) {
    subscribeToEvent<RequirementDocumentEventPayload>(
      eventType,
      async (data) => {
        const job = indexJob("requirement_document", data.documentId);
        if (job) {
          await enqueueIndexJob(job);
        }
      },
    );
  }

  subscribeToEvent<RequirementDocumentEventPayload>(
    "requirement_document.deleted",
    async (data) => {
      const job = indexJob("requirement_document", data.documentId);
      if (job) {
        await enqueueIndexJob(job);
      }
    },
  );
}
