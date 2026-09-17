import { Check, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { acceptanceStatusVariant } from "@/components/requirement/requirement-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateAcceptanceItem,
  useDeleteAcceptanceItem,
  useUpdateAcceptanceItem,
} from "@/hooks/mutations/requirement/use-requirement-children";
import type { AcceptanceItem } from "@/types/requirement";

type RequirementAcceptanceListProps = {
  requirementId: string;
  workspaceId: string;
  items: AcceptanceItem[];
  canEdit: boolean;
};

export default function RequirementAcceptanceList({
  requirementId,
  workspaceId,
  items,
  canEdit,
}: RequirementAcceptanceListProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const createItem = useCreateAcceptanceItem();
  const updateItem = useUpdateAcceptanceItem();
  const deleteItem = useDeleteAcceptanceItem();

  const reportError = (error: unknown) => {
    toast.error(
      error instanceof Error ? error.message : t("requirements:toast.error"),
    );
  };

  const addItem = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    createItem.mutate(
      { id: requirementId, workspaceId, title },
      {
        onSuccess: () => {
          setDraft("");
          toast.success(t("requirements:toast.acceptanceAdded"));
        },
        onError: reportError,
      },
    );
  };

  const setStatus = (
    item: AcceptanceItem,
    status: "pending" | "passed" | "failed",
  ) => {
    updateItem.mutate(
      { itemId: item.id, workspaceId, requirementId, status },
      { onError: reportError },
    );
  };

  const remove = (item: AcceptanceItem) => {
    deleteItem.mutate(
      { itemId: item.id, workspaceId, requirementId },
      {
        onSuccess: () =>
          toast.success(t("requirements:toast.acceptanceRemoved")),
        onError: reportError,
      },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-medium text-sm">
        {t("requirements:acceptance.title")}
      </h3>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("requirements:acceptance.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              className="group flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
              key={item.id}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm">{item.title}</span>
                {item.criterion ? (
                  <span className="text-muted-foreground text-xs">
                    {item.criterion}
                  </span>
                ) : null}
                {item.verifiedByName ? (
                  <span className="text-muted-foreground text-xs">
                    {t("requirements:acceptance.verifiedBy", {
                      name: item.verifiedByName,
                    })}
                  </span>
                ) : null}
              </div>

              <Badge
                className="mt-0.5 shrink-0"
                variant={acceptanceStatusVariant(item.status)}
              >
                {t(`requirements:acceptanceStatus.${item.status}`)}
              </Badge>

              {canEdit ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  {item.status === "passed" ? (
                    <Button
                      aria-label={t("requirements:acceptance.reset")}
                      onClick={() => setStatus(item, "pending")}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <RotateCcw />
                    </Button>
                  ) : (
                    <>
                      <Button
                        aria-label={t("requirements:acceptance.markPassed")}
                        onClick={() => setStatus(item, "passed")}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Check />
                      </Button>
                      <Button
                        aria-label={t("requirements:acceptance.markFailed")}
                        onClick={() => setStatus(item, "failed")}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <X />
                      </Button>
                    </>
                  )}
                  <Button
                    aria-label={t("requirements:actions.delete")}
                    onClick={() => remove(item)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="flex items-center gap-2">
          <Input
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                addItem();
              }
            }}
            placeholder={t("requirements:acceptance.criterionPlaceholder")}
            value={draft}
          />
          <Button
            disabled={!draft.trim()}
            loading={createItem.isPending}
            onClick={addItem}
            size="sm"
            variant="outline"
          >
            <Plus />
            {t("requirements:acceptance.add")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
