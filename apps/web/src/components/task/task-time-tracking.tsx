import { Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import useCreateTimeEntry from "@/hooks/mutations/time-entry/use-create-time-entry";
import useDeleteTimeEntry from "@/hooks/mutations/time-entry/use-delete-time-entry";
import useGetTimeEntriesByTaskId from "@/hooks/queries/time-entry/use-get-time-entries";
import { translateApiError } from "@/lib/error-handler";
import { toast } from "@/lib/toast";
import type { TimeEntry } from "@/types/time-entry";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function elapsedSeconds(entry: TimeEntry) {
  if (entry.duration != null) return entry.duration;
  const end = entry.endTime ? new Date(entry.endTime) : new Date();
  return Math.max(
    0,
    Math.floor((end.getTime() - new Date(entry.startTime).getTime()) / 1000),
  );
}

function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function TaskTimeTracking({
  taskId,
  canEdit,
}: {
  taskId: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const { data: entries, isLoading } = useGetTimeEntriesByTaskId(taskId);
  const createTimeEntry = useCreateTimeEntry();
  const deleteTimeEntry = useDeleteTimeEntry(taskId);
  const [adding, setAdding] = useState(false);
  const [startTime, setStartTime] = useState(
    toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)),
  );
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");

  const totalSeconds =
    entries?.reduce((sum, entry) => sum + elapsedSeconds(entry), 0) ?? 0;

  const handleAdd = async () => {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      toast.error(t("tasks:time.startRequired"));
      return;
    }
    const end = endTime ? new Date(endTime) : null;
    if (end && end.getTime() <= start.getTime()) {
      toast.error(t("tasks:time.endAfterStart"));
      return;
    }

    try {
      await createTimeEntry.mutateAsync({
        taskId,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : undefined,
        description: description || undefined,
      });
      toast.success(t("tasks:time.addSuccess"));
      setAdding(false);
      setDescription("");
      setStartTime(toLocalInputValue(new Date(Date.now() - 60 * 60 * 1000)));
      setEndTime("");
    } catch (error) {
      toast.error(
        translateApiError(error) ??
          (error instanceof Error ? error.message : t("tasks:time.addError")),
      );
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteTimeEntry.mutateAsync(entryId);
      toast.success(t("tasks:time.deleteSuccess"));
    } catch (error) {
      toast.error(
        translateApiError(error) ??
          (error instanceof Error
            ? error.message
            : t("tasks:time.deleteError")),
      );
    }
  };

  return (
    <div className="space-y-3 border-b border-border px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" />
          {t("tasks:time.title")}
        </div>
        <span className="text-xs font-medium">
          {formatDuration(totalSeconds)}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Spinner className="size-4" />
        </div>
      ) : (
        <>
          {entries && entries.length > 0 ? (
            <ul className="space-y-1.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {entry.description ||
                      new Date(entry.startTime).toLocaleDateString()}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatDuration(elapsedSeconds(entry))}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive"
                      onClick={() => void handleDelete(entry.id)}
                      aria-label={t("tasks:time.deleteAria")}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground/70 text-xs">
              {t("tasks:time.empty")}
            </p>
          )}

          {canEdit ? (
            adding ? (
              <div className="space-y-2">
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-7 text-xs"
                />
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("tasks:time.descriptionPlaceholder")}
                  className="h-7 text-xs"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setAdding(false)}
                  >
                    {t("common:actions.cancel")}
                  </Button>
                  <Button
                    size="xs"
                    disabled={createTimeEntry.isPending}
                    onClick={() => void handleAdd()}
                  >
                    {t("tasks:time.add")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="xs"
                className="w-full"
                onClick={() => setAdding(true)}
              >
                {t("tasks:time.add")}
              </Button>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

export default TaskTimeTracking;
