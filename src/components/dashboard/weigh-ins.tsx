import { useState } from "react";
import { X } from "lucide-react";
import { useAllotly } from "@/state/allotly-store";
import { num, shortDate, signed, todayStr } from "@/lib/format";
import { SectionTitle, inputCls } from "@/components/brand";
import { cn } from "@/lib/utils";

const STOPS = ["#a78bfa", "#818cf8", "#60a5fa"];
const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(", ")})`;
};
const barColor = (i: number, n: number) => {
  if (n <= 1) return STOPS[0];
  const t = (i / (n - 1)) * (STOPS.length - 1);
  const k = Math.min(STOPS.length - 2, Math.floor(t));
  return mix(STOPS[k], STOPS[k + 1], t - k);
};

function useWeighinData() {
  const { weighins, settings } = useAllotly();
  const latest = weighins.length ? weighins[weighins.length - 1] : null;
  const first = weighins.length ? weighins[0] : null;
  const total = latest && first ? num(latest.weight) - num(first.weight) : 0;
  const recent = weighins.slice(-8);
  const vals = recent.map((w) => num(w.weight));
  const min = Math.min(...vals);
  const span = Math.max(1, Math.max(...vals) - min);
  const stale = latest !== null && num(latest.weight) !== num(settings.weight);
  return { weighins, latest, first, total, recent, vals, min, span, stale };
}

function BudgetNote() {
  const { settings, setField } = useAllotly();
  const { latest, stale } = useWeighinData();
  if (!latest || !stale) return null;
  return (
    <div className="rounded-[10px] bg-[#fffbeb] px-3 py-2.5 text-xs text-[#92400e]">
      Your budget still uses {settings.weight} lbs.{" "}
      <a href="#" onClick={(e) => { e.preventDefault(); setField("weight", latest.weight); }}>Update to {latest.weight}</a>
    </div>
  );
}

function WeighList() {
  const { removeWeighin } = useAllotly();
  const { weighins } = useWeighinData();
  const rows = weighins.map((w, i) => ({ ...w, change: i === 0 ? "–" : signed(num(w.weight) - num(weighins[i - 1].weight)) })).reverse();
  return (
    <div className="flex flex-col text-[13px]">
      <div className="grid grid-cols-[2fr_1fr_1fr_44px] border-b border-[#e5e7eb] py-2 text-xs text-[#64748b]">
        <span>Date</span><span>Weight</span><span>Change</span><span />
      </div>
      {rows.map((w, i) => (
        <div key={w.date} className={cn("grid grid-cols-[2fr_1fr_1fr_44px] items-center py-0.5", i < rows.length - 1 && "border-b border-[#f1f5f9]")}>
          <span>{shortDate(w.date)}</span>
          <span>{w.weight}</span>
          <span>{w.change}</span>
          <button type="button" aria-label={`Remove ${shortDate(w.date)} weigh-in`} onClick={() => removeWeighin(w.date)} className="flex size-11 items-center justify-center border-none bg-transparent text-[#64748b]">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function WeighIns({ variant }: { variant: "desktop" | "mobile" }) {
  const { addWeighin } = useAllotly();
  const d = useWeighinData();
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const add = (forDate: string) => { if (addWeighin(forDate, weight)) setWeight(""); };

  if (variant === "mobile") {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-3.5">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="m-0 text-[17px] font-bold">Weigh-ins</h2>
            <div className="accent-bar" />
          </div>
          {d.latest && (
            <div className="text-[13px]">
              <b className="text-xl">{d.latest.weight}</b> lbs ·{" "}
              <span className={d.total <= 0 ? "text-[#15803d]" : "text-[#b91c1c]"}>{signed(d.total)}</span>
            </div>
          )}
        </div>
        {d.recent.length > 0 && (
          <div className="flex h-16 items-end gap-2 border-b border-[#e5e7eb]">
            {d.recent.map((w, i) => (
              <div key={w.date} className="flex-1 rounded-t-md" style={{ height: 36 + ((d.vals[i] - d.min) / d.span) * 20, background: barColor(i, d.recent.length) }} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[#475569]">
            Today's weight (lbs)
            <input className={cn(inputCls, "p-2.5")} placeholder="e.g. 187" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <button type="button" onClick={() => add(todayStr())} className="bg-brand min-h-11 rounded-[10px] border-none px-4 text-sm font-semibold text-white">Add</button>
        </div>
        <BudgetNote />
        {d.weighins.length > 0 && <WeighList />}
      </section>
    );
  }

  return (
    <div className="grid gap-6 rounded-[20px] border border-[#e5e7eb] bg-white p-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3.5">
        <SectionTitle>Weigh-ins</SectionTitle>
        <div className="rounded-[14px] px-[18px] py-4 text-white" style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
          <div className="text-xs font-semibold tracking-[0.08em]">LATEST</div>
          <div className="text-[32px] font-extrabold">{d.latest ? `${d.latest.weight} lbs` : "–"}</div>
          {d.first && d.weighins.length > 1 && <div className="text-[13px]">{signed(d.total)} lbs since {shortDate(d.first.date)}</div>}
        </div>
        {d.recent.length > 0 && (
          <div className="flex h-[110px] items-end gap-2.5 border-b border-[#e5e7eb] px-1">
            {d.recent.map((w, i) => (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md" style={{ height: 60 + ((d.vals[i] - d.min) / d.span) * 30, background: barColor(i, d.recent.length) }} />
                <span className="text-[11px] text-[#475569]">{w.weight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[#475569]">
            Date
            <input type="date" className={cn(inputCls, "px-2 py-[9px] text-[13px]")} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#475569]">
            Weight (lbs)
            <input className={cn(inputCls, "px-2 py-[9px] text-[13px]")} placeholder="e.g. 187" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <button type="button" onClick={() => add(date)} className="bg-brand min-h-10 rounded-[10px] border-none text-[13px] font-semibold text-white">Add</button>
        </div>
        {d.weighins.length > 0 && <WeighList />}
        <BudgetNote />
      </div>
    </div>
  );
}
