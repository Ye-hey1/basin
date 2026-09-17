import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RequirementTask } from "@/types/requirement";
import RequirementTasks from "./requirement-tasks";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  tasks: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("@/hooks/queries/requirement/use-requirement-tasks", () => ({
  default: () => mocks.tasks(),
}));

function makeTask(overrides: Partial<RequirementTask> = {}): RequirementTask {
  return {
    id: "task-1",
    title: "Ship the onboarding flow",
    number: 12,
    status: "to-do",
    priority: "high",
    projectId: "project-1",
    projectName: "App",
    assigneeName: null,
    dueDate: null,
    isFinal: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.tasks.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RequirementTasks", () => {
  it("reports progress from the requirement's own counters", () => {
    mocks.tasks.mockReturnValue({
      data: [
        makeTask({ id: "task-1", isFinal: true, status: "done" }),
        makeTask({ id: "task-2", title: "Write the migration" }),
      ],
      isLoading: false,
    });

    render(
      <RequirementTasks
        requirementId="req-1"
        taskCounts={{ total: 2, done: 1 }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("requirements:tasks.title")).toBeDefined();
    expect(screen.getByText("requirements:tasks.progress")).toBeDefined();
  });

  it("lists every linked task with its project key", () => {
    mocks.tasks.mockReturnValue({
      data: [
        makeTask({ id: "task-1", number: 12 }),
        makeTask({
          id: "task-2",
          title: "Write the migration",
          number: 34,
          projectName: "API",
        }),
      ],
      isLoading: false,
    });

    render(
      <RequirementTasks
        requirementId="req-1"
        taskCounts={{ total: 2, done: 0 }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("Ship the onboarding flow")).toBeDefined();
    expect(screen.getByText("Write the migration")).toBeDefined();
    expect(screen.getByText("App-12")).toBeDefined();
    expect(screen.getByText("API-34")).toBeDefined();
  });

  // A requirement spans projects, so each row has to open the task inside its
  // own project rather than the project the user happens to be viewing.
  it("opens each task in its own project", () => {
    mocks.tasks.mockReturnValue({
      data: [makeTask({ id: "task-9", projectId: "project-9" })],
      isLoading: false,
    });

    render(
      <RequirementTasks
        requirementId="req-1"
        taskCounts={{ total: 1, done: 0 }}
        workspaceId="workspace-1"
      />,
    );

    fireEvent.click(screen.getByText("Ship the onboarding flow"));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
      params: {
        workspaceId: "workspace-1",
        projectId: "project-9",
        taskId: "task-9",
      },
    });
  });

  it("strikes through a task that sits in a final column", () => {
    mocks.tasks.mockReturnValue({
      data: [makeTask({ id: "task-1", isFinal: true, status: "done" })],
      isLoading: false,
    });

    render(
      <RequirementTasks
        requirementId="req-1"
        taskCounts={{ total: 1, done: 1 }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("Ship the onboarding flow").className).toContain(
      "line-through",
    );
  });

  it("shows the empty state without linked tasks and no progress badge", () => {
    render(
      <RequirementTasks
        requirementId="req-1"
        taskCounts={{ total: 0, done: 0 }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText("requirements:tasks.empty")).toBeDefined();
    expect(screen.queryByText("requirements:tasks.progress")).toBeNull();
  });
});
