import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  ChevronDown,
  CircleDot,
  Play,
  Plus,
  RefreshCw,
  Server,
  Trash2,
} from "lucide-react";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AgentRun } from "@/fetchers/agents/runs";
import { getAgentRun } from "@/fetchers/agents/runs";
import type { AgentTrigger, McpServer } from "@/fetchers/agents/types";
import {
  useCreateAgentTrigger,
  useCreateMcpServer,
  useDeleteAgentTrigger,
  useDeleteMcpServer,
  useRunAgentTrigger,
  useUpdateAgentTrigger,
  useUpdateMcpServer,
} from "@/hooks/mutations/agents/use-agent-mutations";
import {
  useGetAgentRuns,
  useGetAgentTriggers,
  useGetMcpServers,
} from "@/hooks/queries/agents/use-agent-data";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";

const EVENT_TYPES = [
  {
    value: "task.status_changed",
    labelKey: "agents:eventTypes.taskStatusChanged",
  },
  {
    value: "task.due_date_changed",
    labelKey: "agents:eventTypes.taskDueDateChanged",
  },
  {
    value: "requirement.updated",
    labelKey: "agents:eventTypes.requirementUpdated",
  },
] as const;

function StatusBadge({ status }: { status: string }): ReactElement {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-medium",
        status === "completed" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
        status === "failed" &&
          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
        status === "running" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        status === "pending" && "bg-muted text-muted-foreground",
      )}
    >
      {t(`agents:runStatus.${status}`, { defaultValue: status })}
    </span>
  );
}

