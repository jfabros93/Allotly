import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SyncDot } from "@/components/brand";
import { useAllotly } from "@/state/allotly-store";

export function SiteHeader({ page, onHome }: { page: string; onHome: () => void }) {
  const { syncStatus, startNewWeek } = useAllotly();
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-[#e5e7eb] bg-white px-6">
      <SidebarTrigger className="-ml-2 size-9" aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
      <Breadcrumb>
        <BreadcrumbList className="text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); onHome(); }} className="text-[#64748b] no-underline">Allotly</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-[#0f172a]">{page}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-4">
        <SyncDot status={syncStatus} className="text-[13px]" />
        <button type="button" onClick={startNewWeek} className="min-h-9 rounded-lg border-none bg-[#0f172a] px-3.5 text-sm font-semibold text-white">
          Start a new week
        </button>
      </div>
    </header>
  );
}
