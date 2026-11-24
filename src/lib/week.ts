import { num } from "./format";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const FLOOR = 1400;
/** Within this many calories of the target counts as "on target". */
export const TOL = 100;

export type DayLog = { food: string; burn: string };
export type Settings = { weight: string; ft: string; inch: string; age: string; goal: string; activity: string };
export type Plan = { day: string; cals: number; others: Record<string, number>; miles: number; label: string };
export type WeighIn = { date: string; weight: string };
export type AppState = {
  settings: Settings;
  logs: Record<string, DayLog>;
  weighins: WeighIn[];
  plan: Plan | null;
  shifts: Record<string, number>;
};

export const DEFAULT_SETTINGS: Settings = { weight: "190", ft: "5", inch: "9", age: "33", goal: "2", activity: "1.375" };

export const emptyWeek = (): Record<string, DayLog> => {
  const w: Record<string, DayLog> = {};
  DAYS.forEach((d) => { w[d] = { food: "", burn: "" }; });
  return w;
};

/** Demo data shown on a first-ever run only. It is never re-applied to saved data. */
export const SEED_LOGS: Record<string, DayLog> = {
  ...emptyWeek(),
  Mon: { food: "2630", burn: "0" },
  Tue: { food: "870", burn: "137" },
  Wed: { food: "1200", burn: "0" },
  Thu: { food: "1600", burn: "0" },
  Fri: { food: "550", burn: "0" },
};

export const SEED_WEIGHINS: WeighIn[] = [
  { date: "2026-11-10", weight: "190" },
  { date: "2026-11-12", weight: "188" },
  { date: "2026-11-13", weight: "188" },
];

export const DEFAULT_PLAN: Plan = {
  day: "Sat",
  cals: 0,
  others: { Thu: 1400, Fri: 1400, Sun: 1400 },
  miles: 0,
  label: "Knott's Berry Farm birthday",
};

/** Make sure every day exists. Blank days stay blank. */
export const normalizeLogs = (logs?: Record<string, DayLog>): Record<string, DayLog> => {
  const out = emptyWeek();
  if (logs) DAYS.forEach((d) => { if (logs[d]) out[d] = { food: logs[d].food ?? "", burn: logs[d].burn ?? "" }; });
  return out;
};

export const sortWeighins = (list: WeighIn[]): WeighIn[] => [...list].sort((a, b) => a.date.localeCompare(b.date));

export const isLogged = (l: DayLog): boolean => l.food !== "" || l.burn !== "";
export const dayNet = (logs: Record<string, DayLog>, d: string): number => num(logs[d].food) - num(logs[d].burn);
export const todayIndex = (date: Date = new Date()): number => (date.getDay() + 6) % 7;

/** Round each value so the rounded values still add up to the rounded total. */
const roundToTotal = (values: number[]): number[] => {
  const total = Math.round(values.reduce((a, b) => a + b, 0));
  const floors = values.map(Math.floor);
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = values.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  const out = [...floors];
  for (let k = 0; rest > 0 && k < order.length; k++, rest--) out[order[k].i] += 1;
  return out;
};

export type DayKind = "over" | "met" | "under";
export const outcomeKind = (net: number, target: number): DayKind =>
  net > target + TOL ? "over" : net < target - TOL ? "under" : "met";

export type WeekCalc = ReturnType<typeof computeWeek>;

/**
 * Single source of truth for the week.
 *
 * - "Left this week" = weekly budget − net of every logged day.
 * - Upcoming days = days after today that have nothing logged yet. They share
 *   exactly what's left this week, so the hero, the week table and the week
 *   note always show the same number.
 */
