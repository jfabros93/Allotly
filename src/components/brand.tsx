import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DAYS, type DayKind } from "@/lib/week";
import type { SyncStatus } from "@/state/allotly-store";

/** Heading with the purple→blue accent bar used across the canvas. */
export function SectionTitle({ children, as: Tag = "h2", className }: { children: ReactNode; as?: "h1" | "h2"; className?: string }) {
  return (
    <div>
      <Tag className={cn("m-0 font-bold", Tag === "h1" ? "text-[22px] font-extrabold" : "text-xl", className)}>{children}</Tag>
      <div className="accent-bar" />
    </div>
  );
}

export function SyncDot({ status, className }: { status: SyncStatus; className?: string }) {
  const color = status === "saved" ? "bg-[#16a34a]" : status === "syncing" ? "bg-[#2563eb] animate-pulse" : "bg-[#94a3b8]";
  const label = status === "saved" ? "Saved" : status === "syncing" ? "Syncing…" : "Offline";
  return (
    <div className={cn("flex items-center gap-1.5 text-[#475569]", className)} role="status">
      <span className={cn("inline-block size-2 rounded-full", color)} />
      {label}
    </div>
  );
}

export function Legend({ size = "md" }: { size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-[9px] py-[3px]" : "px-2.5 py-1";
  return (
    <div className={cn("flex gap-1.5", size === "sm" ? "text-[11px]" : "text-xs gap-2")}>
      <span className={cn("rounded-full bg-[#fee2e2] text-[#b91c1c]", pad)}>Over</span>
      <span className={cn("rounded-full bg-[#dcfce7] text-[#15803d]", pad)}>On target</span>
      <span className={cn("rounded-full bg-[#dbeafe] text-[#1d4ed8]", pad)}>Under</span>
    </div>
  );
}

export const kindBadge: Record<DayKind, string> = {
  over: "bg-[#fee2e2] text-[#b91c1c]",
  met: "bg-[#dcfce7] text-[#15803d]",
  under: "bg-[#dbeafe] text-[#1d4ed8]",
};
export const kindRow: Record<DayKind, string> = {
  over: "bg-[#fef2f2]",
  met: "bg-[#f0fdf4]",
  under: "bg-[#eff6ff]",
};

/** 7 equal day pills. Selected = brand gradient. */
export function DayPills({
  value, onChange, enabled, size = "md", muted = "bg-[#f1f5f9]", label,
}: {
  value: string;
  onChange: (d: string) => void;
  enabled?: (d: string) => boolean;
  size?: "md" | "touch";
  muted?: string;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-7", size === "touch" ? "gap-1" : "gap-1.5")}>
      {DAYS.map((d) => {
        const on = d === value;
        const ok = enabled ? enabled(d) : true;
        return (
          <button
            key={d}
            type="button"
            disabled={!ok}
            aria-pressed={on}
            onClick={() => onChange(d)}
            className={cn(
              "rounded-[10px] border-none p-0",
              size === "touch" ? "min-h-11 text-xs" : "min-h-10 text-[13px]",
              on ? "bg-brand font-semibold text-white" : cn(muted, "text-[#334155]"),
              !ok && "opacity-40",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

/** −/+ buttons that move 100 calories on an upcoming day. */
export function NudgeButtons({ day, onNudge, size }: { day: string; onNudge: (d: string, delta: number) => void; size: "sm" | "touch" }) {
  const cls = cn(
    "rounded-lg border-none bg-ink text-white",
    size === "touch" ? "size-11 rounded-[10px] text-lg" : "size-8 text-base",
  );
  return (
    <div className="inline-flex gap-1.5">
      <button type="button" aria-label={`Move 100 calories off ${day}`} className={cls} onClick={() => onNudge(day, -100)}>−</button>
      <button type="button" aria-label={`Add 100 calories to ${day}`} className={cls} onClick={() => onNudge(day, 100)}>+</button>
    </div>
  );
}

export const inputCls =
  "font-[inherit] text-base text-[#0f172a] px-3 py-2.5 border border-[#cbd5e1] rounded-[10px] min-w-0 bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40";
