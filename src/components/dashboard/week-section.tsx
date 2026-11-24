import { useAllotly } from "@/state/allotly-store";
import { fmt, num } from "@/lib/format";
import { DAYS, FLOOR, isLogged, outcomeKind } from "@/lib/week";
import { Legend, NudgeButtons, SectionTitle, kindBadge, kindRow } from "@/components/brand";
import { cn } from "@/lib/utils";

type Row =
  | { type: "logged"; d: string; target: number; food: number; burn: number; net: number; kind: "over" | "met" | "under"; result: string }
  | { type: "upcoming"; d: string; budget: number; low: boolean; tag: string }
  | { type: "empty"; d: string; target: number };

function useWeekRows(): Row[] {
  const { logs, calc, plan } = useAllotly();
  return DAYS.map((d): Row => {
    if (isLogged(logs[d])) {
      const food = num(logs[d].food);
      const burn = num(logs[d].burn);
      const net = food - burn;
      const target = calc.targetFor(d);
      const kind = outcomeKind(net, target);
      const result = kind === "over" ? `Over ${fmt(net - target)}` : kind === "under" ? `Under ${fmt(target - net)}` : "On target";
      return { type: "logged", d, target, food, burn, net, kind, result };
    }
    const budget = calc.budgets[d];
    if (budget !== undefined) {
      const sh = calc.shiftShown[d] || 0;
      const low = budget < FLOOR;
      const tag = low
        ? `below ${fmt(FLOOR)}`
        : Math.abs(sh) >= 1 ? `${sh > 0 ? "+" : "−"}${fmt(Math.abs(sh))}`
        : plan?.day === d ? "big day"
        : plan?.others[d] !== undefined ? "held" : "";
      return { type: "upcoming", d, budget, low, tag };
    }
    return { type: "empty", d, target: calc.targetFor(d) };
  });
}

