import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequirementDocuments from "./requirement-documents";

const mocks = vi.hoisted(() => ({
  documents: vi.fn(),
  create: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// The panel has its own tests; this file is about the list around it.
vi.mock("@/components/requirement/requirement-document-panel", () => ({
  default: ({
    documentId,
    canEdit,
  }: {
    documentId: string;
    canEdit: boolean;
  }) => (
    <div data-testid="panel">
      {documentId}:{canEdit ? "editable" : "readonly"}
    </div>
  ),
}));

vi.mock("@/hooks/queries/requirement/use-requirement-documents", () => ({
  default: () => mocks.documents(),
}));
vi.mock(
  "@/hooks/mutations/requirement/use-create-requirement-document",
  () => ({
    useCreateRequirementDocument: () => ({
      mutate: mocks.create,
      isPending: false,
    }),
  }),
);
vi.mock("@/lib/toast", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

function makeDocument(id: string, title: string) {
  return {
    id,
    requirementId: "req-1",
    title,
    position: 0,
    currentVersion: 1,
    versionCount: 1,
    createdBy: null,
    createdByName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderSection(canEdit = true) {
  return render(
    <RequirementDocuments
      canEdit={canEdit}
      requirementId="req-1"
      workspaceId="ws-1"
    />,
  );
}

beforeEach(() => {
  mocks.documents.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("RequirementDocuments", () => {
  it("explains the empty state instead of showing a blank section", () => {
    renderSection();

    expect(screen.getByText("requirements:documents.empty")).toBeDefined();
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("hides the create action without requirement:create permission", () => {
    renderSection(false);

    expect(screen.queryByText("requirements:documents.new")).toBeNull();
  });

  // One document needs no switcher; the panel alone is the section.
  it("opens the only document without a switcher", () => {
    mocks.documents.mockReturnValue({
      data: [makeDocument("doc-1", "PRD")],
      isLoading: false,
    });

    renderSection();

    expect(screen.getByTestId("panel").textContent).toBe("doc-1:editable");
    expect(screen.queryByRole("button", { name: "PRD" })).toBeNull();
  });

  it("switches between documents when there is more than one", () => {
    mocks.documents.mockReturnValue({
      data: [makeDocument("doc-1", "PRD"), makeDocument("doc-2", "Notes")],
      isLoading: false,
    });

    renderSection();

    expect(screen.getByTestId("panel").textContent).toBe("doc-1:editable");

    fireEvent.click(screen.getByRole("button", { name: "Notes" }));

    expect(screen.getByTestId("panel").textContent).toBe("doc-2:editable");
  });

  it("creates a document from the dialog and opens it", async () => {
    mocks.create.mockImplementation((_input, options) => {
      options.onSuccess(makeDocument("doc-new", "Integration spec"));
    });
    mocks.documents.mockReturnValue({
      data: [makeDocument("doc-1", "PRD")],
      isLoading: false,
    });

    renderSection();

    fireEvent.click(screen.getByText("requirements:documents.new"));
    fireEvent.change(
      screen.getByLabelText("requirements:documents.titleLabel"),
      {
        target: { value: "Integration spec" },
      },
    );
    fireEvent.click(screen.getByText("requirements:documents.createConfirm"));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          id: "req-1",
          workspaceId: "ws-1",
          title: "Integration spec",
        },
        expect.anything(),
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "requirements:documents.created",
    );
  });

  it("will not submit a blank title", () => {
    renderSection();

    fireEvent.click(screen.getByText("requirements:documents.new"));

    expect(
      screen
        .getByText("requirements:documents.createConfirm")
        .closest("button"),
    ).toBeDisabled();
  });
});
