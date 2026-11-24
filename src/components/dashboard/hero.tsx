import { useAllotly } from "@/state/allotly-store";
import { fmt } from "@/lib/format";
import { dayNet, outcomeKind, type DayKind } from "@/lib/week";
import { cn } from "@/lib/utils";

const HERO_BG: Record<DayKind, { bg: string; shadow: string }> = {
  over: { bg: "linear-gradient(135deg, #dc2626, #ea580c)", shadow: "0 12px 30px rgba(234,88,12,0.25)" },
  met: { bg: "linear-gradient(135deg, #4ade80, #16a34a)", shadow: "0 12px 30px rgba(22,163,74,0.25)" },
  under: { bg: "linear-gradient(135deg, #60a5fa, #2563eb)", shadow: "0 12px 30px rgba(37,99,235,0.25)" },
};

function Bar({ pct, fill, height }: { pct: number; fill: string; height: string }) {
  return (
    <div className={cn("rounded-full bg-white/30", height)}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: fill }} />
    </div>
  );
}

/** "Left for Mon" hero with today's bar and the week bar merged in. */
export function Hero({ variant }: { variant: "desktop" | "mobile" }) {
  const { calc, day, logs } = useAllotly();
  const target = calc.targetFor(day);
  const net = dayNet(logs, day);
  const left = target - net;
  const kind = outcomeKind(net, target);
  const { bg, shadow } = HERO_BG[kind];
  const dayPct = target > 0 ? net / target : 0;
  const weekLine = calc.remaining >= 0 ? `This week · ${fmt(calc.remaining)} left` : `This week · ${fmt(-calc.remaining)} over`;
  const weekPct = Math.round(calc.fill * 100);

  if (variant === "mobile") {
    return (
      <div className="rounded-[18px] p-5 text-white" style={{ background: bg }}>
        <div className="flex justify-between text-[11px] font-semibold tracking-[0.08em]">
          <span>LEFT FOR {day.toUpperCase()}</span>
          <span>TARGET {fmt(target)}</span>
        </div>
        <div className="mt-1 text-5xl leading-[1.1] font-extrabold tracking-[-0.03em]">{fmt(left)}</div>
        <div className="mt-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs"><span>{weekLine}</span><span>{weekPct}% used</span></div>
          <Bar pct={calc.fill} fill="#ffffff" height="h-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] p-7 text-white" style={{ background: bg, boxShadow: shadow }}>
      <div className="text-xs font-semibold tracking-[0.08em] opacity-90">LEFT FOR {day.toUpperCase()}</div>
      <div className="mt-1 text-6xl leading-[1.1] font-extrabold tracking-[-0.03em]">{fmt(left)}</div>
      <div className="mt-1 text-sm opacity-95">Target {fmt(target)} · {fmt(net)} net logged</div>
      <div className="mt-5 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs"><span>Today</span><span>{Math.round(dayPct * 100)}% of target</span></div>
        <Bar pct={dayPct} fill="#ffffff" height="h-2.5" />
      </div>
      <div className="mt-3.5 flex flex-col gap-1.5">
        <div className="flex justify-between text-xs"><span>{weekLine}</span><span>{weekPct}% of {fmt(calc.weekly)}</span></div>
        <Bar pct={calc.fill} fill="rgba(255,255,255,0.75)" height="h-2.5" />
      </div>
    </div>
  );
}
