import type {
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from "@/types/requirement";

// Mirrors the server's enums. Kept as plain arrays so the pickers can map over
// them and the i18n keys stay `${group}.${value}`.
export const REQUIREMENT_STATUSES: readonly RequirementStatus[] = [
  "pending_review",
  "reviewed",
  "in_development",
  "completed",
];

export const REQUIREMENT_PRIORITIES: readonly RequirementPriority[] = [
  "P0",
  "P1",
  "P2",
  "P3",
  "P4",
];

export const REQUIREMENT_TYPES: readonly RequirementType[] = [
  "feature",
  "optimization",
  "bug",
  "tech_improvement",
];
