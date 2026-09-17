import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ParentPicker } from "@/components/requirement/requirement-pickers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMoveRequirement } from "@/hooks/mutations/requirement/use-move-requirement";

type RequirementMoveDialogProps = {
  workspaceId: string;
  requirementId: string | null;
  currentParentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function RequirementMoveDialog({
  workspaceId,
  requirementId,
  currentParentId,
  open,
  onOpenChange,
}: RequirementMoveDialogProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<string | null>(currentParentId);
  const moveRequirement = useMoveRequirement();

  useEffect(() => {
    if (open) {
      setTarget(currentParentId);
    }
  }, [open, currentParentId]);

  const submit = () => {
    if (!requirementId) {
      return;
    }

    moveRequirement.mutate(
      { id: requirementId, workspaceId, targetId: target },
      {
        onSuccess: () => {
          toast.success(t("requirements:toast.moved"));
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : t("requirements:toast.error"),
          );
        },
      },
    );
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("requirements:move.title")}</DialogTitle>
          <DialogDescription>
            {t("requirements:move.description")}
          </DialogDescription>
        </DialogHeader>

        {requirementId ? (
          <ParentPicker
            excludeId={requirementId}
            onChange={setTarget}
            value={target}
            workspaceId={workspaceId}
          />
        ) : null}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="ghost">
            {t("requirements:actions.cancel")}
          </Button>
          <Button disabled={moveRequirement.isPending} onClick={submit}>
            {t("requirements:move.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
