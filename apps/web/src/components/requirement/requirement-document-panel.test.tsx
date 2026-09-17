import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequirementDocumentPanel from "./requirement-document-panel";

const mocks = vi.hoisted(() => ({
  document: vi.fn(),
  pastVersion: vi.fn(),
  save: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastMessage: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // Only the version badge interpolates, so a history row reads `v2` while
    // every other assertion can match the key itself.
    t: (key: string, options?: Record<string, unknown>) =>
      key.endsWith("versionBadge") && options ? `v${options.version}` : key,
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
// The editor is a tiptap instance; the panel only cares that it reports what
vi.mock("@/components/requirement/requirement-document-editor", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (next: string) => void;
  }) => (
    <textarea
      aria-label="editor"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    />
  ),
}));

vi.mock("@/components/public-project/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

vi.mock("@/hooks/queries/requirement/use-requirement-document", () => ({
  default: () => mocks.document(),
}));
vi.mock("@/hooks/queries/requirement/use-requirement-document-version", () => ({
  default: () => mocks.pastVersion(),
}));
vi.mock(
  "@/hooks/mutations/requirement/use-save-requirement-document-content",
  () => ({
    useSaveRequirementDocumentContent: () => ({
      mutateAsync: mocks.save,
      isPending: false,
    }),
  }),
);
vi.mock(
  "@/hooks/mutations/requirement/use-update-requirement-document",
  () => ({
    useUpdateRequirementDocument: () => ({
      mutate: mocks.rename,
      isPending: false,
    }),
  }),
);
vi.mock(
  "@/hooks/mutations/requirement/use-delete-requirement-document",
  () => ({
    useDeleteRequirementDocument: () => ({
      mutate: mocks.remove,
      isPending: false,
    }),
  }),
);
vi.mock("@/lib/toast", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    message: mocks.toastMessage,
  },
}));

const documentDetail = {
  id: "doc-1",
  requirementId: "req-1",
  title: "Product requirements",
  position: 0,
  currentVersion: 3,
  versionCount: 3,
  createdBy: "user-1",
  createdByName: "Ada",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-02T00:00:00.000Z",
  content: "current text",
  versions: [
    {
      version: 3,
      createdBy: "user-1",
      createdByName: "Ada",
      createdAt: "2026-02-02T00:00:00.000Z",
    },
    {
      version: 2,
      createdBy: "user-2",
      createdByName: "Grace",
      createdAt: "2026-01-20T00:00:00.000Z",
    },
    {
      version: 1,
      createdBy: "user-1",
      createdByName: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

function renderPanel() {
  return render(
    <RequirementDocumentPanel
      canEdit
      documentId="doc-1"
      onDeleted={vi.fn()}
      workspaceId="ws-1"
    />,
  );
}

beforeEach(() => {
  mocks.document.mockReturnValue({
    data: documentDetail,
    isLoading: false,
  });
  mocks.pastVersion.mockReturnValue({
    data: {
      documentId: "doc-1",
      version: 2,
      content: "older text",
      createdBy: "user-2",
      createdByName: "Grace",
      createdAt: "2026-01-20T00:00:00.000Z",
    },
    isLoading: false,
  });
  mocks.save.mockResolvedValue({
    document: { ...documentDetail, currentVersion: 4 },
    changed: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RequirementDocumentPanel", () => {
  it("shows the current version and its text", () => {
    renderPanel();

    expect(screen.getByText("Product requirements")).toBeDefined();
    expect(screen.getByTestId("markdown").textContent).toBe("current text");
  });

  it("lists the history and marks which version is current", () => {
    renderPanel();

    fireEvent.click(screen.getByText("requirements:documents.history"));

    expect(screen.getByText("requirements:documents.current")).toBeDefined();
    // One row per version.
    expect(screen.getAllByText(/^v\d$/).length).toBeGreaterThanOrEqual(3);
  });

  // Reading history must not edit anything, so a past version is shown with its
  // own text and a way back.
  it("opens a past version instead of the current text", () => {
    renderPanel();

    fireEvent.click(screen.getByText("requirements:documents.history"));
    fireEvent.click(screen.getByText("v2"));

    expect(
      screen.getByText("requirements:documents.viewingPastVersion"),
    ).toBeDefined();
    expect(screen.getByTestId("markdown").textContent).toBe("older text");
  });

  // Restoring is a save, so the restored text becomes a new version rather than
  // overwriting the one it came from.
  it("restores a past version by saving its text again", async () => {
    renderPanel();

    fireEvent.click(screen.getByText("requirements:documents.history"));
    fireEvent.click(screen.getByText("v2"));
    fireEvent.click(screen.getByText("requirements:documents.restore"));

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        documentId: "doc-1",
        workspaceId: "ws-1",
        content: "older text",
      }),
    );
  });

  it("reports a save that stored no new version", async () => {
    mocks.save.mockResolvedValue({
      document: documentDetail,
      changed: false,
    });

    renderPanel();

    fireEvent.click(screen.getByText("requirements:actions.edit"));
    fireEvent.click(screen.getByText("requirements:actions.save"));

    await waitFor(() =>
      expect(mocks.toastMessage).toHaveBeenCalledWith(
        "requirements:documents.noChanges",
      ),
    );
  });

  it("saves an edit as a new version and reports which one", async () => {
    renderPanel();

    fireEvent.click(screen.getByText("requirements:actions.edit"));
    fireEvent.change(screen.getByLabelText("editor"), {
      target: { value: "revised text" },
    });
    fireEvent.click(screen.getByText("requirements:actions.save"));

    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        documentId: "doc-1",
        workspaceId: "ws-1",
        content: "revised text",
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "requirements:documents.savedAsVersion",
    );
  });

  it("only deletes after the confirmation", () => {
    renderPanel();

    // The delete button carries only an icon, so it is found by its variant.
    const deleteButton = document.querySelector(
      '[data-slot="button"][class*="destructive"]',
    );
    expect(deleteButton).not.toBeNull();
    fireEvent.click(deleteButton as Element);

    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("requirements:documents.deleteConfirm"));

    expect(mocks.remove).toHaveBeenCalledWith(
      { documentId: "doc-1", workspaceId: "ws-1" },
      expect.anything(),
    );
  });
});