export function computeWeek(input: {
  settings: Settings;
  logs: Record<string, DayLog>;
  plan: Plan | null;
  shifts: Record<string, number>;
  todayIdx: number;
}) {
  const { settings, logs, plan, shifts, todayIdx } = input;
  const kg = num(settings.weight) * 0.4536;
  const cm = (num(settings.ft) * 12 + num(settings.inch)) * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * num(settings.age) + 5;
  const tdee = bmr * num(settings.activity);
  const dailyBudget = tdee - num(settings.goal) * 500;
  const weekly = dailyBudget * 7;

  let totalFood = 0;
  let totalBurn = 0;
  DAYS.forEach((d) => { totalFood += num(logs[d].food); totalBurn += num(logs[d].burn); });
  const totalNet = totalFood - totalBurn;
  const remaining = weekly - totalNet;

  const todayDay = DAYS[todayIdx];
  const fixed: Record<string, number> = plan ? plan.others : {};

  const upcoming = DAYS.filter((d, i) => i > todayIdx && !isLogged(logs[d]));
  const pool = remaining;

  let held = 0;
  let heldN = 0;
  upcoming.forEach((d) => { if (fixed[d] !== undefined) { held += fixed[d]; heldN += 1; } });
  const flexN = upcoming.length - heldN;
  const share = flexN > 0 ? (pool - held) / flexN : 0;
  // If every upcoming day is held, spread the difference across them so they still add up.
  const spread = flexN > 0 ? 0 : upcoming.length > 0 ? (pool - held) / upcoming.length : 0;
  const shiftMean = upcoming.length > 0 ? upcoming.reduce((a, d) => a + (shifts[d] || 0), 0) / upcoming.length : 0;

  const rawBudgets = upcoming.map((d) => (fixed[d] !== undefined ? fixed[d] + spread : share) + (shifts[d] || 0) - shiftMean);
  const rounded = roundToTotal(rawBudgets);
  const budgets: Record<string, number> = {};
  const shiftShown: Record<string, number> = {};
  upcoming.forEach((d, i) => {
    budgets[d] = rounded[i];
    shiftShown[d] = Math.round((shifts[d] || 0) - shiftMean);
  });

  // Today's fair share: what's left after every other logged day, split across today and the upcoming days.
  let otherNet = 0;
  DAYS.forEach((d) => { if (d !== todayDay && isLogged(logs[d])) otherNet += dayNet(logs, d); });
  const todayRaw = fixed[todayDay] !== undefined
    ? fixed[todayDay]
    : (weekly - otherNet - held) / (1 + flexN);

  /** The target for any day: upcoming share, today's rebalanced share, a held plan value, or the daily average. */
  const rawTargetFor = (d: string): number => {
    if (budgets[d] !== undefined) return budgets[d];
    if (d === todayDay) return todayRaw;
    if (fixed[d] !== undefined) return fixed[d];
    return dailyBudget;
  };
  const targetFor = (d: string): number => Math.max(FLOOR, rawTargetFor(d));

  return {
    bmr, tdee, dailyBudget, weekly,
    totalFood, totalBurn, totalNet, remaining,
    fill: weekly > 0 ? totalNet / weekly : 0,
    todayIdx, todayDay,
    upcoming, pool, budgets, shiftShown,
    rawTargetFor, targetFor,
  };
}

/* ---------- Plan a big day ---------- */

export type Scenario = { key: "trim" | "run" | "mix"; title: string; short: string; per: number; miles: number; big: number; capped: boolean };

/** The days a big-day plan can use: today plus upcoming unlogged days, and what's left for them. */
export function planWindow(logs: Record<string, DayLog>, weekly: number, todayIdx: number) {
  const futureDays = DAYS.filter((d, i) => i === todayIdx || (i > todayIdx && !isLogged(logs[d])));
  let lockedNet = 0;
  DAYS.forEach((d) => { if (!futureDays.includes(d)) lockedNet += dayNet(logs, d); });
  return { futureDays, remainingWeek: weekly - lockedNet };
}

export function makeScenarios(remainingWeek: number, nOther: number, want: number, calPerMile: number): Scenario[] {
  const evenShare = remainingWeek / (nOther + 1);
  const trimRaw = nOther > 0 ? (remainingWeek - want) / nOther : evenShare;
  const make = (key: Scenario["key"], title: string, short: string, perRaw: number, useRuns: boolean): Scenario => {
    const per = Math.max(FLOOR, perRaw);
    const leftForBig = remainingWeek - per * nOther;
    const miles = useRuns && calPerMile > 0 ? Math.max(0, (want - leftForBig) / calPerMile) : 0;
    const big = useRuns ? Math.max(leftForBig, want) : leftForBig;
    return { key, title, short, per, miles, big, capped: perRaw < FLOOR };
  };
  return [
    make("trim", "Eat lighter on the other days", "Eat lighter", trimRaw, false),
    make("run", "Keep eating normally, run to earn it", "Run to earn it", evenShare, true),
    make("mix", "A bit of both", "A bit of both", (evenShare + trimRaw) / 2, true),
  ];
}
