import { useAllotly } from "@/state/allotly-store";
import { fmt } from "@/lib/format";
import { FLOOR } from "@/lib/week";

/** Weekly budget + day target. Phase 2 swaps these for the redesigned components. */
export function StatTiles({ variant }: { variant: "desktop" | "mobile" }) {
  const { calc, day } = useAllotly();
  const tiles = [
    { value: fmt(calc.weekly), label: "Weekly budget", sub: `${fmt(calc.dailyBudget)} a day on average` },
    { value: fmt(calc.targetFor(day)), label: `${day} target`, sub: "Rebalanced from what's left" },
  ];
  if (variant === "mobile") {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-[#e5e7eb] bg-white p-3">
            <div className="text-lg font-bold">{t.value}</div>
            <div className="text-xs text-[#475569]">{t.label}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-[14px] border border-[#e5e7eb] bg-white p-4">
          <div className="text-2xl font-bold">{t.value}</div>
          <div className="text-[13px] text-[#334155]">{t.label}</div>
          <div className="text-xs text-[#64748b]">{t.sub}</div>
        </div>
      ))}
    </div>
  );
}

/** Planned-week and floor notices, shown under the tiles when they apply. */
export function Notices() {
  const { calc, day, plan } = useAllotly();
  const floorHit = calc.rawTargetFor(day) < FLOOR;
  if (!plan && !floorHit) return null;
  return (
    <div className="flex flex-col gap-3">
      {plan && (
        <div className="rounded-[14px] bg-gradient-to-br from-[#f5f3ff] to-[#eff6ff] p-4 text-[13px] leading-normal text-[#475569]">
          <b className="text-[#0f172a]">Planned week. </b>
          {plan.day} is your planned big day{plan.cals > 0 ? `, about ${fmt(plan.cals)} calories` : ""}.{" "}
          {Object.keys(plan.others).map((d) => `${d} ${fmt(plan.others[d])}`).join(", ")} are held so everything else rolls into {plan.day}.
          {plan.miles > 0 ? ` Plan on about ${plan.miles} miles of running before then.` : ""} Any run or walk you log adds to {plan.day} too.
        </div>
      )}
      {floorHit && (
        <div className="rounded-[14px] bg-[#fffbeb] p-4 text-[13px] leading-normal text-[#92400e]">
          <b>Floor reached. </b>
          Making up the full overage would mean eating under {fmt(FLOOR)} a day, so the target holds at {fmt(FLOOR)}. Add a run or walk to close the gap, and accept a slightly smaller loss this week.
        </div>
      )}
    </div>
  );
}
