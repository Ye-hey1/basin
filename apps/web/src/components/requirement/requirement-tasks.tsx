import { useNavigate } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import useRequirementTasks from "@/hooks/queries/requirement/use-requirement-tasks";
import { formatDateShort } from "@/lib/format";
import { getStatusLabel } from "@/lib/i18n/domain";
import type { RequirementTask } from "@/types/requirement";

type RequirementTasksProps = {
  requirementId: string;
  workspaceId: string;
  taskCounts: { total: number; done: number };
};

/**
 * Every task in the workspace linked to this requirement. Deliberately not the
 * project-scoped board: a requirement spans projects, and a breakdown that hid
 * the other projects' work would misreport progress.
 */
export default function RequirementTasks({
  requirementId,
  workspaceId,
  taskCounts,
}: RequirementTasksProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useRequirementTasks(
    requirementId,
    workspaceId,
  );

  const progress =
    taskCounts.total === 0
      ? 0
      : Math.round((taskCounts.done / taskCounts.total) * 100);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-sm">{t("requirements:tasks.title")}</h3>
        {taskCounts.total > 0 ? (
          <Badge variant={progress === 100 ? "success" : "outline"}>
            {t("requirements:tasks.progress", {
              done: taskCounts.done,
              total: taskCounts.total,
            })}
          </Badge>
        ) : null}
      </div>

      {taskCounts.total > 0 ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((key) => (
            <Skeleton className="h-8 w-full" key={key} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("requirements:tasks.empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              onOpen={() =>
                navigate({
                  to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
                  params: {
                    workspaceId,
                    projectId: task.projectId,
                    taskId: task.id,
                  },
                })
              }
              task={task}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({
  task,
  onOpen,
}: {
  task: RequirementTask;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
        onClick={onOpen}
        type="button"
      >
        <ListTodo className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-muted-foreground text-xs">
          {task.projectName}
          {task.number === null ? "" : `-${task.number}`}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${task.isFinal ? "text-muted-foreground line-through" : ""}`}
        >
          {task.title}
        </span>

        {task.assigneeName ? (
          <span className="hidden truncate text-muted-foreground text-xs sm:block">
            {task.assigneeName}
          </span>
        ) : null}

        {task.dueDate ? (
          <span className="hidden text-muted-foreground text-xs md:block">
            {formatDateShort(task.dueDate)}
          </span>
        ) : null}

        <Badge size="sm" variant={task.isFinal ? "success" : "outline"}>
          {getStatusLabel(task.status)}
        </Badge>
      </button>
    </li>
  );
}
