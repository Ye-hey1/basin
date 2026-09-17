import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useRequirementOptions from "@/hooks/queries/requirement/use-requirement-options";
import type { RequirementPriority } from "@/types/requirement";
import { REQUIREMENT_PRIORITIES } from "./constants";

type PriorityPickerProps = {
  value: RequirementPriority;
  onChange: (value: RequirementPriority) => void;
};

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const { t } = useTranslation();

  return (
    <Select
      onValueChange={(next) => onChange(next as RequirementPriority)}
      value={value}
    >
      <SelectTrigger className="h-8 w-full text-sm">
        <SelectValue>{t(`requirements:priority.${value}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {REQUIREMENT_PRIORITIES.map((priority) => (
          <SelectItem key={priority} value={priority}>
            {t(`requirements:priority.${priority}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ParentPickerProps = {
  workspaceId: string;
  value: string | null;
  excludeId?: string;
  onChange: (value: string | null) => void;
};

/**
 * Parent selector. `excludeId` keeps the requirement itself and its subtree out
 * of the list, mirroring the server's cycle check rather than relying on the
 * request failing.
 */
export function ParentPicker({
  workspaceId,
  value,
  excludeId,
  onChange,
}: ParentPickerProps) {
  const { t } = useTranslation();
  const { data: options } = useRequirementOptions(workspaceId, excludeId);

  return (
    <Select
      onValueChange={(next) => onChange(next === "__root__" ? null : next)}
      value={value ?? "__root__"}
    >
      <SelectTrigger className="h-8 w-full text-sm">
        <SelectValue>
          {value
            ? (options?.find((option) => option.id === value)?.title ?? value)
            : t("requirements:fields.topLevel")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__root__">
          {t("requirements:move.toRoot")}
        </SelectItem>
        {(options ?? []).map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {`${"— ".repeat(option.depth)}${option.title}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
