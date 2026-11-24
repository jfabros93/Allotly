import { useState } from "react";
import { User } from "lucide-react";
import { MobileTabBar, type MobileTab } from "@/components/mobile-tab-bar";
import { DetailsSheet } from "@/components/details-sheet";
import { SyncDot } from "@/components/brand";
import { Hero } from "@/components/dashboard/hero";
import { Notices, StatTiles } from "@/components/dashboard/stat-tiles";
import { LoggingSection } from "@/components/dashboard/logging-section";
import { WeekSection } from "@/components/dashboard/week-section";
import { WeighIns } from "@/components/dashboard/weigh-ins";
import { PlanBigDay } from "@/components/dashboard/plan-big-day";
import { useAllotly } from "@/state/allotly-store";
import { cn } from "@/lib/utils";

/** Phone layout: one screen per tab, bottom tab bar. */
export function MobileTabs() {
  const { syncStatus } = useAllotly();
  const [tab, setTab] = useState<MobileTab>("today");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const change = (t: MobileTab) => { setTab(t); window.scrollTo({ top: 0 }); };

  return (
    <div className="min-h-dvh bg-[#f6f7fb] text-[#0f172a]">
      <div className={cn("flex flex-col gap-3.5 px-4 pt-4", tab === "plan" ? "pb-[200px]" : "pb-[110px]")}>
        {tab === "today" && (
          <>
            <div className="flex h-11 items-center justify-between">
              <div className="text-lg font-extrabold">Allotly</div>
              <div className="flex items-center gap-2.5">
                <SyncDot status={syncStatus} className="text-xs" />
                <button
                  type="button"
                  aria-label="Your details"
                  onClick={() => setDetailsOpen(true)}
                  className="flex size-11 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#0f172a]"
                >
                  <User className="size-[18px]" />
                </button>
              </div>
            </div>
            <Hero variant="mobile" />
            <StatTiles variant="mobile" />
            <Notices />
            <LoggingSection variant="mobile" />
          </>
        )}
        {tab === "week" && <WeekSection variant="mobile" />}
        {tab === "plan" && <PlanBigDay variant="mobile" />}
        {tab === "weight" && <WeighIns variant="mobile" />}
      </div>
      <MobileTabBar tab={tab} onChange={change} />
      <DetailsSheet open={detailsOpen} onOpenChange={setDetailsOpen} side="bottom" />
    </div>
  );
}
