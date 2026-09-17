import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Task from "@/types/task";
import TaskRequirement from "./task-requirement";

const mocks = vi.hoisted(() => ({
  canUpdateTasks: vi.fn(),
  navigate: vi.fn(),
  options: vi.fn(),
  updateRequirement: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("@/hooks/mutations/task/use-update-task-requirement", () => ({
  useUpdateTaskRequirement: () => ({
    mutateAsync: mocks.updateRequirement,
    isPending: false,
  }),
}));
vi.mock("@/hooks/queries/requirement/use-requirement-options", () => ({
  default: () => mocks.options(),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canUpdateTasks: mocks.canUpdateTasks }),
}));
vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Fix the login bug",
    number: 12,
    description: null,
    status: "to-do",
    priority: "high",
    startDate: null,
    dueDate: null,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    userId: null,
    assigneeId: null,
    assigneeName: null,
    projectId: "project-1",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.canUpdateTasks.mockReturnValue(true);
  mocks.options.mockReturnValue({
    data: [
      { id: "req-a", title: "Onboarding revamp", parentId: null, depth: 0 },
      { id: "req-b", title: "Payment retries", parentId: "req-a", depth: 1 },
    ],
    isLoading: false,
  });
  mocks.updateRequirement.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TaskRequirement", () => {
  it("labels the row and falls back to the detail payload title", () => {
    render(
      <TaskRequirement
        task={makeTask({
          requirementId: "req-b",
          requirementTitle: "Payment retries",
        })}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("tasks:requirement.title")).toBeDefined();
    expect(screen.getByText("Payment retries")).toBeDefined();
  });

  it("uses the options list as the title source when the payload omits it", () => {
    render(
      <TaskRequirement
        task={makeTask({ requirementId: "req-a" })}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("Onboarding revamp")).toBeDefined();
  });

  it("shows the unlinked placeholder for a task with no requirement", () => {
    render(<TaskRequirement task={makeTask()} workspaceId="workspace-1" />);

    expect(screen.getByText("tasks:requirement.none")).toBeDefined();
  });

  it("links the picked requirement to this task", async () => {
    render(<TaskRequirement task={makeTask()} workspaceId="workspace-1" />);

    fireEvent.click(screen.getByText("tasks:requirement.none"));

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("tasks:requirement.searchPlaceholder"),
      ).toBeDefined(),
    );

    fireEvent.click(screen.getByText("Onboarding revamp"));

    await waitFor(() =>
      expect(mocks.updateRequirement).toHaveBeenCalledWith({
        taskId: "task-1",
        projectId: "project-1",
        requirementId: "req-a",
      }),
    );
  });

  it("unlinks the requirement currently attached to the task", async () => {
    render(
      <TaskRequirement
        task={makeTask({
          requirementId: "req-a",
          requirementTitle: "Onboarding revamp",
        })}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.click(screen.getByText("Onboarding revamp"));

    await waitFor(() =>
      expect(screen.getByText("tasks:requirement.unlink")).toBeDefined(),
    );

    fireEvent.click(screen.getByText("tasks:requirement.unlink"));

    await waitFor(() =>
      expect(mocks.updateRequirement).toHaveBeenCalledWith({
        taskId: "task-1",
        projectId: "project-1",
        requirementId: null,
      }),
    );
  });

  it("opens the requirement from a task that is already linked", () => {
    render(
      <TaskRequirement
        task={makeTask({
          requirementId: "req-b",
          requirementTitle: "Payment retries",
        })}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "tasks:requirement.open" }),
    );

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard/workspace/$workspaceId/requirements",
      params: { workspaceId: "workspace-1" },
      search: { requirementId: "req-b" },
    });
  });

  // A read-only role must see the current link without being able to change it.
  it("disables the picker without task-update permission", () => {
    mocks.canUpdateTasks.mockReturnValue(false);

    render(
      <TaskRequirement
        task={makeTask({
          requirementId: "req-a",
          requirementTitle: "Onboarding revamp",
        })}
        workspaceId="workspace-1"
      />,
    );

    const trigger = screen.getByText("Onboarding revamp").closest("button");
    expect(trigger).toBeDisabled();
    expect(screen.queryByText("tasks:requirement.unlink")).toBeNull();
  });
});
