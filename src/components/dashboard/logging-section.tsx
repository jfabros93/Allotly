import { useState } from "react";
import { useAllotly } from "@/state/allotly-store";
import { fmt, num } from "@/lib/format";
import { dayNet } from "@/lib/week";
import { DayPills, inputCls } from "@/components/brand";
import { cn } from "@/lib/utils";

const FOOD = [
  { label: "Vietnamese coffee", short: "Viet. coffee", cals: 250 },
  { label: "Meal", short: "Meal", cals: 600 },
  { label: "Snack", short: "Snack", cals: 200 },
];
const EXERCISE = [
  { label: "Lunch walk", cals: 150 },
  { label: "Gym", cals: 250 },
];

/** Phase 1 logging card (Main / Mobile-Today artboards). Phase 3 replaces this with the prompt input. */
export function LoggingSection({ variant }: { variant: "desktop" | "mobile" }) {
  const { day, setDay, logs, setLog, addTo, clearDay, startNewWeek, calc, calPerMile } = useAllotly();
  const [miles, setMiles] = useState("");
  const mobile = variant === "mobile";
  const net = dayNet(logs, day);
  const addRun = () => {
    if (num(miles) <= 0) return;
    addTo("burn", Math.round(num(miles) * calPerMile));
    setMiles("");
  };
  const chip = cn(
    "rounded-full border border-[#e2e8f0] bg-[#f8fafc] text-[13px] text-[#0f172a]",
    mobile ? "min-h-11 px-3" : "px-3 py-2",
  );

  return (
    <div className={cn("bg-logging text-[#0f172a]", mobile ? "rounded-[18px] p-3.5" : "rounded-[20px] p-5")}>
      <div className={cn("flex items-end justify-between", mobile ? "px-1 pt-0.5 pb-3" : "px-1 pt-1 pb-3.5")}>
        <div>
          <div className={cn("font-semibold tracking-[0.08em] text-[#334155]", mobile ? "text-[11px]" : "text-xs")}>LOGGING</div>
          <div className={cn("font-extrabold", mobile ? "text-2xl" : "text-[28px]")}>{day}</div>
        </div>
        <div className={cn("text-[#334155]", mobile ? "text-xs" : "text-[13px]")}>
          {fmt(net)} net{mobile ? "" : ` · target ${fmt(calc.targetFor(day))}`}
        </div>
      </div>

      <div className={cn("flex flex-col rounded-xl bg-white text-[#0f172a]", mobile ? "gap-3 p-3" : "gap-3.5 rounded-[14px] p-4")}>
        <DayPills value={day} onChange={setDay} size={mobile ? "touch" : "md"} label="Day to log" />

        <div className={cn("grid grid-cols-2", mobile ? "gap-2.5" : "gap-3")}>
          <label className={cn("flex flex-col text-xs text-[#475569]", mobile ? "gap-1" : "gap-1.5")}>
            Food eaten
            <input className={cn(inputCls, mobile && "p-2.5")} inputMode="numeric" placeholder="0" value={logs[day].food} onChange={(e) => setLog(day, "food", e.target.value)} />
          </label>
          <label className={cn("flex flex-col text-xs text-[#475569]", mobile ? "gap-1" : "gap-1.5")}>
            Exercise burned
            <input className={cn(inputCls, mobile && "p-2.5")} inputMode="numeric" placeholder="0" value={logs[day].burn} onChange={(e) => setLog(day, "burn", e.target.value)} />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-[#475569]">Quick add food</div>
          <div className="flex flex-wrap gap-2">
            {FOOD.map((f) => (
              <button key={f.label} type="button" className={chip} onClick={() => addTo("food", f.cals)}>
                + {mobile ? f.short : f.label} {f.cals}
              </button>
            ))}
          </div>
          <div className={cn("text-xs text-[#475569]", !mobile && "mt-1")}>Quick add exercise</div>
          <div className="flex flex-wrap items-center gap-2">
            {EXERCISE.map((x) => (
              <button key={x.label} type="button" className={chip} onClick={() => addTo("burn", x.cals)}>
                + {x.label} {x.cals}
              </button>
            ))}
            {!mobile && (
              <div className="flex items-center gap-1.5">
                <input
                  aria-label="Miles run"
                  placeholder="Miles"
                  inputMode="decimal"
                  value={miles}
                  onChange={(e) => setMiles(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addRun()}
                  className="w-16 rounded-full border border-[#cbd5e1] px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40"
                />
                <button type="button" onClick={addRun} className="bg-brand rounded-full border-none px-3 py-2 text-[13px] font-semibold text-white">
                  + Run
                </button>
              </div>
            )}
          </div>
          {!mobile && <div className="text-xs text-[#64748b]">Runs count about {fmt(calPerMile)} calories per mile at your current weight.</div>}
        </div>

        {mobile && (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-[#475569]">
                Miles run
                <input className={cn(inputCls, "p-2.5")} placeholder="e.g. 1.5" inputMode="decimal" value={miles} onChange={(e) => setMiles(e.target.value)} />
              </label>
              <button type="button" onClick={addRun} className="bg-brand min-h-11 rounded-[10px] border-none px-4 text-sm font-semibold text-white">
                + Add run
              </button>
            </div>
            <div className="text-[11px] text-[#64748b]">About {fmt(calPerMile)} calories per mile at your current weight.</div>
          </>
        )}

        <div className={cn("border-t border-[#e5e7eb]", mobile ? "flex justify-between pt-2.5" : "pt-3")}>
          <button
            type="button"
            onClick={() => clearDay(day)}
            className={cn("rounded-lg border border-[#e2e8f0] bg-white px-3 text-[13px] text-[#b91c1c]", mobile ? "min-h-11" : "py-2")}
          >
            Clear {day}
          </button>
          {mobile && (
            <button type="button" onClick={startNewWeek} className="min-h-11 rounded-lg border border-[#e2e8f0] bg-white px-3 text-[13px] text-[#334155]">
              Start a new week
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
