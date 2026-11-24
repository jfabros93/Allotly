import { useState } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, NAV, type NavKey } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DetailsSheet } from "@/components/details-sheet";
import { Hero } from "@/components/dashboard/hero";
import { Notices, StatTiles } from "@/components/dashboard/stat-tiles";
import { LoggingSection } from "@/components/dashboard/logging-section";
import { WeekSection } from "@/components/dashboard/week-section";
import { WeighIns } from "@/components/dashboard/weigh-ins";
import { PlanBigDay } from "@/components/dashboard/plan-big-day";

/** Desktop: sidebar-07 shell + 12-column grid inside a 1280px max width. */
export function DesktopDashboard() {
  const [active, setActive] = useState<NavKey>("dashboard");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const navigate = (key: NavKey) => {
    setActive(key);
    if (key === "dashboard") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const page = NAV.find((n) => n.key === active)?.title ?? "Dashboard";

  return (
    <SidebarProvider>
      <AppSidebar active={active} onNavigate={navigate} onOpenDetails={() => setDetailsOpen(true)} />
      <SidebarInset className="min-w-0 bg-[#f6f7fb]">
        <SiteHeader page={page} onHome={() => navigate("dashboard")} />
        <main className="mx-auto grid w-full max-w-[1280px] grid-cols-12 gap-6 p-6">
          <section className="col-span-12 flex min-w-0 flex-col gap-5 xl:col-span-5">
            <Hero variant="desktop" />
            <StatTiles variant="desktop" />
            <Notices />
            <div id="section-log" className="scroll-mt-20">
              <LoggingSection variant="desktop" />
            </div>
          </section>
          <section className="col-span-12 flex min-w-0 flex-col gap-5 xl:col-span-7">
            <div id="section-week" className="scroll-mt-20"><WeekSection variant="desktop" /></div>
            <div id="section-weigh-ins" className="scroll-mt-20"><WeighIns variant="desktop" /></div>
          </section>
          <div id="section-plan" className="col-span-12 min-w-0 scroll-mt-20">
            <PlanBigDay variant="desktop" />
          </div>
        </main>
      </SidebarInset>
      <DetailsSheet open={detailsOpen} onOpenChange={setDetailsOpen} />
    </SidebarProvider>
  );
}
