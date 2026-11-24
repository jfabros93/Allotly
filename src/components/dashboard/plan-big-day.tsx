import { useState } from "react";
import { Check } from "lucide-react";
import { useAllotly } from "@/state/allotly-store";
import { dayRange, fmt, num } from "@/lib/format";
import { DAYS, FLOOR, makeScenarios, planWindow, type Scenario } from "@/lib/week";
import { DayPills, SectionTitle, inputCls } from "@/components/brand";
import { cn } from "@/lib/utils";

const LOOK: Record<Scenario["key"], { header: string; badge: string; number: string }> = {
  trim: { header: "linear-gradient(90deg, #2563eb, #7c3aed)", badge: "#7c3aed", number: "text-[#2563eb]" },
  run: { header: "linear-gradient(90deg, #7c3aed, #db2777)", badge: "#a855f7", number: "text-[#7c3aed]" },
  mix: { header: "linear-gradient(90deg, #db2777, #ea580c)", badge: "#ea580c", number: "text-[#c2410c]" },
};

type Edits = Record<string, { per: Record<string, string>; miles?: string }>;

function usePlanDraft() {
  const { logs, calc, calPerMile, plan, setPlan } = useAllotly();
  const [draftDay, setDraftDay] = useState("Sat");
  const [draftCals, setDraftCals] = useState("2400");
  const [edits, setEdits] = useState<Edits>({});

  const { futureDays, remainingWeek } = planWindow(logs, calc.weekly, calc.todayIdx);
  const bigDay = futureDays.includes(draftDay) ? draftDay : futureDays[futureDays.length - 1];
  const otherDays = futureDays.filter((d) => d !== bigDay);
  const want = num(draftCals);
  const scenarios = makeScenarios(remainingWeek, otherDays.length, want, calPerMile);

  const perVal = (s: Scenario, d: string) => edits[s.key]?.per[d] ?? String(Math.round(s.per));
  const milesVal = (s: Scenario) => edits[s.key]?.miles ?? (s.miles > 0 ? s.miles.toFixed(1) : "0");
  const setPer = (key: string, d: string, v: string) =>
    setEdits((e) => ({ ...e, [key]: { ...(e[key] || { per: {} }), per: { ...(e[key]?.per || {}), [d]: v } } }));
  const setMiles = (key: string, v: string) => setEdits((e) => ({ ...e, [key]: { ...(e[key] || { per: {} }), miles: v } }));
  const reset = (key: string) => setEdits((e) => { const n = { ...e }; delete n[key]; return n; });

  const live = (s: Scenario) => {
    const sumOthers = otherDays.reduce((a, d) => a + num(perVal(s, d)), 0);
    const burn = num(milesVal(s)) * calPerMile;
    const big = remainingWeek - sumOthers + burn;
    const values = otherDays.map((d) => Math.round(num(perVal(s, d))));
    return {
      big, burn, gap: big - want,
      lowDays: otherDays.filter((d) => num(perVal(s, d)) < FLOOR),
      sameValue: values.length > 0 && values.every((v) => v === values[0]) ? values[0] : null,
    };
  };

  const commit = (s: Scenario) => {
    const others: Record<string, number> = {};
    otherDays.forEach((d) => { others[d] = Math.round(num(perVal(s, d))); });
    setPlan({ day: bigDay, cals: want, others, miles: Math.round(num(milesVal(s)) * 10) / 10, label: s.title });
  };
  const inUse = (s: Scenario) => plan !== null && plan.day === bigDay && plan.label === s.title;

  // The first plan that covers the big day gets the highlight (falls back to "run to earn it").
  const highlight = scenarios.find((s) => live(s).gap >= 0)?.key ?? "run";

  return {
    futureDays, bigDay, otherDays, want, draftCals, scenarios, edits, highlight, plan,
    pickDay: (d: string) => { setDraftDay(d); setEdits({}); },
    setCals: (v: string) => { setDraftCals(v); setEdits({}); },
    perVal, milesVal, setPer, setMiles, reset, live, commit, inUse,
    clearPlan: () => setPlan(null),
  };
}

type Draft = ReturnType<typeof usePlanDraft>;

const statusText = (gap: number, want: number) =>
  gap < 0 ? `${fmt(-gap)} short of your ${fmt(want)}` : `Covers your ${fmt(want)}${gap > 0 ? ` with ${fmt(gap)} to spare` : ""}`;

