import type { ComponentProps } from "react";
import { CalendarDays, ChevronsUpDown, Flag, LayoutDashboard, MessageCircle, Plus, TrendingUp, type LucideIcon } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { useAllotly } from "@/state/allotly-store";
import { weekOfLabel } from "@/lib/format";
import { goalLabel } from "@/components/details-sheet";

export type NavKey = "dashboard" | "log" | "week" | "weigh-ins" | "plan";

export const NAV: { group: "Track" | "Plan"; key: NavKey | "coach"; title: string; icon: LucideIcon }[] = [
  { group: "Track", key: "dashboard", title: "Dashboard", icon: LayoutDashboard },
  { group: "Track", key: "log", title: "Log a day", icon: Plus },
  { group: "Track", key: "week", title: "Week at a glance", icon: CalendarDays },
  { group: "Track", key: "weigh-ins", title: "Weigh-ins", icon: TrendingUp },
  { group: "Plan", key: "plan", title: "Plan a big day", icon: Flag },
  { group: "Plan", key: "coach", title: "Coach", icon: MessageCircle },
];

type Props = ComponentProps<typeof Sidebar> & {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onOpenDetails: () => void;
};

/** shadcn sidebar-07: collapses to icons. */
export function AppSidebar({ active, onNavigate, onOpenDetails, ...props }: Props) {
  const { settings } = useAllotly();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => onNavigate("dashboard")} tooltip="Allotly">
              <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-[15px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                A
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-bold text-[#0f172a]">Allotly</span>
                <span className="truncate text-xs text-[#64748b]">{weekOfLabel()}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {(["Track", "Plan"] as const).map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel className="text-[#64748b]">{group}</SidebarGroupLabel>
            <SidebarMenu>
              {NAV.filter((n) => n.group === group).map((n) => {
                const soon = n.key === "coach";
                return (
                  <SidebarMenuItem key={n.key}>
                    <SidebarMenuButton
                      tooltip={soon ? "Coach · coming soon" : n.title}
                      isActive={active === n.key}
                      disabled={soon}
                      aria-disabled={soon}
                      onClick={() => !soon && onNavigate(n.key as NavKey)}
                      className="data-[active=true]:font-semibold"
                    >
                      <n.icon />
                      <span>{n.title}</span>
                    </SidebarMenuButton>
                    {soon && (
                      <SidebarMenuBadge className="rounded-full bg-[#ede9fe] px-2 text-[11px] font-semibold text-[#6d28d9]">Soon</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={onOpenDetails} tooltip="Your details">
              <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-[#e2e8f0] text-[13px] font-bold text-[#0f172a]">J</span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold text-[#0f172a]">Your details</span>
                <span className="truncate text-xs text-[#64748b]">{settings.weight} lbs · {goalLabel(settings.goal)}</span>
              </span>
              <ChevronsUpDown className="ml-auto text-[#64748b]" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
