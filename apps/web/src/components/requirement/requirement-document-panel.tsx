import {
  Check,
  ChevronDown,
  ChevronRight,
  Columns2,
  History,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MarkdownRenderer } from "@/components/public-project/markdown-renderer";
import RequirementDocumentEditor from "@/components/requirement/requirement-document-editor";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteRequirementDocument } from "@/hooks/mutations/requirement/use-delete-requirement-document";
import { useSaveRequirementDocumentContent } from "@/hooks/mutations/requirement/use-save-requirement-document-content";
import { useUpdateRequirementDocument } from "@/hooks/mutations/requirement/use-update-requirement-document";
import useRequirementDocument from "@/hooks/queries/requirement/use-requirement-document";
import useRequirementDocumentVersion from "@/hooks/queries/requirement/use-requirement-document-version";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";

type RequirementDocumentPanelProps = {
  documentId: string;
  workspaceId: string;
  canEdit: boolean;
  onDeleted: () => void;
};

/**
 * One document: its current Markdown, its history, and the actions that move
 * between the two. Reading a past version never edits the document — restoring
 * it does, and restoring stores a new version rather than rewriting the old one.
 */
export default function RequirementDocumentPanel({
  documentId,
  workspaceId,
  canEdit,
  onDeleted,
}: RequirementDocumentPanelProps) {
  const { t } = useTranslation();

  const { data: document, isLoading } = useRequirementDocument(
    documentId,
    workspaceId,
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [comparing, setComparing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: pastVersion, isLoading: pastLoading } =
    useRequirementDocumentVersion(
      documentId,
      workspaceId,
      viewVersion === document?.currentVersion ? null : viewVersion,
    );

  const saveContent = useSaveRequirementDocumentContent();
  const updateDocument = useUpdateRequirementDocument();
  const deleteDocument = useDeleteRequirementDocument();

  // No reset effect is needed for a change of document: the section remounts
  // this panel per document id, so an edit buffer or a historical view cannot
  // reach the next document.
  if (isLoading || !document) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const currentVersion = document.currentVersion ?? 1;
  const isViewingPast = viewVersion !== null && viewVersion !== currentVersion;

  const onError = (error: unknown) => {
    toast.error(
      error instanceof Error
        ? error.message
        : t("requirements:documents.saveError"),
    );
  };

  const startEditing = () => {
    setDraft(document.content);
    setEditing(true);
  };

  const submitContent = async () => {
    try {
      const result = await saveContent.mutateAsync({
        documentId,
        workspaceId,
        content: draft,
      });
      setEditing(false);
      // Saying so plainly is the point: a save with no change stores nothing, and
      // a silent no-op would look like a lost version.
      if (result.changed) {
        toast.success(
          t("requirements:documents.savedAsVersion", {
            version: result.document.currentVersion ?? currentVersion,
          }),
        );
      } else {
        toast.message(t("requirements:documents.noChanges"));
      }
    } catch (error) {
      onError(error);
    }
  };

  const restoreViewedVersion = async () => {
    if (!pastVersion) {
      return;
    }
    try {
      const result = await saveContent.mutateAsync({
        documentId,
        workspaceId,
        content: pastVersion.content,
      });
      setViewVersion(null);
      setComparing(false);
      toast.success(
        t("requirements:documents.restored", {
          version: result.document.currentVersion ?? 0,
          from: pastVersion.version,
        }),
      );
    } catch (error) {
      onError(error);
    }
  };

  const submitRename = () => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      return;
    }
    updateDocument.mutate(
      { documentId, workspaceId, title: trimmed },
      {
        onSuccess: () => {
          setRenaming(false);
          toast.success(t("requirements:documents.renamed"));
        },
        onError,
      },
    );
  };

  const confirmDelete = () => {
    deleteDocument.mutate(
      { documentId, workspaceId },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          toast.success(t("requirements:documents.deleted"));
          onDeleted();
        },
        onError,
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                aria-label={t("requirements:documents.titleLabel")}
                onChange={(event) => setRenameValue(event.target.value)}
                value={renameValue}
              />
              <Button
                aria-label={t("requirements:actions.save")}
                disabled={updateDocument.isPending || !renameValue.trim()}
                onClick={submitRename}
                size="sm"
                variant="outline"
              >
                <Check />
              </Button>
              <Button
                aria-label={t("requirements:actions.cancel")}
                onClick={() => setRenaming(false)}
                size="sm"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
          ) : (
            <h4 className="truncate font-heading font-medium text-base">
              {document.title}
            </h4>
          )}

          <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
            <Badge variant="outline">
              {t("requirements:documents.versionBadge", {
                version: currentVersion,
              })}
            </Badge>
            <span>
              {t("requirements:documents.versionTotal", {
                total: document.versionCount,
              })}
            </span>
            <span>{formatDateTime(document.updatedAt)}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            onClick={() => setHistoryOpen((open) => !open)}
            size="sm"
            variant="outline"
          >
            <History />
            {t("requirements:documents.history")}
          </Button>
          {canEdit && !editing ? (
            <>
              <Button onClick={startEditing} size="sm" variant="outline">
                <Pencil />
                {t("requirements:actions.edit")}
              </Button>
              <Button
                onClick={() => {
                  setRenameValue(document.title);
                  setRenaming(true);
                }}
                size="sm"
                variant="outline"
              >
                {t("requirements:documents.rename")}
              </Button>
              <Button
                onClick={() => setDeleteOpen(true)}
                size="sm"
                variant="destructive-outline"
              >
                <Trash2 />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {historyOpen ? (
        <ul className="flex flex-col gap-0.5 rounded-lg border border-border p-1">
          {document.versions.map((version) => {
            const isCurrent = version.version === currentVersion;
            const isViewed = version.version === viewVersion;
            return (
              <li key={version.version}>
                <button
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50 ${
                    isViewed ? "bg-accent/60" : ""
                  }`}
                  onClick={() =>
                    setViewVersion(isCurrent ? null : version.version)
                  }
                  type="button"
                >
                  <span className="font-medium">
                    {t("requirements:documents.versionBadge", {
                      version: version.version,
                    })}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {version.createdByName ??
                      t("requirements:fields.unassigned")}
                  </span>
                  <span className="ms-auto shrink-0 text-muted-foreground text-xs">
                    {formatDateTime(version.createdAt)}
                  </span>
                  {isCurrent ? (
                    <Badge size="sm" variant="secondary">
                      {t("requirements:documents.current")}
                    </Badge>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {editing ? (
        <div className="flex flex-col gap-3">
          <RequirementDocumentEditor onChange={setDraft} value={draft} />
          <div className="flex items-center gap-2">
            <Button
              loading={saveContent.isPending}
              onClick={submitContent}
              size="sm"
            >
              {t("requirements:actions.save")}
            </Button>
            <Button
              onClick={() => setEditing(false)}
              size="sm"
              variant="outline"
            >
              {t("requirements:actions.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {!editing && isViewingPast ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning-foreground">
            <button
              className="flex cursor-pointer items-center gap-1 text-sm"
              onClick={() => setComparing((on) => !on)}
              type="button"
            >
              {comparing ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {t("requirements:documents.viewingPastVersion", {
                version: viewVersion,
              })}
            </button>
            <div className="ms-auto flex items-center gap-1.5">
              <Button
                onClick={() => setComparing((on) => !on)}
                size="sm"
                variant="outline"
              >
                <Columns2 />
                {t("requirements:documents.compareWithCurrent")}
              </Button>
              {canEdit ? (
                <Button
                  loading={saveContent.isPending}
                  onClick={restoreViewedVersion}
                  size="sm"
                >
                  <RotateCcw />
                  {t("requirements:documents.restore")}
                </Button>
              ) : null}
              <Button
                aria-label={t("requirements:documents.backToCurrent")}
                onClick={() => {
                  setViewVersion(null);
                  setComparing(false);
                }}
                size="sm"
                variant="ghost"
              >
                <X />
              </Button>
            </div>
          </div>

          {comparing ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <MarkdownColumn
                content={document.content}
                label={t("requirements:documents.versionBadge", {
                  version: currentVersion,
                })}
              />
              <MarkdownColumn
                content={pastVersion?.content ?? ""}
                isLoading={pastLoading}
                label={t("requirements:documents.versionBadge", {
                  version: viewVersion,
                })}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/48 px-4 py-3">
              {pastLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <MarkdownRenderer content={pastVersion?.content ?? ""} />
              )}
            </div>
          )}
        </div>
      ) : null}

      {!(editing || isViewingPast) ? (
        <div className="rounded-xl border border-border bg-background/48 px-4 py-3">
          {document.content.trim() ? (
            <MarkdownRenderer content={document.content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("requirements:documents.emptyBody")}
            </p>
          )}
        </div>
      ) : null}

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("requirements:documents.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("requirements:documents.deleteDescription", {
                title: document.title,
                total: document.versionCount,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {t("requirements:actions.cancel")}
            </AlertDialogClose>
            <Button
              loading={deleteDocument.isPending}
              onClick={confirmDelete}
              variant="destructive"
            >
              {t("requirements:documents.deleteConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MarkdownColumn({
  label,
  content,
  isLoading = false,
}: {
  label: string;
  content: string;
  isLoading?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0 rounded-xl border border-border bg-background/48 px-4 py-3">
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  );
}
