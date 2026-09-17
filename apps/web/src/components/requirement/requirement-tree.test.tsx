import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RequirementTreeNode } from "@/types/requirement";
import RequirementTree from "./requirement-tree";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

function makeNode(
  overrides: Partial<RequirementTreeNode> & { id: string; title: string },
): RequirementTreeNode {
  return {
    workspaceId: "ws-1",
    parentId: null,
    description: null,
    status: "pending_review",
    priority: "P2",
    type: "feature",
    source: null,
    module: null,
    assigneeId: null,
    assigneeName: null,
    expectedDate: null,
    createdBy: null,
    position: 0,
    projects: [],
    acceptanceItems: [],
    documentCount: 0,
    taskCounts: { total: 0, done: 0 },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    children: [],
    ...overrides,
  };
}

const tree: RequirementTreeNode[] = [
  makeNode({
    id: "root",
    title: "Root requirement",
    children: [
      makeNode({ id: "child-a", title: "Child A", parentId: "root" }),
      makeNode({ id: "child-b", title: "Child B", parentId: "root" }),
    ],
  }),
];

describe("RequirementTree", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders children under their parent", () => {
    render(
      <RequirementTree nodes={tree} onSelect={vi.fn()} selectedId={null} />,
    );

    expect(screen.getByText("Root requirement")).toBeDefined();
    expect(screen.getByText("Child A")).toBeDefined();
    expect(screen.getByText("Child B")).toBeDefined();
  });

  it("hides a subtree when the parent is collapsed", () => {
    render(
      <RequirementTree nodes={tree} onSelect={vi.fn()} selectedId={null} />,
    );

    fireEvent.click(screen.getByLabelText("requirements:tree.collapse"));

    expect(screen.getByText("Root requirement")).toBeDefined();
    expect(screen.queryByText("Child A")).toBeNull();
    expect(screen.queryByText("Child B")).toBeNull();
  });

  it("reports the selected node id", () => {
    const onSelect = vi.fn();
    render(
      <RequirementTree nodes={tree} onSelect={onSelect} selectedId={null} />,
    );

    fireEvent.click(screen.getByText("Child B"));

    expect(onSelect).toHaveBeenCalledWith("child-b");
  });

  // The document count is what lets a scan of the tree show which requirements
  // already carry a document, without opening any of them.
  it("marks the nodes that carry documents", () => {
    render(
      <RequirementTree
        nodes={[
          makeNode({ id: "root", title: "Root requirement", documentCount: 2 }),
          makeNode({ id: "child-a", title: "Child A" }),
        ]}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );

    expect(
      screen.getByTitle("requirements:tree.documents").textContent,
    ).toContain("2");
    // A node with no documents shows no badge at all.
    expect(screen.getAllByTitle("requirements:tree.documents")).toHaveLength(1);
  });
});
