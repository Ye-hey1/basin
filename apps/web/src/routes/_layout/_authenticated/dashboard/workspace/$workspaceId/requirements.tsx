import { createFileRoute, useParams } from "@tanstack/react-router";
import { FileText, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import WorkspaceLayout from "@/components/common/workspace-layout";
import WorkspaceTabs from "@/components/common/workspace-tabs";
import PageTitle from "@/components/page-title";
import RequirementDetailView from "@/components/requirement/requirement-detail";
import RequirementFormDialog from "@/components/requirement/requirement-form-dialog";
import RequirementMoveDialog from "@/components/requirement/requirement-move-dialog";
import RequirementTree from "@/components/requirement/requirement-tree";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRequirement } from "@/hooks/mutations/requirement/use-delete-requirement";
import useRequirement from "@/hooks/queries/requirement/use-requirement";
import useRequirementTree from "@/hooks/queries/requirement/use-requirement-tree";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import type { RequirementTreeNode } from "@/types/requirement";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/requirements",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    requirementId: search.requirementId as string | undefined,
  }),
});

const ROUTE_ID =
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/requirements";

/**
 * Walks the loaded tree for a node, so the detail's child list comes from the
 * same data the tree renders instead of a second request.
 */
function findNode(
  nodes: RequirementTreeNode[],
  id: string,
): RequirementTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const match = findNode(node.children, id);
    if (match) {
      return match;
    }
  }
  return null;
}

function RouteComponent() {
  const { t } = useTranslation();
  const { workspaceId } = useParams({ from: ROUTE_ID });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { requirementId: requestedRequirementId } = Route.useSearch();

  // A task can deep-link to the requirement it serves.
  useEffect(() => {
    if (requestedRequirementId) {
      setSelectedId(requestedRequirementId);
    }
  }, [requestedRequirementId]);

  const [query, setQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    canCreateRequirements,
    canUpdateRequirements,
    canDeleteRequirements,
  } = useWorkspacePermission();

  const filters = useMemo(
    () => ({
      workspaceId,
      ...(query ? { q: query } : {}),
    }),
    [workspaceId, query],
  );

  const {
    data: tree,
    isLoading: treeLoading,
    isError: treeError,
  } = useRequirementTree(filters);

  const { data: detail, isLoading: detailLoading } = useRequirement(
    selectedId,
    workspaceId,
  );

  const deleteRequirement = useDeleteRequirement();

  const selectedNode = useMemo(
    () => (selectedId && tree ? findNode(tree, selectedId) : null),
    [selectedId, tree],
  );

  const openCreate = () => {
    setFormParentId(null);
    setFormOpen(true);
  };

  const onDelete = () => {
    if (!selectedId) {
      return;
    }
    deleteRequirement.mutate(
      { id: selectedId, workspaceId },
      {
        onSuccess: () => {
          toast.success(t("requirements:toast.deleted"));
          setDeleteOpen(false);
          setSelectedId(null);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t("requirements:errors.hasChildren"),
          );
        },
      },
    );
  };

  const isEmpty = !treeLoading && !treeError && (tree?.length ?? 0) === 0;

  const treeContent = treeLoading ? (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4, 5].map((key) => (
        <Skeleton className="h-7 w-full" key={key} />
      ))}
    </div>
  ) : treeError ? (
    <p className="px-2 py-6 text-center text-destructive-foreground text-sm">
      {t("requirements:toast.error")}
    </p>
  ) : isEmpty ? null : (
    <RequirementTree
      nodes={tree ?? []}
      onSelect={setSelectedId}
      selectedId={selectedId}
    />
  );

  const detailContent = detailLoading ? (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  ) : detail ? (
    <RequirementDetailView
      canDelete={canDeleteRequirements()}
      canEdit={canUpdateRequirements()}
      childNodes={selectedNode?.children ?? []}
      detail={detail}
      onAddChild={() => {
        setFormParentId(detail.id);
        setFormOpen(true);
      }}
      onDelete={() => setDeleteOpen(true)}
      onEdit={() => {
        setFormParentId(null);
        setFormOpen(true);
      }}
      onMove={() => setMoveOpen(true)}
      onSelect={setSelectedId}
      workspaceId={workspaceId}
    />
  ) : null;

  return (
    <>
      <PageTitle title={t("requirements:pageTitle")} />
      <WorkspaceLayout
        headerActions={
          canCreateRequirements() ? (
            <Button onClick={openCreate} size="sm">
              <Plus />
              {t("requirements:new")}
            </Button>
          ) : null
        }
        title={t("requirements:pageTitle")}
      >
        <div className="mb-5">
          <WorkspaceTabs active="requirements" workspaceId={workspaceId} />
        </div>

        {isEmpty ? (
          <div className="rounded-xl border border-border bg-card">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>
                  {query
                    ? t("requirements:emptyFiltered")
                    : t("requirements:emptyTitle")}
                </EmptyTitle>
                <EmptyDescription>
                  {t("requirements:emptyDescription")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[19rem_1fr]">
            <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("requirements:searchPlaceholder")}
                  type="search"
                  value={query}
                />
              </InputGroup>

              <div className="min-h-[16rem]">{treeContent}</div>
            </aside>

            <section className="min-w-0 rounded-xl border border-border bg-card p-6">
              {detailContent ?? (
                <p className="py-12 text-center text-muted-foreground text-sm">
                  {t("requirements:detail.selectPrompt")}
                </p>
              )}
            </section>
          </div>
        )}
      </WorkspaceLayout>

      <RequirementFormDialog
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormParentId(null);
          }
        }}
        open={formOpen}
        parentId={formParentId}
        // In edit mode the dialog edits the selected requirement.
        requirement={formParentId === null ? (detail ?? null) : null}
        workspaceId={workspaceId}
      />

      <RequirementMoveDialog
        currentParentId={detail?.parentId ?? null}
        onOpenChange={setMoveOpen}
        open={moveOpen}
        requirementId={selectedId}
        workspaceId={workspaceId}
      />

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("requirements:deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("requirements:deleteDialog.description", {
                title: detail?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {t("requirements:actions.cancel")}
            </AlertDialogClose>
            <Button
              loading={deleteRequirement.isPending}
              onClick={onDelete}
              variant="destructive"
            >
              {t("requirements:deleteDialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
