import { useNavigate } from "@tanstack/react-router";
import { Bot, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { usePendingInvitations } from "@/hooks/queries/invitation/use-pending-invitations";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

// Compact entry points for everything that is not a conversation or a
// project; icons only, tooltips via title.
export function NavTools() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workspace } = useActiveWorkspace();
  const { data: invitations = [] } = usePendingInvitations();

  if (!workspace) return null;

  const pendingCount = invitations.length;

  return (
    <SidebarGroup className="p-2">
      <SidebarGroupContent>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 justify-start gap-2 px-2 text-sm font-normal text-sidebar-foreground/80"
            title={t("navigation:sidebar.agents")}
            onClick={() => void navigate({ to: "/dashboard/agents" })}
          >
            <Bot className="size-4" />
            {t("navigation:sidebar.agents")}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-sidebar-foreground/70"
            title={t("navigation:sidebar.members")}
            onClick={() =>
              void navigate({
                to: "/dashboard/workspace/$workspaceId/members",
                params: { workspaceId: workspace.id },
              })
            }
          >
            <Users className="size-4" />
          </Button>
        </div>
        {pendingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-between px-2 text-xs font-normal text-sidebar-foreground/70"
            onClick={() => void navigate({ to: "/dashboard/invitations" })}
          >
            {t("navigation:sidebar.invitations")}
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {pendingCount}
            </span>
          </Button>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default NavTools;
