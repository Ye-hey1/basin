import { FilePlus2, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import RequirementDocumentPanel from "@/components/requirement/requirement-document-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateRequirementDocument } from "@/hooks/mutations/requirement/use-create-requirement-document";
import useRequirementDocuments from "@/hooks/queries/requirement/use-requirement-documents";
import { toast } from "@/lib/toast";

type RequirementDocumentsProps = {
  requirementId: string;
  workspaceId: string;
  canEdit: boolean;
};

/**
 * The documents that hang off a requirement. A requirement can carry several —
 * its PRD first among them — and each one keeps its own version history, so the
 * list is a switcher rather than a single body field.
 */
export default function RequirementDocuments({
  requirementId,
  workspaceId,
  canEdit,
}: RequirementDocumentsProps) {
  const { t } = useTranslation();

  const { data: documents = [], isLoading } = useRequirementDocuments(
    requirementId,
    workspaceId,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const createDocument = useCreateRequirementDocument();

  const activeId =
    selectedId && documents.some((document) => document.id === selectedId)
      ? selectedId
      : (documents[0]?.id ?? null);
  // A selection that is not in this requirement's list falls back to its first
  // document on its own, so no reset is needed when the tree selection moves.

  const submitCreate = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }

    createDocument.mutate(
      { id: requirementId, workspaceId, title: trimmed },
      {
        onSuccess: (document) => {
          setSelectedId(document.id);
          setCreateOpen(false);
          setNewTitle("");
          toast.success(t("requirements:documents.created"));
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t("requirements:documents.createError"),
          );
        },
      },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">
            {t("requirements:documents.title")}
          </h3>
          {documents.length > 0 ? (
            <Badge variant="outline">{documents.length}</Badge>
          ) : null}
        </div>

        {canEdit ? (
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            variant="outline"
          >
            <FilePlus2 />
            {t("requirements:documents.new")}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border border-dashed px-4 py-8 text-center">
          <FileText className="size-5 text-muted-foreground" />
          <p className="max-w-md text-muted-foreground text-sm">
            {t("requirements:documents.empty")}
          </p>
        </div>
      ) : (
        <>
          {documents.length > 1 ? (
            <div className="flex flex-wrap gap-1.5">
              {documents.map((document) => (
                <button
                  key={document.id}
                  className={`cursor-pointer rounded-md border px-2.5 py-1 text-sm transition-colors ${
                    document.id === activeId
                      ? "border-border bg-accent text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-accent/50"
                  }`}
                  onClick={() => setSelectedId(document.id)}
                  type="button"
                >
                  {document.title}
                </button>
              ))}
            </div>
          ) : null}

          {activeId ? (
            <RequirementDocumentPanel
              canEdit={canEdit}
              documentId={activeId}
              // Remounting per document is what clears an open editor, a rename,
              // or a historical view when the user switches documents.
              key={activeId}
              // Deleting the open document has to move the selection somewhere
              // valid; clearing it lets the list pick the first remaining one.
              onDeleted={() => setSelectedId(null)}
              workspaceId={workspaceId}
            />
          ) : null}
        </>
      )}

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>{t("requirements:documents.createTitle")}</DialogTitle>
            <DialogDescription>
              {t("requirements:documents.createDescription")}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-2 pt-6">
            <Label className="text-sm" htmlFor="requirement-document-title">
              {t("requirements:documents.titleLabel")}
            </Label>
            <Input
              id="requirement-document-title"
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder={t("requirements:documents.titlePlaceholder")}
              value={newTitle}
            />
          </DialogPanel>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button onClick={() => setCreateOpen(false)} variant="outline">
              {t("requirements:actions.cancel")}
            </Button>
            <Button
              disabled={!newTitle.trim()}
              loading={createDocument.isPending}
              onClick={submitCreate}
            >
              {t("requirements:documents.createConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
