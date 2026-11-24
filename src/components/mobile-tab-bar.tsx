import { CalendarDays, Flag, Sun, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "today" | "week" | "plan" | "weight";

const TABS: { key: MobileTab; label: string; icon: LucideIcon }[] = [
  { key: "today", label: "Today", icon: Sun },
  { key: "week", label: "Week", icon: CalendarDays },
  { key: "plan", label: "Plan", icon: Flag },
  { key: "weight", label: "Weight", icon: TrendingUp },
];

export function MobileTabBar({ tab, onChange }: { tab: MobileTab; onChange: (t: MobileTab) => void }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid h-[calc(66px+max(18px,env(safe-area-inset-bottom)))] grid-cols-4 border-t border-[#e5e7eb] bg-white pb-[max(18px,env(safe-area-inset-bottom))]"
    >
      {TABS.map((t) => {
        const on = t.key === tab;
        return (
          <button
            key={t.key}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(t.key)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center gap-1 border-none bg-transparent text-[11px]",
              on ? "font-semibold text-[#2563eb]" : "text-[#64748b]",
            )}
          >
            <t.icon className="size-[22px]" strokeWidth={2} aria-hidden />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
