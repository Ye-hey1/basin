import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RequirementPriorityIcon } from "@/components/requirement/requirement-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { RequirementTreeNode } from "@/types/requirement";

type RequirementTreeProps = {
  nodes: RequirementTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Recursive requirement tree. Expansion state lives here rather than in the
 * server data, so re-fetching after a mutation keeps whatever the user had
 * opened.
 */
export default function RequirementTree({
  nodes,
  selectedId,
  onSelect,
}: RequirementTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <RequirementTreeItem
          key={node.id}
          node={node}
          collapsed={collapsed}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

type RequirementTreeItemProps = {
  node: RequirementTreeNode;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function RequirementTreeItem({
  node,
  collapsed,
  onToggle,
  selectedId,
  onSelect,
}: RequirementTreeItemProps) {
  const { t } = useTranslation();
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsed.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-0.5 rounded-md pe-2 transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50",
        )}
      >
        {hasChildren ? (
          <Button
            aria-label={
              isCollapsed
                ? t("requirements:tree.expand")
                : t("requirements:tree.collapse")
            }
            className="shrink-0 text-muted-foreground"
            onClick={() => onToggle(node.id)}
            size="icon-xs"
            variant="ghost"
          >
            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
          </Button>
        ) : (
          <span aria-hidden="true" className="size-7 shrink-0 sm:size-6" />
        )}

        <button
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1.5 text-left outline-none"
          onClick={() => onSelect(node.id)}
          type="button"
        >
          <RequirementPriorityIcon
            className="size-3.5 shrink-0"
            priority={node.priority}
          />
          <span className="truncate text-sm">{node.title}</span>
          {node.documentCount > 0 ? (
            <span
              className="flex shrink-0 items-center gap-0.5 text-muted-foreground text-xs tabular-nums"
              title={t("requirements:tree.documents")}
            >
              <FileText className="size-3" />
              {node.documentCount}
            </span>
          ) : null}
          {hasChildren ? (
            <span className="ms-auto shrink-0 text-muted-foreground text-xs tabular-nums">
              {node.children.length}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && !isCollapsed ? (
        <ul className="ms-3.5 flex flex-col gap-0.5 border-border border-s ps-1">
          {node.children.map((child) => (
            <RequirementTreeItem
              key={child.id}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
