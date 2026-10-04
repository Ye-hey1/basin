import { useNavigate } from "@tanstack/react-router";
import { SquarePen } from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { NavConversations } from "@/components/nav-conversations";
import { NavProjects } from "@/components/nav-projects";
import { NavTools } from "@/components/nav-tools";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import { TrialCard } from "@/components/trial-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { shortcuts } from "@/constants/shortcuts";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import Search from "./search";

// Agent-client layout: conversations first, projects as entries, tools and
// account at the bottom.
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  useRegisterShortcuts({
    modifierShortcuts: {
      [shortcuts.sidebar.prefix]: {
        [shortcuts.sidebar.toggle]: toggleSidebar,
      },
    },
  });

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none pt-1.5"
      {...props}
    >
      <SidebarHeader className="pt-1 pb-1.5">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden gap-1 py-1">
        <SidebarGroup className="px-2 pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="default"
                  className="h-9 gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-xs hover:bg-accent"
                  onClick={() =>
                    void navigate({
                      to: "/dashboard/assistant",
                      search: {},
                    })
                  }
                >
                  <SquarePen className="size-4" />
                  {t("navigation:sidebar.newChat")}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Search />
        <NavConversations />
        <NavProjects />
      </SidebarContent>
      <SidebarFooter>
        <NavTools />
        <TrialCard />
        <div className="flex items-center justify-between">
          <UserAvatar />
          <ThemeToggleDropdown />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
