import CommentEditor from "@/components/activity/comment-editor";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <CommentEditor
      value={content}
      readOnly
      showBubbleMenu={false}
      proseClassName="basin-tiptap-prose"
      contentClassName="basin-tiptap-content"
      className="[&_.basin-tiptap-content_.ProseMirror]:max-h-none [&_.basin-tiptap-content_.ProseMirror]:overflow-visible [&_.basin-tiptap-content_.ProseMirror]:px-0 [&_.basin-tiptap-content_.ProseMirror]:py-0"
    />
  );
}