function TriggerDialog({
  workspaceId,
  trigger,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  trigger?: AgentTrigger;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { t } = useTranslation();
  const createTrigger = useCreateAgentTrigger();
  const updateTrigger = useUpdateAgentTrigger();
  const { data: projects = [] } = useGetProjects({ workspaceId });

  const [name, setName] = useState(trigger?.name ?? "");
  const [type, setType] = useState<"event" | "cron">(
    (trigger?.type as "event" | "cron") ?? "event",
  );
  const [eventType, setEventType] = useState<string>(
    trigger?.eventType ?? "task.status_changed",
  );
  const [conditionStatus, setConditionStatus] = useState<string>(
    (trigger?.condition?.newStatus as string) ?? "",
  );
  const [cron, setCron] = useState(trigger?.cron ?? "");
  const [projectId, setProjectId] = useState(trigger?.projectId ?? "none");
  const [instruction, setInstruction] = useState(trigger?.instruction ?? "");

  async function handleSubmit() {
    try {
      if (trigger) {
        await updateTrigger.mutateAsync({
          id: trigger.id,
          workspaceId,
          name,
          eventType: type === "event" ? (eventType as never) : undefined,
          condition:
            type === "event" && conditionStatus
              ? { newStatus: conditionStatus }
              : null,
          cron: type === "cron" ? cron : null,
          projectId: projectId === "none" ? null : projectId || null,
          instruction,
        });
      } else {
        await createTrigger.mutateAsync({
          workspaceId,
          name,
          type,
          eventType: type === "event" ? (eventType as never) : undefined,
          condition:
            type === "event" && conditionStatus
              ? { newStatus: conditionStatus }
              : undefined,
          cron: type === "cron" ? cron : undefined,
          projectId: projectId === "none" ? undefined : projectId || undefined,
          instruction,
        });
      }
      toast.success(t("agents:triggerSaved"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("agents:triggerSaveFailed"),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {trigger ? t("agents:editTrigger") : t("agents:newTrigger")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trigger-name">{t("agents:fields.name")}</Label>
            <Input
              id="trigger-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("agents:fields.type")}</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType((value ?? "event") as "event" | "cron")
                }
              >
                <SelectTrigger className="w-full">
                  {t(`agents:types.${type}`)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">
                    {t("agents:types.event")}
                  </SelectItem>
                  <SelectItem value="cron">{t("agents:types.cron")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "event" ? (
              <div className="space-y-1.5">
                <Label>{t("agents:fields.eventType")}</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) =>
                    setEventType(value ?? "task.status_changed")
                  }
                >
                  <SelectTrigger className="w-full">
                    {t(
                      EVENT_TYPES.find((item) => item.value === eventType)
                        ?.labelKey ?? "",
                      { defaultValue: eventType },
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {t(item.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="trigger-cron">{t("agents:fields.cron")}</Label>
                <Input
                  id="trigger-cron"
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                  placeholder="30 8 * * *"
                />
              </div>
            )}
          </div>
          {type === "event" && eventType === "task.status_changed" && (
            <div className="space-y-1.5">
              <Label htmlFor="trigger-status">
                {t("agents:fields.conditionStatus")}
              </Label>
              <Input
                id="trigger-status"
                value={conditionStatus}
                onChange={(event) => setConditionStatus(event.target.value)}
                placeholder={t("agents:fields.conditionStatusHint")}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{t("agents:fields.project")}</Label>
            <Select
              value={projectId || "none"}
              onValueChange={(value) => setProjectId(value ?? "none")}
            >
              <SelectTrigger className="w-full">
                {t("agents:fields.anyProject")}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("agents:fields.anyProject")}
                </SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trigger-instruction">
              {t("agents:fields.instruction")}
            </Label>
            <Textarea
              id="trigger-instruction"
              rows={4}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder={t("agents:fields.instructionHint")}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t("common:actions.cancel")}
          </DialogClose>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              !name.trim() ||
              !instruction.trim() ||
              createTrigger.isPending ||
              updateTrigger.isPending
            }
          >
            {t("common:actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function McpServerDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): ReactElement {
  const { t } = useTranslation();
  const createServer = useCreateMcpServer();
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"http" | "stdio">("http");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [headersJson, setHeadersJson] = useState("{}");

  async function handleSubmit() {
    let headers: Record<string, string> | undefined;
    try {
      const parsed = JSON.parse(headersJson) as Record<string, string>;
      headers = Object.keys(parsed).length > 0 ? parsed : undefined;
    } catch {
      toast.error(t("agents:mcp.invalidHeaders"));
      return;
    }
    try {
      await createServer.mutateAsync({
        workspaceId,
        name,
        transport,
        url: transport === "http" ? url : undefined,
        command: transport === "stdio" ? command : undefined,
        headers,
      });
      toast.success(t("agents:mcp.saved"));
      onOpenChange(false);
      setName("");
      setUrl("");
      setCommand("");
      setHeadersJson("{}");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("agents:mcp.saveFailed"),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("agents:mcp.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">{t("agents:fields.name")}</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("agents:mcp.transport")}</Label>
            <Select
              value={transport}
              onValueChange={(value) =>
                setTransport((value ?? "http") as "http" | "stdio")
              }
            >
              <SelectTrigger className="w-full">
                {t(`agents:mcp.${transport}`)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">{t("agents:mcp.http")}</SelectItem>
                <SelectItem value="stdio">{t("agents:mcp.stdio")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {transport === "http" ? (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-url">URL</Label>
              <Input
                id="mcp-url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/mcp"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-command">{t("agents:mcp.command")}</Label>
              <Input
                id="mcp-command"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="npx -y @modelcontextprotocol/server-everything"
              />
            </div>
          )}
          {transport === "http" && (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-headers">{t("agents:mcp.headers")}</Label>
              <Textarea
                id="mcp-headers"
                rows={2}
                value={headersJson}
                onChange={(event) => setHeadersJson(event.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>
            {t("common:actions.cancel")}
          </DialogClose>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || createServer.isPending}
          >
            {t("common:actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunDetail({
  runId,
  workspaceId,
}: {
  runId: string;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const { data: detail } = useQuery({
    queryKey: ["agent-run", runId],
    queryFn: () => getAgentRun(runId, workspaceId),
    enabled: Boolean(runId),
  });

  if (!detail) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        {t("common:states.loading")}
      </p>
    );
  }

  return (
    <div className="space-y-2 p-3 text-xs">
      {detail.run.output && (
        <div>
          <p className="mb-1 font-medium">{t("agents:run.output")}</p>
          <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-2">
            {detail.run.output}
          </p>
        </div>
      )}
      {detail.run.error && (
        <div>
          <p className="mb-1 font-medium text-destructive">
            {t("agents:run.error")}
          </p>
          <p className="rounded-md bg-red-50 p-2 dark:bg-red-950">
            {detail.run.error}
          </p>
        </div>
      )}
      {detail.steps.length > 0 && (
        <div>
          <p className="mb-1 font-medium">{t("agents:run.steps")}</p>
          <div className="space-y-1">
            {detail.steps.map((step) => (
              <div
                key={step.id}
                className="rounded-md border border-border p-2"
              >
                <span className="font-mono font-medium">{step.toolName}</span>
                <span className="ml-2 text-muted-foreground">
                  {step.resultSummary?.slice(0, 160)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentsManager({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const { data: triggers = [] } = useGetAgentTriggers(workspaceId);
  const { data: runs = [] } = useGetAgentRuns(workspaceId);
  const { data: mcpServers = [] } = useGetMcpServers(workspaceId);
  const runTrigger = useRunAgentTrigger();
  const deleteTrigger = useDeleteAgentTrigger();
  const deleteServer = useDeleteMcpServer();
  const updateServer = useUpdateMcpServer();

  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<
    AgentTrigger | undefined
  >();
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  async function handleRun(triggerId: string) {
    try {
      await runTrigger.mutateAsync({ id: triggerId, workspaceId });
      toast.success(t("agents:runQueued"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("agents:runQueuedFailed"),
      );
    }
  }

  return (
    <div className="space-y-8 p-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4" />
            {t("agents:triggers.title")}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMcpDialogOpen(true);
              }}
            >
              <Server className="size-3.5" />
              {t("agents:mcp.title")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingTrigger(undefined);
                setTriggerDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              {t("agents:triggers.new")}
            </Button>
          </div>
        </div>

        {mcpServers.length > 0 && (
          <div className="mb-3 space-y-1">
            {mcpServers.map((server: McpServer) => (
              <div
                key={server.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm"
              >
                <Server className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{server.name}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {t(`agents:mcp.${server.transport}`)}
                </span>
                {!server.enabled && (
                  <span className="text-xs text-muted-foreground">
                    {t("agents:mcp.disabled")}
                  </span>
                )}
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void updateServer.mutateAsync({
                        id: server.id,
                        workspaceId,
                        enabled: !server.enabled,
                      })
                    }
                  >
                    {server.enabled
                      ? t("agents:mcp.disable")
                      : t("agents:mcp.enable")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("agents:mcp.delete")}
                    onClick={() =>
                      void deleteServer.mutateAsync({
                        id: server.id,
                        workspaceId,
                      })
                    }
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {triggers.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("agents:triggers.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            {triggers.map((trigger: AgentTrigger) => (
              <div
                key={trigger.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CircleDot
                      className={cn(
                        "size-3.5",
                        trigger.enabled
                          ? "text-emerald-500"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="truncate text-sm font-medium">
                      {trigger.name}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {t(`agents:types.${trigger.type}`)}
                      {trigger.type === "event" && trigger.eventType
                        ? ` · ${trigger.eventType}`
                        : ""}
                      {trigger.type === "cron" && trigger.cron
                        ? ` · ${trigger.cron}`
                        : ""}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {trigger.instruction}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={runTrigger.isPending}
                    onClick={() => void handleRun(trigger.id)}
                  >
                    <Play className="size-3.5" />
                    {t("agents:triggers.runNow")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTrigger(trigger);
                      setTriggerDialogOpen(true);
                    }}
                  >
                    {t("common:actions.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("agents:triggers.delete")}
                    onClick={() =>
                      void deleteTrigger.mutateAsync({
                        id: trigger.id,
                        workspaceId,
                      })
                    }
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <RefreshCw className="size-4" />
            {t("agents:runs.title")}
          </h2>
        </div>
        {runs.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t("agents:runs.empty")}
          </p>
        ) : (
          <div className="space-y-1">
            {(runs as AgentRun[]).map((run) => (
              <div key={run.id} className="rounded-md border border-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 text-left text-sm"
                  onClick={() =>
                    setOpenRunId(openRunId === run.id ? null : run.id)
                  }
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform",
                      openRunId === run.id && "rotate-180",
                    )}
                  />
                  <StatusBadge status={run.status} />
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {t(`agents:triggerTypes.${run.triggerType}`)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {run.output || run.error || run.prompt}
                  </span>
                  {run.durationMs !== null && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {(run.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </button>
                {openRunId === run.id && (
                  <RunDetail runId={run.id} workspaceId={workspaceId} />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <TriggerDialog
        workspaceId={workspaceId}
        trigger={editingTrigger}
        open={triggerDialogOpen}
        onOpenChange={setTriggerDialogOpen}
      />
      <McpServerDialog
        workspaceId={workspaceId}
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
      />
    </div>
  );
}

export default AgentsManager;