function weekLeft(remaining: number) {
  return remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(-remaining)} over`;
}

export function WeekSection({ variant }: { variant: "desktop" | "mobile" }) {
  return variant === "mobile" ? <WeekMobile /> : <WeekDesktop />;
}

function EvenOut() {
  const { hasShifts, evenOut } = useAllotly();
  if (!hasShifts) return null;
  return (
    <button type="button" onClick={evenOut} className="bg-brand min-h-11 self-start rounded-[10px] border-none px-4 text-[13px] font-semibold text-white">
      Even out upcoming days
    </button>
  );
}

function WeekDesktop() {
  const { calc, nudge } = useAllotly();
  const rows = useWeekRows();
  const th = "px-3 text-right text-xs font-semibold text-[#64748b] first:text-left";
  const td = "px-3 py-[11px] text-right text-sm text-[#0f172a] first:rounded-l-lg first:text-left first:font-bold last:rounded-r-lg";
  return (
    <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Week at a glance</SectionTitle>
        <Legend />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-separate border-spacing-x-0 border-spacing-y-1.5">
          <thead>
            <tr>
              {["Day", "Target", "Food", "Exercise", "Net", "Result"].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              if (r.type === "logged") {
                return (
                  <tr key={r.d} className={kindRow[r.kind]}>
                    <td className={td}>{r.d}</td>
                    <td className={td}>{fmt(r.target)}</td>
                    <td className={td}>{fmt(r.food)}</td>
                    <td className={td}>{fmt(r.burn)}</td>
                    <td className={cn(td, "font-bold")}>{fmt(r.net)}</td>
                    <td className={td}><span className={cn("rounded-full px-2.5 py-[3px] text-xs", kindBadge[r.kind])}>{r.result}</span></td>
                  </tr>
                );
              }
              if (r.type === "upcoming") {
                const accent = r.low ? "text-[#c2410c]" : "text-[#475569]";
                return (
                  <tr key={r.d} className={cn("rounded-lg outline-[1.5px] -outline-offset-1 outline-dashed", r.low ? "outline-[#f97316]" : "outline-[#cbd5e1]")}>
                    <td className={td}>{r.d}</td>
                    <td colSpan={3} className={cn(td, "text-[13px]", accent)}>upcoming{r.tag ? ` · ${r.tag}` : ""}</td>
                    <td className={cn(td, "font-extrabold", r.low && "text-[#c2410c]")}>{fmt(r.budget)}</td>
                    <td className={td}><NudgeButtons day={r.d} onNudge={nudge} size="sm" /></td>
                  </tr>
                );
              }
              return (
                <tr key={r.d} className="bg-[#f8fafc]">
                  <td className={td}>{r.d}</td>
                  <td className={td}>{fmt(r.target)}</td>
                  <td className={cn(td, "text-[#94a3b8]")}>–</td>
                  <td className={cn(td, "text-[#94a3b8]")}>–</td>
                  <td className={cn(td, "text-[#94a3b8]")}>–</td>
                  <td className={cn(td, "text-xs text-[#64748b]")}>Not logged</td>
                </tr>
              );
            })}
            <tr className="bg-ink">
              <td className={cn(td, "text-white")}>Week</td>
              <td className={cn(td, "text-[#cbd5e1]")}>{fmt(calc.weekly)}</td>
              <td className={cn(td, "text-white")}>{fmt(calc.totalFood)}</td>
              <td className={cn(td, "text-white")}>{fmt(calc.totalBurn)}</td>
              <td className={cn(td, "font-extrabold text-white")}>{fmt(calc.totalNet)}</td>
              <td className={cn(td, "text-[13px] text-[#cbd5e1]")}>{weekLeft(calc.remaining)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-col gap-3">
        <p className="m-0 text-xs leading-normal text-[#64748b]">
          Dashed rows are upcoming days sharing what's left. Use − / + to move 100 calories; the other upcoming days balance it out. Within 100 counts as on target.
        </p>
        <EvenOut />
      </div>
    </div>
  );
}

function WeekMobile() {
  const { calc, nudge } = useAllotly();
  const rows = useWeekRows();
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex h-11 items-center justify-between">
        <SectionTitle as="h1">This week</SectionTitle>
        <div className="text-[13px] text-[#475569]">
          {calc.remaining >= 0 ? `${fmt(calc.remaining)} of ${fmt(calc.weekly)} left` : `${fmt(-calc.remaining)} over ${fmt(calc.weekly)}`}
        </div>
      </div>
      <Legend size="sm" />
      <div className="flex flex-col gap-1.5 rounded-2xl border border-[#e5e7eb] bg-white p-2">
        {rows.map((r) => {
          if (r.type === "logged") {
            return (
              <div key={r.d} className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-[10px] px-3 py-2.5", kindRow[r.kind])}>
                <div>
                  <div className="text-sm font-bold">{r.d}</div>
                  <div className="text-[11px] text-[#475569]">{fmt(r.food)} food · {fmt(r.burn)} exercise</div>
                </div>
                <div className="text-[15px] font-bold">{fmt(r.net)}</div>
                <span className={cn("rounded-full px-2 py-[3px] text-[11px]", kindBadge[r.kind])}>{r.result}</span>
              </div>
            );
          }
          if (r.type === "upcoming") {
            return (
              <div key={r.d} className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed px-3 py-2", r.low ? "border-[#f97316]" : "border-[#cbd5e1]")}>
                <div>
                  <div className="text-sm font-bold">{r.d}</div>
                  <div className={cn("text-[11px]", r.low ? "text-[#c2410c]" : "text-[#475569]")}>upcoming{r.tag ? ` · ${r.tag}` : ""}</div>
                </div>
                <div className={cn("text-[15px] font-extrabold", r.low && "text-[#c2410c]")}>{fmt(r.budget)}</div>
                <NudgeButtons day={r.d} onNudge={nudge} size="touch" />
              </div>
            );
          }
          return (
            <div key={r.d} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[10px] bg-[#f8fafc] px-3 py-2.5">
              <div>
                <div className="text-sm font-bold">{r.d}</div>
                <div className="text-[11px] text-[#64748b]">Not logged · target {fmt(r.target)}</div>
              </div>
              <div className="text-[15px] font-bold text-[#94a3b8]">–</div>
            </div>
          );
        })}
        <div className="bg-ink flex items-center justify-between rounded-[10px] p-3 text-white">
          <span className="font-bold">Week net</span>
          <span><b>{fmt(calc.totalNet)}</b> <span className="text-[13px] text-[#cbd5e1]">of {fmt(calc.weekly)}</span></span>
        </div>
      </div>
      <p className="m-0 text-[11px] leading-normal text-[#64748b]">
        Dashed days share what's left. − / + moves 100 calories; the other upcoming days balance it out.
      </p>
      <EvenOut />
    </div>
  );
}
