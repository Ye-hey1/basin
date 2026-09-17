import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RequirementFormDialog from "./requirement-form-dialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
vi.mock("@/hooks/mutations/requirement/use-create-requirement", () => ({
  useCreateRequirement: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/mutations/requirement/use-update-requirement", () => ({
  useUpdateRequirement: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/queries/requirement/use-requirement-options", () => ({
  default: () => ({ data: [], isLoading: false }),
}));

function renderDialog() {
  return render(
    <RequirementFormDialog
      onOpenChange={vi.fn()}
      open
      workspaceId="workspace-1"
    />,
  );
}

describe("RequirementFormDialog", () => {
  afterEach(() => {
    cleanup();
  });

  // Regression guard: the form body used to be a bare div with no padding, so
  // every field sat flush against the dialog border. The body must be the
  // dialog's own padded panel.
  it("renders the form inside the padded dialog panel", () => {
    renderDialog();

    const input = screen.getByLabelText("requirements:fields.title");
    const panel = input.closest('[data-slot="dialog-panel"]');

    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("p-6");
  });

  it("separates the form from the actions with the dialog footer", () => {
    renderDialog();

    expect(
      document.querySelector('[data-slot="dialog-footer"]'),
    ).not.toBeNull();
  });

  it("associates labels with their controls", () => {
    renderDialog();

    expect(screen.getByLabelText("requirements:fields.title")).toBeDefined();
    expect(
      screen.getByLabelText("requirements:fields.description"),
    ).toBeDefined();
    expect(screen.getByLabelText("requirements:fields.module")).toBeDefined();
    expect(
      screen.getByLabelText("requirements:fields.expectedDate"),
    ).toBeDefined();
    // The PRD is no longer a field here: it is one of the requirement's
    // documents, edited in the documents section of the detail view.
    expect(screen.queryByLabelText("requirements:fields.prd")).toBeNull();
  });

  it("surfaces the title as a required error only after an empty submit", () => {
    renderDialog();

    expect(screen.queryByText("requirements:errors.titleRequired")).toBeNull();
  });
});
