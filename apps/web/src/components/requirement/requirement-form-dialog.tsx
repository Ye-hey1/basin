import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ParentPicker,
  PriorityPicker,
} from "@/components/requirement/requirement-pickers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRequirement } from "@/hooks/mutations/requirement/use-create-requirement";
import { useUpdateRequirement } from "@/hooks/mutations/requirement/use-update-requirement";
import type {
  Requirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
} from "@/types/requirement";
import { REQUIREMENT_STATUSES, REQUIREMENT_TYPES } from "./constants";

type RequirementFormDialogProps = {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present means edit mode; absent means create. */
  requirement?: Requirement | null;
  /** Pre-selected parent when creating a sub-requirement. */
  parentId?: string | null;
};

export default function RequirementFormDialog({
  workspaceId,
  open,
  onOpenChange,
  requirement,
  parentId,
}: RequirementFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = Boolean(requirement);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [priority, setPriority] = useState<RequirementPriority>("P2");
  const [type, setType] = useState<RequirementType>("feature");
  const [status, setStatus] = useState<RequirementStatus>("pending_review");
  const [parent, setParent] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  const createRequirement = useCreateRequirement();
  const updateRequirement = useUpdateRequirement();

  // Reset on open so a cancelled edit never leaks into the next create.
  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle(requirement?.title ?? "");
    setDescription(requirement?.description ?? "");
    setModule(requirement?.module ?? "");
    setExpectedDate(
      requirement?.expectedDate ? requirement.expectedDate.slice(0, 10) : "",
    );
    setPriority(requirement?.priority ?? "P2");
    setType(requirement?.type ?? "feature");
    setStatus(requirement?.status ?? "pending_review");
    setParent(requirement?.parentId ?? parentId ?? null);
    setTitleError(false);
  }, [open, requirement, parentId]);

  const submitting = createRequirement.isPending || updateRequirement.isPending;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(true);
      return;
    }

    const onError = (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : t("requirements:toast.error"),
      );
    };

    if (requirement) {
      updateRequirement.mutate(
        {
          id: requirement.id,
          workspaceId,
          title: trimmed,
          description: description || null,
          module: module || null,
          expectedDate: expectedDate || null,
          priority,
          type,
          status,
        },
        {
          onSuccess: () => {
            toast.success(t("requirements:toast.updated"));
            onOpenChange(false);
          },
          onError,
        },
      );
      return;
    }

    createRequirement.mutate(
      {
        workspaceId,
        title: trimmed,
        description: description || undefined,
        module: module || undefined,
        expectedDate: expectedDate || undefined,
        priority,
        type,
        // The PRD belongs on roots; a child node carries its own description.
        parentId: parent,
      },
      {
        onSuccess: () => {
          toast.success(t("requirements:toast.created"));
          onOpenChange(false);
        },
        onError,
      },
    );
  };

  const heading = isEdit
    ? t("requirements:form.editTitle")
    : parentId
      ? t("requirements:form.createChildTitle")
      : t("requirements:form.createTitle");

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{t("requirements:subtitle")}</DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-5 pt-6">
          <FormRow
            error={
              titleError ? t("requirements:errors.titleRequired") : undefined
            }
            htmlFor="requirement-title"
            label={t("requirements:fields.title")}
          >
            <Input
              id="requirement-title"
              onChange={(event) => {
                setTitle(event.target.value);
                if (titleError) {
                  setTitleError(false);
                }
              }}
              placeholder={t("requirements:form.titlePlaceholder")}
              value={title}
            />
          </FormRow>

          <FormRow
            htmlFor="requirement-description"
            label={t("requirements:fields.description")}
          >
            <Textarea
              className="[&_textarea]:min-h-20 [&_textarea]:resize-none"
              id="requirement-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("requirements:form.descriptionPlaceholder")}
              value={description}
            />
          </FormRow>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormRow label={t("requirements:fields.priority")}>
              <PriorityPicker onChange={setPriority} value={priority} />
            </FormRow>

            <FormRow label={t("requirements:fields.type")}>
              <Select
                onValueChange={(next) => setType(next as RequirementType)}
                value={type}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{t(`requirements:type.${type}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REQUIREMENT_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`requirements:type.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormRow>

            {isEdit ? (
              <FormRow label={t("requirements:fields.status")}>
                <Select
                  onValueChange={(next) => setStatus(next as RequirementStatus)}
                  value={status}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {t(`requirements:status.${status}`)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIREMENT_STATUSES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`requirements:status.${option}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
            ) : (
              <FormRow label={t("requirements:fields.parent")}>
                <ParentPicker
                  onChange={setParent}
                  value={parent}
                  workspaceId={workspaceId}
                />
              </FormRow>
            )}

            <FormRow
              htmlFor="requirement-module"
              label={t("requirements:fields.module")}
            >
              <Input
                id="requirement-module"
                onChange={(event) => setModule(event.target.value)}
                value={module}
              />
            </FormRow>

            <FormRow
              htmlFor="requirement-expected-date"
              label={t("requirements:fields.expectedDate")}
            >
              <Input
                id="requirement-expected-date"
                onChange={(event) => setExpectedDate(event.target.value)}
                type="date"
                value={expectedDate}
              />
            </FormRow>
          </div>
        </DialogPanel>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            {t("requirements:actions.cancel")}
          </Button>
          <Button loading={submitting} onClick={submit}>
            {isEdit
              ? t("requirements:form.save")
              : t("requirements:form.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Label, control, and an optional hint or error stacked at the rhythm the rest
 * of Basin's dialogs use (label→control 8px, field→field 20px).
 */
function FormRow({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? (
        <p className="text-destructive-foreground text-xs">{error}</p>
      ) : null}
    </div>
  );
}