function PerDayInputs({ p, s, touch }: { p: Draft; s: Scenario; touch?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {p.otherDays.map((d) => (
        <label key={d} className="flex flex-col gap-1 text-[11px] text-[#475569]">
          {d}
          <input
            className={cn(inputCls, "rounded-lg px-2 py-[9px] text-[15px]", touch && "min-h-11")}
            inputMode="numeric"
            value={p.perVal(s, d)}
            onChange={(e) => p.setPer(s.key, d, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

function LowDaysNote({ days }: { days: string[] }) {
  if (days.length === 0) return null;
  return <div className="text-xs text-[#b91c1c]">{days.join(", ")} below {fmt(FLOOR)}. That's too low to keep up with work and the twins.</div>;
}

export function PlanBigDay({ variant }: { variant: "desktop" | "mobile" }) {
  const p = usePlanDraft();
  return variant === "mobile" ? <PlanMobile p={p} /> : <PlanDesktop p={p} />;
}

/* ---------- Desktop: 3 plans side by side ---------- */

function PlanDesktop({ p }: { p: Draft }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-[18px] rounded-[20px] border border-[#e5e7eb] bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[560px]">
          <SectionTitle>Plan a big day</SectionTitle>
          <p className="m-0 mt-1.5 text-sm leading-normal text-[#475569]">
            Birthday, party or day out coming up? Pick the day and how much you expect to eat, then compare ways to balance it.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[372px] max-w-full">
            <DayPills value={p.bigDay} onChange={p.pickDay} enabled={(d) => p.futureDays.includes(d)} label="Big day" />
          </div>
          <label className="flex flex-col gap-1 text-xs text-[#475569]">
            Expected on {p.bigDay}
            <input className={cn(inputCls, "w-[110px] px-2.5 py-[9px] text-[15px]")} inputMode="numeric" value={p.draftCals} onChange={(e) => p.setCals(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {p.scenarios.map((s) => {
          const l = p.live(s);
          const look = LOOK[s.key];
          const hi = p.highlight === s.key;
          const miles = num(p.milesVal(s));
          const range = dayRange(p.otherDays, DAYS);
          const targetsLine = s.key === "mix"
            ? <>Other days: <b className="text-[#0f172a]">a little lighter</b> · tap to edit each</>
            : l.sameValue !== null
              ? <>{range} targets: <b className="text-[#0f172a]">{fmt(l.sameValue)}</b> each</>
              : <>{range} targets: <b className="text-[#0f172a]">varies</b> · tap to edit each</>;
          return (
            <div key={s.key} className={cn("flex flex-col overflow-hidden rounded-2xl", hi ? "border-2 border-[#8b5cf6]" : "border border-[#e5e7eb]")}>
              <div className="flex items-center justify-between gap-2 px-4 py-3.5 font-bold text-white" style={{ background: look.header }}>
                {s.title}
                {l.gap >= 0 && (
                  <span className="shrink-0 rounded-full px-2 py-[3px] text-[11px] font-semibold" style={{ background: look.badge }}>Covers it</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                {p.otherDays.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={open === s.key}
                    onClick={() => setOpen(open === s.key ? null : s.key)}
                    className="border-none bg-transparent p-0 text-left text-[13px] text-[#475569]"
                  >
                    {targetsLine}
                  </button>
                )}
                {open === s.key && <PerDayInputs p={p} s={s} />}
                <div className="flex items-center gap-2 text-[13px] text-[#475569]">
                  <span>Run before {p.bigDay}:</span>
                  {open === s.key ? (
                    <input
                      aria-label={`Miles to run before ${p.bigDay}`}
                      className={cn(inputCls, "w-20 px-2 py-1.5 text-[13px]")}
                      inputMode="decimal"
                      value={p.milesVal(s)}
                      onChange={(e) => p.setMiles(s.key, e.target.value)}
                    />
                  ) : (
                    <b className="text-[#0f172a]">{s.key === "mix" && miles > 0 ? "about " : ""}{miles > 0 ? miles.toFixed(1) : "0"} mi</b>
                  )}
                  {miles > 0 && <span>· adds about {fmt(l.burn)}</span>}
                </div>
                <div className={cn("text-[26px] font-extrabold", look.number)}>{p.bigDay}: {fmt(l.big)}</div>
                <div className={cn("text-[13px]", l.gap < 0 ? "text-[#b91c1c]" : "text-[#15803d]")}>{statusText(l.gap, p.want)}</div>
                <LowDaysNote days={l.lowDays} />
                <div className="flex-1" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => p.commit(s)}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-sm font-semibold",
                      hi ? "bg-brand border-none text-white" : "border border-[#cbd5e1] bg-white text-[#0f172a]",
                    )}
                  >
                    {p.inUse(s) ? <><Check className="size-4" /> Using this plan</> : "Use this plan"}
                  </button>
                  {p.edits[s.key] && (
                    <button type="button" onClick={() => p.reset(s.key)} className="min-h-11 rounded-[10px] border border-[#cbd5e1] bg-white px-3 text-sm text-[#334155]">
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {p.plan && (
        <button type="button" onClick={p.clearPlan} className="min-h-11 self-start rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] text-[#334155]">
          Clear plan (back to automatic)
        </button>
      )}
    </section>
  );
}

/* ---------- Mobile: one plan at a time ---------- */

function PlanMobile({ p }: { p: Draft }) {
  const [picked, setPicked] = useState<Scenario["key"] | null>(null);
  const key = picked ?? p.highlight;
  const s = p.scenarios.find((x) => x.key === key)!;
  const l = p.live(s);
  const look = LOOK[s.key];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex h-11 items-center"><SectionTitle as="h1">Plan a big day</SectionTitle></div>
      <p className="m-0 text-[13px] leading-normal text-[#475569]">
        Birthday, party or day out coming up? Pick the day and how much you expect to eat, then compare ways to balance it.
      </p>

      <DayPills value={p.bigDay} onChange={p.pickDay} enabled={(d) => p.futureDays.includes(d)} size="touch" muted="bg-[#e2e8f0]" label="Big day" />

      <label className="flex flex-col gap-1 text-xs text-[#475569]">
        Expected calories on {p.bigDay}
        <input className={cn(inputCls, "p-3")} inputMode="numeric" value={p.draftCals} onChange={(e) => p.setCals(e.target.value)} />
      </label>

      <div role="tablist" aria-label="Ways to balance it" className="grid grid-cols-3 gap-1 rounded-xl bg-[#e2e8f0] p-1">
        {p.scenarios.map((x) => (
          <button
            key={x.key}
            role="tab"
            type="button"
            aria-selected={x.key === key}
            onClick={() => setPicked(x.key)}
            className={cn(
              "min-h-11 rounded-[9px] border-none text-xs leading-tight",
              x.key === key ? "bg-white font-bold text-[#0f172a] shadow-[0_1px_3px_rgba(15,23,42,0.15)]" : "bg-transparent text-[#334155]",
            )}
          >
            {x.short}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[18px] bg-[#e7e7e7] text-white">
        <div className="p-4" style={{ background: look.header }}>
          <div className="text-[15px] font-bold">{s.title}</div>
          <div className="mt-2.5 text-[32px] font-extrabold">{p.bigDay}: {fmt(l.big)}</div>
          <div className="mt-0.5 text-[13px]">{statusText(l.gap, p.want)}</div>
        </div>
        <div className="mx-2.5 mb-2.5 flex flex-col gap-2.5 rounded-xl bg-white p-3 text-[#0f172a]">
          <label className="flex flex-col gap-1 text-xs text-[#475569]">
            Miles to run before {p.bigDay}
            <input className={cn(inputCls, "p-2.5")} inputMode="decimal" value={p.milesVal(s)} onChange={(e) => p.setMiles(s.key, e.target.value)} />
          </label>
          <div className="text-xs text-[#475569]">Adds about {fmt(l.burn)} calories</div>
          {p.otherDays.length > 0 && (
            <>
              <div className="mt-1 text-xs font-semibold text-[#334155]">Daily targets</div>
              <PerDayInputs p={p} s={s} touch />
            </>
          )}
          <LowDaysNote days={l.lowDays} />
          {p.edits[s.key] && (
            <button type="button" onClick={() => p.reset(s.key)} className="min-h-11 self-start rounded-[10px] border border-[#cbd5e1] bg-white px-3 text-[13px] text-[#334155]">
              Reset
            </button>
          )}
        </div>
      </div>

      {p.plan && (
        <button type="button" onClick={p.clearPlan} className="min-h-11 self-start rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] text-[#334155]">
          Clear plan (back to automatic)
        </button>
      )}

      <div className="fixed inset-x-0 bottom-[calc(66px+max(18px,env(safe-area-inset-bottom)))] z-20 border-t border-[#e5e7eb] bg-[rgba(246,247,251,0.96)] px-4 py-3">
        <button
          type="button"
          onClick={() => p.commit(s)}
          className="bg-brand flex min-h-[50px] w-full items-center justify-center gap-1.5 rounded-xl border-none text-[15px] font-bold text-white"
        >
          {p.inUse(s) ? <><Check className="size-4" /> Using this plan</> : "Use this plan"}
        </button>
      </div>
    </div>
  );
}
