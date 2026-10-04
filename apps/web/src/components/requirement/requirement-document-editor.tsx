import { useTranslation } from "react-i18next";
import CommentEditor from "@/components/activity/comment-editor";

type RequirementDocumentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * The Markdown editor for a requirement document.
 *
 * It deliberately passes no `taskId`: a document belongs to a requirement, not
 * to a task, and the editor only offers file uploads when it has a task to
 * attach them to. Faking one would file requirement screenshots under an
 * unrelated task.
 */
export default function RequirementDocumentEditor({
  value,
  onChange,
  placeholder,
}: RequirementDocumentEditorProps) {
  const { t } = useTranslation();

  return (
    <CommentEditor
      onChange={onChange}
      placeholder={placeholder ?? t("requirements:documents.editorPlaceholder")}
      uploadSurface="description"
      value={value}
      className="[&_.basin-comment-editor-content_.ProseMirror]:min-h-[22rem] [&_.basin-comment-editor-content_.ProseMirror]:max-h-none [&_.basin-comment-editor-content_.ProseMirror]:overflow-visible [&_.basin-comment-editor-content_.ProseMirror]:px-0 [&_.basin-comment-editor-content_.ProseMirror]:pt-1 [&_.basin-comment-editor-content_.ProseMirror]:pb-2"
    />
  );
}
