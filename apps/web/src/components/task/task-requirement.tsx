import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Check, ListTree, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskRequirement } from "@/hooks/mutations/task/use-update-task-requirement";
import useRequirementOptions from "@/hooks/queries/requirement/use-requirement-options";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskRequirementProps = {
  task: Task;
  workspaceId: string;
};

/**
 * A task belongs to at most one requirement, so this is a picker rather than a
 * list. The link is what makes a requirement's progress counters and the task
 * board describe the same work.
 */
export default function TaskRequirement({
  task,
  workspaceId,
}: TaskRequirementProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: options = [] } = useRequirementOptions(workspaceId);
  const { mutateAsync: updateTaskRequirement, isPending } =
    useUpdateTaskRequirement();
  const { canUpdateTasks } = useWorkspacePermission();
  const canEdit = canUpdateTasks();

  const isLinked = Boolean(task.requirementId);

  // The detail payload already resolves the title, so the row reads correctly
  // before the options request settles.
  const linkedTitle =
    task.requirementTitle ??
    options.find((option) => option.id === task.requirementId)?.title ??
    null;

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return options;
    }
    return options.filter((option) =>
      option.title.toLowerCase().includes(needle),
    );
  }, [options, query]);

  const applyChange = async (requirementId: string | null) => {
    try {
      await updateTaskRequirement({
        taskId: task.id,
        projectId: task.projectId,
        requirementId,
      });
      setOpen(false);
      setQuery("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:requirement.updateError"),
      );
    }
  };

  const openRequirement = () => {
    if (!task.requirementId) {
      return;
    }
    navigate({
      to: "/dashboard/workspace/$workspaceId/requirements",
      params: { workspaceId },
      search: { requirementId: task.requirementId },
    });
  };

  const trigger = (
    <button
      className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent/50 outline-none"
      disabled={!canEdit}
      type="button"
    >
      <ListTree className="size-3.5 shrink-0 text-muted-foreground" />
      <span
        className={`truncate text-sm ${linkedTitle ? "text-foreground/90" : "text-muted-foreground"}`}
      >
        {linkedTitle ?? t("tasks:requirement.none")}
      </span>
    </button>
  );

  const openButton = isLinked ? (
    <Button
      aria-label={t("tasks:requirement.open")}
      onClick={openRequirement}
      size="xs"
      variant="ghost"
    >
      <ArrowUpRight className="size-3.5" />
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-1">
      <span className="px-2 text-[11px] text-muted-foreground/70">
        {t("tasks:requirement.title")}
      </span>

      <div className="flex items-center gap-1">
        {canEdit ? (
          <Popover
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) {
                setQuery("");
              }
            }}
            open={open}
          >
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="border-b border-border p-2">
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("tasks:requirement.searchPlaceholder")}
                    type="search"
                    value={query}
                  />
                </InputGroup>
              </div>

              <div className="max-h-64 overflow-y-auto p-1">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-6 text-center text-muted-foreground text-sm">
                    {t("tasks:requirement.empty")}
                  </p>
                ) : (
                  filteredOptions.map((option) => (
                    <Button
                      className="h-8 w-full justify-start gap-2 px-2 font-normal"
                      disabled={isPending}
                      key={option.id}
                      onClick={() => applyChange(option.id)}
                      variant="ghost"
                    >
                      <span
                        className="truncate"
                        style={{
                          paddingInlineStart: `${option.depth * 0.75}rem`,
                        }}
                      >
                        {option.title}
                      </span>
                      {task.requirementId === option.id ? (
                        <Check className="ms-auto size-4 shrink-0" />
                      ) : null}
                    </Button>
                  ))
                )}
              </div>

              {isLinked ? (
                <div className="border-t border-border p-1">
                  <Button
                    className="h-8 w-full justify-start gap-2 px-2 text-destructive"
                    disabled={isPending}
                    onClick={() => applyChange(null)}
                    variant="ghost"
                  >
                    <X className="size-3.5" />
                    {t("tasks:requirement.unlink")}
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : (
          trigger
        )}

        {openButton}
      </div>
    </div>
  );
}
