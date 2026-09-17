import {
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  CircleAlert,
  Minus,
} from "lucide-react";
import type { Badge } from "@/components/ui/badge";
import type {
  RequirementPriority,
  RequirementStatus,
} from "@/types/requirement";

type BadgeVariant = NonNullable<React.ComponentProps<typeof Badge>["variant"]>;

/**
 * Requirement priorities are P0–P4 rather than the four task levels, so they get
 * their own icon mapping while reusing the same icon vocabulary and accent
 * colours as task priority in the rest of Kaneo.
 */
export function RequirementPriorityIcon({
  priority,
  className = "size-3.5",
}: {
  priority: RequirementPriority;
  className?: string;
}) {
  switch (priority) {
    case "P0":
      return (
        <CircleAlert className={`${className} text-destructive-foreground`} />
      );
    case "P1":
      return <ChevronsUp className={`${className} text-warning-foreground`} />;
    case "P2":
      return (
        <ChevronUp className={`${className} text-warning-foreground/80`} />
      );
    case "P3":
      return <ChevronDown className={`${className} text-info-foreground/85`} />;
    default:
      return <Minus className={`${className} text-muted-foreground`} />;
  }
}

/**
 * Status is carried by colour as well as text, so a scan of the tree or the
 * detail header reads without parsing Chinese or English labels.
 */
export function requirementStatusVariant(
  status: RequirementStatus,
): BadgeVariant {
  switch (status) {
    case "pending_review":
      return "warning";
    case "reviewed":
      return "info";
    case "in_development":
      return "secondary";
    default:
      return "success";
  }
}

export function acceptanceStatusVariant(
  status: "pending" | "passed" | "failed",
): BadgeVariant {
  switch (status) {
    case "passed":
      return "success";
    case "failed":
      return "error";
    default:
      return "outline";
  }
}
