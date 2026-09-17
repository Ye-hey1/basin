export type RequirementStatus =
  | "pending_review"
  | "reviewed"
  | "in_development"
  | "completed";

export type RequirementPriority = "P0" | "P1" | "P2" | "P3" | "P4";

export type RequirementType =
  | "feature"
  | "optimization"
  | "bug"
  | "tech_improvement";

export type RequirementSource =
  | "customer_feedback"
  | "internal_plan"
  | "operational";

export type AcceptanceStatus = "pending" | "passed" | "failed";

export type AcceptanceItem = {
  id: string;
  requirementId: string;
  title: string;
  criterion: string | null;
  status: AcceptanceStatus;
  note: string | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  position: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementProjectLink = {
  projectId: string;
  projectName: string;
  isPrimary: boolean;
};

export type Requirement = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: RequirementStatus;
  priority: RequirementPriority;
  type: RequirementType;
  source: RequirementSource | null;
  module: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  expectedDate: string | null;
  createdBy: string | null;
  position: number | null;
  projects: RequirementProjectLink[];
  acceptanceItems: AcceptanceItem[];
  documentCount: number;
  taskCounts: { total: number; done: number };
  createdAt: string;
  updatedAt: string;
};

export type RequirementTreeNode = Requirement & {
  children: RequirementTreeNode[];
};

export type RequirementDetail = Requirement & {
  parentTitle: string | null;
};

export type RequirementOption = {
  id: string;
  title: string;
  parentId: string | null;
  depth: number;
};

export type RequirementListFilters = {
  workspaceId: string;
  projectId?: string;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  type?: RequirementType;
  assigneeId?: string;
  parentId?: string;
  q?: string;
};

export type RequirementTask = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string;
  projectId: string;
  projectName: string;
  assigneeName: string | null;
  dueDate: string | null;
  isFinal: boolean;
  createdAt: string;
};

export type CreateRequirementInput = {
  workspaceId: string;
  title: string;
  description?: string | null;
  parentId?: string | null;
  status?: RequirementStatus;
  priority?: RequirementPriority;
  type?: RequirementType;
  source?: RequirementSource | null;
  module?: string | null;
  assigneeId?: string | null;
  expectedDate?: string | null;
  projectIds?: string[];
  primaryProjectId?: string | null;
};

export type UpdateRequirementInput = Partial<
  Omit<CreateRequirementInput, "workspaceId">
> & {
  position?: number;
};

export type RequirementDocumentVersionSummary = {
  version: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

/**
 * A document carries no text of its own: `currentVersion` is the highest
 * version, and the Markdown is the `content` the detail route resolves from it.
 */
export type RequirementDocument = {
  id: string;
  requirementId: string;
  title: string;
  position: number | null;
  currentVersion: number | null;
  versionCount: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementDocumentDetail = RequirementDocument & {
  content: string;
  versions: RequirementDocumentVersionSummary[];
};

export type RequirementDocumentVersion = {
  documentId: string;
  version: number;
  content: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};
