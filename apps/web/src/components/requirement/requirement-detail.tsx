import {
  ArrowRightLeft,
  CornerDownRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import RequirementAcceptanceList from "@/components/requirement/requirement-acceptance-list";
import RequirementDocuments from "@/components/requirement/requirement-documents";
import {
  RequirementPriorityIcon,
  requirementStatusVariant,
} from "@/components/requirement/requirement-icons";
import RequirementTasks from "@/components/requirement/requirement-tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  RequirementDetail,
  RequirementTreeNode,
} from "@/types/requirement";

type RequirementDetailViewProps = {
  detail: RequirementDetail;
  /**
   * Sub-requirements come from the tree the page already loaded rather than a
   * second request, so the tree and the detail can never disagree about the
   * shape of the hierarchy.
   */
  childNodes: RequirementTreeNode[];
  workspaceId: string;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onSelect: (id: string) => void;
};

export default function RequirementDetailView({
  detail,
  childNodes,
  workspaceId,
  canEdit,
  canDelete,
  onEdit,
  onMove,
  onDelete,
  onAddChild,
  onSelect,
}: RequirementDetailViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 font-heading font-semibold text-xl leading-tight">
            {detail.title}
          </h2>

          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit ? (
              <>
                <Button onClick={onEdit} size="sm" variant="outline">
                  <Pencil />
                  {t("requirements:actions.edit")}
                </Button>
                <Button onClick={onMove} size="sm" variant="outline">
                  <ArrowRightLeft />
                  {t("requirements:actions.move")}
                </Button>
                <Button onClick={onAddChild} size="sm" variant="outline">
                  <Plus />
                  {t("requirements:actions.addChild")}
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button
                onClick={onDelete}
                size="sm"
                variant="destructive-outline"
              >
                <Trash2 />
                {t("requirements:actions.delete")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={requirementStatusVariant(detail.status)}>
            {t(`requirements:status.${detail.status}`)}
          </Badge>
          <Badge variant="outline">
            <RequirementPriorityIcon priority={detail.priority} />
            {t(`requirements:priority.${detail.priority}`)}
          </Badge>
          <Badge variant="outline">
            {t(`requirements:type.${detail.type}`)}
          </Badge>
          {detail.source ? (
            <Badge variant="outline">
              {t(`requirements:source.${detail.source}`)}
            </Badge>
          ) : null}
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Meta label={t("requirements:fields.parent")}>
            {detail.parentTitle ?? t("requirements:fields.topLevel")}
          </Meta>
          <Meta label={t("requirements:fields.assignee")}>
            {detail.assigneeName ?? (
              <span className="text-muted-foreground">
                {t("requirements:fields.unassigned")}
              </span>
            )}
          </Meta>
          <Meta label={t("requirements:fields.module")}>
            {detail.module ?? <span className="text-muted-foreground">—</span>}
          </Meta>
          <Meta label={t("requirements:fields.expectedDate")}>
            {detail.expectedDate ? (
              new Date(detail.expectedDate).toLocaleDateString()
            ) : (
              <span className="text-muted-foreground">
                {t("requirements:fields.noDate")}
              </span>
            )}
          </Meta>
          <Meta label={t("requirements:fields.projects")}>
            {detail.projects.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {detail.projects.map((project) => (
                  <Badge
                    key={project.projectId}
                    variant={project.isPrimary ? "secondary" : "outline"}
                  >
                    {project.projectName}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Meta>
        </dl>
      </header>

      {detail.description ? (
        <>
          <Separator />
          <Section title={t("requirements:fields.description")}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {detail.description}
            </p>
          </Section>
        </>
      ) : null}

      <Separator />

      <RequirementDocuments
        canEdit={canEdit}
        requirementId={detail.id}
        workspaceId={workspaceId}
      />

      <Separator />

      <RequirementAcceptanceList
        canEdit={canEdit}
        items={detail.acceptanceItems}
        requirementId={detail.id}
        workspaceId={workspaceId}
      />

      <Separator />

      <RequirementTasks
        requirementId={detail.id}
        taskCounts={detail.taskCounts}
        workspaceId={workspaceId}
      />

      <Separator />

      <Section title={t("requirements:detail.children")}>
        {childNodes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("requirements:detail.noChildren")}
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {childNodes.map((child) => (
              <li key={child.id}>
                <button
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
                  onClick={() => onSelect(child.id)}
                  type="button"
                >
                  <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{child.title}</span>
                  <Badge
                    className="ms-auto"
                    size="sm"
                    variant={requirementStatusVariant(child.status)}
                  >
                    {t(`requirements:status.${child.status}`)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </section>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}
