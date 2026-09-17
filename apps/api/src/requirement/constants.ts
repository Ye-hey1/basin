// Status, priority, type, and source use lowercase snake_case codes. They are
// echoed back to the client and compared literally in filters, so a single
// source of truth here keeps the Zod enums, the database defaults, and the
// i18n keys (en-US `requirements.status.*`) in step.

export const REQUIREMENT_STATUSES = [
  "pending_review",
  "reviewed",
  "in_development",
  "completed",
] as const;

export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const REQUIREMENT_PRIORITIES = ["P0", "P1", "P2", "P3", "P4"] as const;

export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

export const REQUIREMENT_TYPES = [
  "feature",
  "optimization",
  "bug",
  "tech_improvement",
] as const;

export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const REQUIREMENT_SOURCES = [
  "customer_feedback",
  "internal_plan",
  "operational",
] as const;

export type RequirementSource = (typeof REQUIREMENT_SOURCES)[number];

export const ACCEPTANCE_STATUSES = ["pending", "passed", "failed"] as const;

export type AcceptanceStatus = (typeof ACCEPTANCE_STATUSES)[number];

// A requirement has one primary project that its tasks land in, plus any number
// of related projects. `projectIds` describes the whole set; `primaryProjectId`
// must be a member of it.
export const DEFAULT_REQUIREMENT_STATUS: RequirementStatus = "pending_review";
export const DEFAULT_REQUIREMENT_PRIORITY: RequirementPriority = "P2";
export const DEFAULT_REQUIREMENT_TYPE: RequirementType = "feature";
