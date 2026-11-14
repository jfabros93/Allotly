import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FLOOR = 1400;
const STORE_KEY = "dynamic-calorie-counter-v1";
const PASSCODE_KEY = "allotly-passcode";

type DayLog = { food: string; burn: string };
type Settings = { weight: string; ft: string; inch: string; age: string; goal: string; activity: string };

type AppState = {
  settings: Settings;
  logs: Record<string, DayLog>;
  weighins: WeighIn[];
  plan: Plan | null;
  shifts: Record<string, number>;
};

const emptyWeek = (): Record<string, DayLog> => {
  const w: Record<string, DayLog> = {};
  DAYS.forEach((d: string) => { w[d] = { food: "", burn: "" }; });
  return w;
};

const num = (s: string): number => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const fmt = (n: number): string => Math.round(n).toLocaleString("en-US");

const SEED: Record<string, DayLog> = {
  Mon: { food: "2630", burn: "0" },
  Tue: { food: "870", burn: "137" },
  Wed: { food: "1200", burn: "0" },
  Thu: { food: "1600", burn: "0" },
  Fri: { food: "550", burn: "0" },
};

const withSeed = (w: Record<string, DayLog>): Record<string, DayLog> => {
  const out: Record<string, DayLog> = { ...w };
  Object.keys(SEED).forEach((d: string) => {
    const cur = out[d];
    const blank = !cur || (cur.food === "" && cur.burn === "");
    const oldSeed = cur && d === "Thu" && cur.food === "300" && cur.burn === "0";
    if (blank || oldSeed) out[d] = SEED[d];
  });
  return out;
};

type Plan = { day: string; cals: number; others: Record<string, number>; miles: number; label: string };

const DEFAULT_PLAN: Plan = {
  day: "Sat",
  cals: 0,
  others: { Thu: 1400, Fri: 1400, Sun: 1400 },
  miles: 0,
  label: "Knott's Berry Farm birthday",
};

type WeighIn = { date: string; weight: string };

const WEIGH_SEED: WeighIn[] = [
  { date: "2026-11-10", weight: "190" },
  { date: "2026-11-12", weight: "188" },
  { date: "2026-11-13", weight: "188" },
];

const seedWeighins = (list: WeighIn[]): WeighIn[] => {
  const out = [...list];
  WEIGH_SEED.forEach((s: WeighIn) => {
    if (!out.some((w: WeighIn) => w.date === s.date)) out.push(s);
  });
  return out.sort((a: WeighIn, b: WeighIn) => a.date.localeCompare(b.date));
};

const todayStr = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
};

const prettyDate = (s: string): string => {
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const signed = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export default function App() {
  const [settings, setSettings] = useState<Settings>({
    weight: "190", ft: "5", inch: "9", age: "33", goal: "2", activity: "1.375",
  });
  const [logs, setLogs] = useState<Record<string, DayLog>>(withSeed(emptyWeek()));
  const [day, setDay] = useState<string>(DAYS[(new Date().getDay() + 6) % 7]);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [miles, setMiles] = useState<string>("");
  const [weighins, setWeighins] = useState<WeighIn[]>(seedWeighins([]));
  const [newDate, setNewDate] = useState<string>(todayStr());
  const [newWeight, setNewWeight] = useState<string>("");
  const [plan, setPlan] = useState<Plan | null>(DEFAULT_PLAN);
  const [draftDay, setDraftDay] = useState<string>("Sat");
  const [draftCals, setDraftCals] = useState<string>("2400");
  const [edits, setEdits] = useState<Record<string, { per: Record<string, string>; miles?: string }>>({});
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [planOpen, setPlanOpen] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>("");
  const [showPasscodePrompt, setShowPasscodePrompt] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<"saved" | "syncing" | "offline">("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage first
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      
      if (raw) {
        const parsed = JSON.parse(raw) as { settings?: Settings; logs?: Record<string, DayLog>; weighins?: WeighIn[]; plan?: Plan | null; shifts?: Record<string, number> };
        if (parsed.plan !== undefined) setPlan(parsed.plan);
        if (parsed.shifts) setShifts(parsed.shifts);
        if (parsed.weighins) setWeighins(seedWeighins(parsed.weighins));
        if (parsed.settings) setSettings(parsed.settings);
        if (parsed.logs) setLogs(withSeed(parsed.logs));
      }
    } catch (e) {
      // storage unavailable
    }
    setLoaded(true);
  }, []);

  // Fetch from server on load
  useEffect(() => {
    if (!loaded) return;
    
    const fetchFromServer = async () => {
      const currentPasscode = window.localStorage.getItem(PASSCODE_KEY);
      if (!currentPasscode) {
        setShowPasscodePrompt(true);
        return;
      }

      try {
        const response = await fetch("/api/data", {
          headers: { "X-Allotly-Passcode": currentPasscode },
        });

        if (response.status === 401) {
          window.localStorage.removeItem(PASSCODE_KEY);
          setShowPasscodePrompt(true);
          return;
        }

        if (response.ok) {
          const serverData = await response.json() as AppState;
          
          // If server has data, use it
          if (serverData.settings) {
            setSettings(serverData.settings);
            setLogs(withSeed(serverData.logs));
            setWeighins(seedWeighins(serverData.weighins));
            setPlan(serverData.plan);
            setShifts(serverData.shifts || {});
            
            // Save to localStorage as cache
            window.localStorage.setItem(STORE_KEY, JSON.stringify(serverData));
          } else {
            // Server has no data, upload what we have locally
            const localData: AppState = {
              settings,
              logs,
              weighins,
              plan,
              shifts,
            };
            await saveToServer(localData, currentPasscode);
          }
          setSyncStatus("saved");
        } else {
          setSyncStatus("offline");
        }
      } catch (e) {
        setSyncStatus("offline");
      }
    };

    fetchFromServer();
  }, [loaded]);

  const saveToServer = async (state: AppState, currentPasscode: string) => {
    try {
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Allotly-Passcode": currentPasscode,
        },
        body: JSON.stringify(state),
      });

      if (response.status === 401) {
        window.localStorage.removeItem(PASSCODE_KEY);
        setShowPasscodePrompt(true);
        setSyncStatus("offline");
        return;
      }

      if (response.ok) {
        setSyncStatus("saved");
      } else {
        setSyncStatus("offline");
      }
    } catch (e) {
      setSyncStatus("offline");
    }
  };

  const debouncedSave = useCallback((state: AppState) => {
    const currentPasscode = window.localStorage.getItem(PASSCODE_KEY);
    if (!currentPasscode) return;

    setSyncStatus("syncing");
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveToServer(state, currentPasscode);
    }, 1000);
  }, []);

  // Save to localStorage and server on state changes
  useEffect(() => {
    if (!loaded) return;
    
    const state: AppState = { settings, logs, weighins, plan, shifts };
    
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      // storage unavailable
    }

    debouncedSave(state);
  }, [settings, logs, weighins, plan, shifts, loaded, debouncedSave]);

  const handlePasscodeSubmit = () => {
    if (!passcodeInput.trim()) return;
    window.localStorage.setItem(PASSCODE_KEY, passcodeInput);
    setShowPasscodePrompt(false);
    window.location.reload();
  };

  const addWeighin = () => {
    if (num(newWeight) <= 0 || newDate === "") return;
    const rest = weighins.filter((w: WeighIn) => w.date !== newDate);
    rest.push({ date: newDate, weight: newWeight });
    setWeighins(rest.sort((a: WeighIn, b: WeighIn) => a.date.localeCompare(b.date)));
    setNewWeight("");
  };
  const removeWeighin = (date: string) => setWeighins(weighins.filter((w: WeighIn) => w.date !== date));

  const setField = (key: keyof Settings) => (v: string) => setSettings({ ...settings, [key]: v });
  const setLog = (d: string, key: keyof DayLog, v: string) =>
    setLogs({ ...logs, [d]: { ...logs[d], [key]: v } });
  const addTo = (key: keyof DayLog, amount: number) =>
    setLog(day, key, String(num(logs[day][key]) + amount));

  const calc = useMemo(() => {
    const kg = num(settings.weight) * 0.4536;
    const cm = (num(settings.ft) * 12 + num(settings.inch)) * 2.54;
    const bmr = 10 * kg + 6.25 * cm - 5 * num(settings.age) + 5;
    const tdee = bmr * num(settings.activity);
    const dailyBudget = tdee - num(settings.goal) * 500;
    const weekly = dailyBudget * 7;
    const idx = DAYS.indexOf(day);
    let netBefore = 0;
    let totalFood = 0;
    let totalBurn = 0;
    DAYS.forEach((d: string, i: number) => {
      const f = num(logs[d].food);
      const b = num(logs[d].burn);
      totalFood += f;
      totalBurn += b;
      if (i < idx) netBefore += f - b;
    });
    const totalNet = totalFood - totalBurn;
    const fixed: Record<string, number> = plan ? plan.others : {};
    let reserved = 0;
    let flexDays = 0;
    DAYS.forEach((d: string, i: number) => {
      if (i < idx) return;
      if (fixed[d] !== undefined && i !== idx) reserved += fixed[d];
      if (fixed[d] === undefined) flexDays += 1;
    });
    
    // Upcoming days (after today) split whatever is left of the week once today is counted
    const tIdx = (new Date().getDay() + 6) % 7;
    let netThroughToday = 0;
    DAYS.forEach((d: string, i: number) => {
      if (i <= tIdx) netThroughToday += num(logs[d].food) - num(logs[d].burn);
    });
    const upcoming = DAYS.slice(tIdx + 1);
    const pool = weekly - netThroughToday;
    let held = 0;
    let heldN = 0;
    upcoming.forEach((d: string) => { if (fixed[d] !== undefined) { held += fixed[d]; heldN += 1; } });
    const flexN = upcoming.length - heldN;
    const share = flexN > 0 ? (pool - held) / flexN : 0;
    const spread = flexN > 0 ? 0 : upcoming.length > 0 ? (pool - held) / upcoming.length : 0;
    const shiftMean = upcoming.length > 0 ? upcoming.reduce((a: number, d: string) => a + (shifts[d] || 0), 0) / upcoming.length : 0;
    const budgets: Record<string, number> = {};
    upcoming.forEach((d: string) => {
      const base = fixed[d] !== undefined ? fixed[d] + spread : share;
      budgets[d] = base + (shifts[d] || 0) - shiftMean;
    });
    
    const planned = fixed[day] !== undefined;
    const rawTarget = budgets[day] !== undefined
      ? budgets[day]
      : planned
        ? fixed[day]
        : (weekly - netBefore - reserved) / Math.max(1, flexDays);
    const target = Math.max(FLOOR, rawTarget);
    const todayNet = num(logs[day].food) - num(logs[day].burn);
    return {
      bmr, tdee, dailyBudget, weekly, totalFood, totalBurn, totalNet,
      remaining: weekly - totalNet, rawTarget, target, todayLeft: target - todayNet,
      fill: weekly > 0 ? totalNet / weekly : 0,
      upcoming, budgets, pool,
    };
  }, [settings, logs, day, plan, shifts]);

  // Move calories onto (or off) one upcoming day
  const nudge = (d: string, delta: number) => {
    const others = calc.upcoming.filter((x: string) => x !== d);
    if (others.length === 0) return;
    const next: Record<string, number> = {};
    calc.upcoming.forEach((x: string) => { next[x] = shifts[x] || 0; });
    next[d] += delta;
    others.forEach((x: string) => { next[x] -= delta / others.length; });
    setShifts(next);
  };
  const hasShifts = calc.upcoming.some((d: string) => Math.abs(shifts[d] || 0) > 0.5);

  const calPerMile = num(settings.weight) * 0.72;

  const todayIdx = (new Date().getDay() + 6) % 7;
  const futureDays = DAYS.slice(todayIdx);
  const bigDay = futureDays.indexOf(draftDay) >= 0 ? draftDay : futureDays[futureDays.length - 1];
  let netBeforeToday = 0;
  DAYS.forEach((d: string, i: number) => {
    if (i < todayIdx) netBeforeToday += num(logs[d].food) - num(logs[d].burn);
  });
  const remainingWeek = calc.weekly - netBeforeToday;
  const otherDays = futureDays.filter((d: string) => d !== bigDay);
  const nOther = otherDays.length;
  const want = num(draftCals);
  const evenShare = remainingWeek / (nOther + 1);
  const trimRaw = nOther > 0 ? (remainingWeek - want) / nOther : evenShare;
  
  type Scenario = { key: string; title: string; per: number; miles: number; big: number; capped: boolean };
  const makeScenario = (key: string, title: string, perRaw: number, useRuns: boolean): Scenario => {
    const per = Math.max(FLOOR, perRaw);
    const leftForBig = remainingWeek - per * nOther;
    const miles = useRuns ? Math.max(0, (want - leftForBig) / calPerMile) : 0;
    const big = useRuns ? Math.max(leftForBig, want) : leftForBig;
    return { key, title, per, miles, big, capped: perRaw < FLOOR };
  };
  
  const scenarios: Scenario[] = [
    makeScenario("trim", "Eat lighter on the other days", trimRaw, false),
    makeScenario("run", "Keep eating normally, run to earn it", evenShare, true),
    makeScenario("mix", "A bit of both", (evenShare + trimRaw) / 2, true),
  ];
  
  const perVal = (s: Scenario, d: string): string => {
    const e = edits[s.key];
    return e && e.per[d] !== undefined ? e.per[d] : String(Math.round(s.per));
  };
  
  const milesVal = (s: Scenario): string => {
    const e = edits[s.key];
    return e && e.miles !== undefined ? e.miles : s.miles > 0 ? s.miles.toFixed(1) : "0";
  };
  
  const setPer = (key: string, d: string, v: string) => {
    const cur = edits[key] || { per: {} };
    setEdits({ ...edits, [key]: { ...cur, per: { ...cur.per, [d]: v } } });
  };
  
  const setMilesFor = (key: string, v: string) => {
    const cur = edits[key] || { per: {} };
    setEdits({ ...edits, [key]: { ...cur, miles: v } });
  };
  
  const resetCard = (key: string) => {
    const next = { ...edits };
    delete next[key];
    setEdits(next);
  };
  
  const live = (s: Scenario) => {
    const sumOthers = otherDays.reduce((acc: number, d: string) => acc + num(perVal(s, d)), 0);
    const burn = num(milesVal(s)) * calPerMile;
    const big = remainingWeek - sumOthers + burn;
    const lowDays = otherDays.filter((d: string) => num(perVal(s, d)) < FLOOR);
    return { big, burn, gap: big - want, lowDays };
  };
  
  const commitScenario = (s: Scenario) => {
    const others: Record<string, number> = otherDays.reduce((acc: Record<string, number>, d: string) => {
      acc[d] = Math.round(num(perVal(s, d)));
      return acc;
    }, {});
    setPlan({ day: bigDay, cals: want, others, miles: Math.round(num(milesVal(s)) * 10) / 10, label: s.title });
  };
  
  const planNote = plan
    ? `${plan.day} is your planned big day${plan.cals > 0 ? `, about ${fmt(plan.cals)} calories` : ""}. ${Object.keys(plan.others).map((d: string) => `${d} ${fmt(plan.others[d])}`).join(", ")} are held so everything else rolls into ${plan.day}.${plan.miles > 0 ? ` Plan on about ${plan.miles} miles of running before then.` : ""} Any run or walk you log adds to ${plan.day} too.`
    : "";
  
  const over = calc.fill > 1;
  const pct = Math.max(0, Math.min(1, calc.fill));

  const mixHex = (a: string, b: string, t: number): string => {
    const pa = [1, 3, 5].map((i: number) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i: number) => parseInt(b.slice(i, i + 2), 16));
    return `rgb(${pa.map((v: number, i: number) => Math.round(v + (pb[i] - v) * t)).join(", ")})`;
  };
  
  const leftPct = Math.max(0, 1 - calc.fill);
  const warmT = Math.max(0, Math.min(1, (0.6 - leftPct) / 0.6));
  const heroBg = over
    ? `linear-gradient(135deg, #dc2626, #ea580c)`
    : `linear-gradient(135deg, ${mixHex("#1d4ed8", "#c2410c", warmT)}, ${mixHex("#3b82f6", "#ea580c", warmT)})`;
  
  const dayLeftPct = calc.target > 0 ? Math.max(0, calc.todayLeft / calc.target) : 0;
  const dayWarmT = Math.max(0, Math.min(1, (0.6 - dayLeftPct) / 0.6));
  const dayOver = calc.todayLeft < 0;
  const dayBg = dayOver
    ? `linear-gradient(135deg, #dc2626, #ea580c)`
    : `linear-gradient(135deg, ${mixHex("#1d4ed8", "#c2410c", dayWarmT)}, ${mixHex("#3b82f6", "#ea580c", dayWarmT)})`;

  const TOL = 100;
  const dayTarget = (d: string): number => (calc.budgets[d] !== undefined ? calc.budgets[d] : plan && plan.others[d] !== undefined ? plan.others[d] : calc.dailyBudget);
  
  const outcomeKind = (net: number, t: number): string => (net > t + TOL ? "over" : net < t - TOL ? "under" : "met");

  if (showPasscodePrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Enter Passcode</h2>
          <p className="text-gray-600">Enter your passcode to sync data across devices.</p>
          <input
            type="password"
            value={passcodeInput}
            onChange={e => setPasscodeInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handlePasscodeSubmit()}
            placeholder="Passcode"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            onClick={handlePasscodeSubmit}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
          <button
            onClick={() => {
              setShowPasscodePrompt(false);
              setSyncStatus("offline");
            }}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Continue offline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Sync status indicator */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === "saved" ? "bg-green-500" :
              syncStatus === "syncing" ? "bg-blue-500 animate-pulse" :
              "bg-gray-400"
            }`} />
            <span className="text-gray-600">
              {syncStatus === "saved" ? "Saved" :
               syncStatus === "syncing" ? "Syncing..." :
               "Offline"}
            </span>
          </div>
        </div>

        {/* This week hero card */}
        <div className="space-y-3">
          <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <div 
            className="flex flex-col gap-2.5 p-4 rounded-2xl text-white shadow-xl"
            style={{ background: "linear-gradient(160deg, #1d2029 0%, #0a0b0f 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase opacity-70">This week</span>
              <span className="text-sm opacity-70">{over ? "Over budget" : `${Math.round(leftPct * 100)}% left`}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-2xl font-extrabold leading-none">{fmt(Math.abs(calc.remaining))}</span>
              <span className="text-sm opacity-70">{calc.remaining < 0 ? `over your ${fmt(calc.weekly)}` : `left of ${fmt(calc.weekly)}`}</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct * 100}%`, background: heroBg }}
              />
            </div>
          </div>
        </div>

        {/* Daily card */}
        <div 
          className="flex flex-col gap-3.5 p-5 rounded-3xl text-white shadow-2xl transition-all duration-500"
          style={{ background: dayBg }}
        >
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{`Left for ${day}`}</span>
          <span className="text-5xl font-extrabold leading-none">{fmt(calc.todayLeft)}</span>
          <span className="text-sm opacity-80">{`Target ${fmt(calc.target)} · ${fmt(calc.remaining)} left this week`}</span>
          <div className="w-full h-4 rounded-full bg-white/25 overflow-hidden shadow-inner">
            <div 
              className="h-full rounded-full transition-all"
              style={{ width: `${pct * 100}%`, background: over ? "#fff" : "linear-gradient(90deg, rgba(255,255,255,0.75), #fff)" }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-sm opacity-80">
            <span>{fmt(calc.totalNet)} net used</span>
            <span>{Math.round(calc.fill * 100)}% of {fmt(calc.weekly)}</span>
          </div>
          <span className="text-sm opacity-80">
            {over ? "You're over this week's budget. Log a workout or keep the rest of the week light." : "Food fills the bar. Workouts drain it back down."}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-2xl font-bold">{fmt(calc.weekly)}</div>
            <div className="text-sm text-gray-600 font-medium">Weekly budget</div>
            <div className="text-xs text-gray-500">{fmt(calc.dailyBudget)} a day on average</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className={`text-2xl font-bold ${calc.remaining < 0 ? 'text-red-600' : ''}`}>{fmt(calc.remaining)}</div>
            <div className="text-sm text-gray-600 font-medium">Left this week</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-2xl font-bold">{fmt(calc.target)}</div>
            <div className="text-sm text-gray-600 font-medium">{day} target</div>
            <div className="text-xs text-gray-500">Rebalanced from what's left</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className={`text-2xl font-bold ${calc.todayLeft < 0 ? 'text-orange-600' : ''}`}>{fmt(calc.todayLeft)}</div>
            <div className="text-sm text-gray-600 font-medium">Left for {day}</div>
          </div>
        </div>

        {plan && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="font-semibold text-blue-900 mb-1">Planned week.</div>
            <div className="text-sm text-blue-800">{planNote}</div>
          </div>
        )}

        {calc.rawTarget < FLOOR && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="font-semibold text-amber-900 mb-1">Floor reached.</div>
            <div className="text-sm text-amber-800">
              Making up the full overage would mean eating under {fmt(FLOOR)} a day, so the target holds at {fmt(FLOOR)}. Add a run or walk to close the gap, and accept a slightly smaller loss this week.
            </div>
          </div>
        )}

        {/* Plan a big day */}
        <div className="space-y-3">
          <button
            onClick={() => setPlanOpen(!planOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-bold">Plan a big day</h2>
            <span className="text-gray-400">{planOpen ? "▼" : "▶"}</span>
          </button>
          {planOpen && (
            <>
              <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <p className="text-sm text-gray-600">
                Got a birthday, party, or day out coming up? Pick the day and how much you expect to eat, then compare ways to balance it before you commit. Without a plan, the counter just spreads what's left evenly.
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {futureDays.map(d => (
                  <button
                    key={d}
                    onClick={() => { setDraftDay(d); setEdits({}); }}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                      bigDay === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected calories on {bigDay}</label>
                <input
                  type="number"
                  value={draftCals}
                  onChange={e => { setDraftCals(e.target.value); setEdits({}); }}
                  placeholder="e.g. 2400"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4">
                {scenarios.map((s, si) => {
                  const colors = [
                    { from: 'from-blue-500', to: 'to-purple-500', text: 'text-blue-500' },
                    { from: 'from-purple-500', to: 'to-pink-500', text: 'text-purple-500' },
                    { from: 'from-pink-500', to: 'to-orange-500', text: 'text-pink-500' },
                  ];
                  const color = colors[si];
                  const liveData = live(s);
                  
                  return (
                    <div key={s.key} className="rounded-2xl overflow-hidden border shadow-lg" style={{ background: "linear-gradient(160deg, #1d2029 0%, #0a0b0f 100%)", borderColor: "rgba(255,255,255,0.08)" }}>
                      <div className={`p-4 bg-gradient-to-r ${color.from} ${color.to} text-white`}>
                        <span className="font-bold text-lg">{s.title}</span>
                      </div>
                      <div className="flex flex-col gap-2.5 p-4">
                        <div className="bg-white rounded-xl p-3 space-y-2">
                          {otherDays.map(d => (
                            <div key={d}>
                              <label className="block text-xs font-medium text-gray-600 mb-1">{d} target</label>
                              <input
                                type="number"
                                value={perVal(s, d)}
                                onChange={e => setPer(s.key, d, e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Miles to run before {bigDay}</label>
                            <input
                              type="number"
                              value={milesVal(s)}
                              onChange={e => setMilesFor(s.key, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <span className="text-xs text-gray-300">Running adds about {fmt(liveData.burn)} calories</span>
                        <span className={`text-2xl font-extrabold ${color.text}`}>{bigDay}: {fmt(liveData.big)}</span>
                        <span className={`text-xs ${liveData.gap < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          {liveData.gap < 0 ? `${fmt(-liveData.gap)} short of your ${fmt(want)}` : `Covers your ${fmt(want)}${liveData.gap > 0 ? ` with ${fmt(liveData.gap)} to spare` : ""}`}
                        </span>
                        {liveData.lowDays.length > 0 && (
                          <span className="text-xs text-gray-300">
                            {liveData.lowDays.join(", ")} below {fmt(FLOOR)}. That's too low to keep up with work and the twins.
                          </span>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => commitScenario(s)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                          >
                            Use this plan
                          </button>
                          {edits[s.key] && (
                            <button
                              onClick={() => resetCard(s.key)}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {plan && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPlan(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                  >
                    Clear plan (back to automatic)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Log a day */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Log a day</h2>
          <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
          <div 
            className="flex flex-col gap-3.5 p-5 rounded-2xl text-white shadow-xl"
            style={{ background: "linear-gradient(160deg, #1d2029 0%, #0a0b0f 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex flex-wrap justify-between items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider uppercase opacity-70">Logging</span>
                <span className="text-3xl font-extrabold leading-none">{day}</span>
              </div>
              <span className="text-sm opacity-70">{fmt(num(logs[day].food) - num(logs[day].burn))} net · target {fmt(calc.target)}</span>
            </div>
            <div className="h-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <div className="bg-white rounded-xl p-3.5 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {DAYS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                      day === d ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Food eaten on {day}</label>
                  <input
                    type="number"
                    value={logs[day].food}
                    onChange={e => setLog(day, "food", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exercise burned on {day}</label>
                  <input
                    type="number"
                    value={logs[day].burn}
                    onChange={e => setLog(day, "burn", e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addTo("food", 250)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  + Vietnamese coffee (250)
                </button>
                <button onClick={() => addTo("food", 600)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  + Meal (600)
                </button>
                <button onClick={() => addTo("food", 200)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  + Snack (200)
                </button>
                <button onClick={() => addTo("burn", 150)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  + Lunch walk (150)
                </button>
                <button onClick={() => addTo("burn", 250)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                  + Gym (250)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Miles run</label>
                  <input
                    type="number"
                    value={miles}
                    onChange={e => setMiles(e.target.value)}
                    placeholder="e.g. 1.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { if (num(miles) > 0) { addTo("burn", Math.round(num(miles) * calPerMile)); setMiles(""); } }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    {num(miles) > 0 ? `+ Add run (${fmt(num(miles) * calPerMile)})` : "+ Add run"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">Runs count about {fmt(calPerMile)} calories per mile at your current weight.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLogs({ ...logs, [day]: { food: "", burn: "" } })}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Clear {day}
                </button>
                <button
                  onClick={() => { setLogs(emptyWeek()); setPlan(null); setShifts({}); }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Start a new week
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Week at a glance */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Week at a glance</h2>
          <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-pink-500 to-blue-500"></div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 shadow-lg">
            <div className="space-y-1.5 text-sm">
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 px-3 pb-1 text-xs font-semibold text-gray-500">
                <span>Day</span>
                <span className="text-right">Food</span>
                <span className="text-right">Exercise</span>
                <span className="text-right">Net</span>
                <span className="text-right">Result</span>
              </div>
              {DAYS.map(d => {
                const f = num(logs[d].food);
                const b = num(logs[d].burn);
                const logged = logs[d].food !== "" || logs[d].burn !== "";
                const kind = logged ? outcomeKind(f - b, dayTarget(d)) : "none";
                const bud = calc.budgets[d];
                
                // Show upcoming day budget with +/- buttons if not logged
                if (!logged && bud !== undefined) {
                  const sh = Math.round((shifts[d] || 0) - (calc.upcoming.reduce((a: number, x: string) => a + (shifts[x] || 0), 0) / calc.upcoming.length));
                  const low = bud < FLOOR;
                  const isHeld = plan && plan.others[d] !== undefined;
                  const isBig = plan && plan.day === d;
                  const tag = Math.abs(sh) >= 1 ? `${sh > 0 ? "+" : "−"}${fmt(Math.abs(sh))}` : isBig ? "big day" : isHeld ? "held" : "budget";
                  
                  return (
                    <div 
                      key={d} 
                      className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 rounded-xl bg-white border border-dashed ${low ? 'border-orange-500' : 'border-gray-300'} border-l-4`}
                    >
                      <span className="font-bold">{d}</span>
                      <span className="col-span-3 flex items-baseline justify-end gap-1.5">
                        <span className={`text-xs ${low ? 'text-orange-600' : 'text-gray-500'}`}>{low ? "below 1,400" : tag}</span>
                        <span className={`text-lg font-extrabold tabular-nums ${low ? 'text-orange-600' : ''}`}>{fmt(bud)}</span>
                      </span>
                      <span className="flex justify-end gap-1.5">
                        <button
                          onClick={() => nudge(d, -100)}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 text-white font-extrabold text-lg leading-none shadow-md hover:shadow-lg transition-shadow"
                          aria-label={`Less on ${d}`}
                        >
                          −
                        </button>
                        <button
                          onClick={() => nudge(d, 100)}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 text-white font-extrabold text-lg leading-none shadow-md hover:shadow-lg transition-shadow"
                          aria-label={`More on ${d}`}
                        >
                          +
                        </button>
                      </span>
                    </div>
                  );
                }
                
                const colors: Record<string, { bg: string; edge: string }> = {
                  over: { bg: 'bg-red-50', edge: 'border-red-500' },
                  met: { bg: 'bg-green-50', edge: 'border-green-500' },
                  under: { bg: 'bg-blue-50', edge: 'border-blue-500' },
                  none: { bg: '', edge: 'border-transparent' },
                };
                const c = colors[kind];
                
                return (
                  <div 
                    key={d} 
                    className={`grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2.5 rounded-xl ${c.bg} border-l-4 ${c.edge}`}
                  >
                    <span className="font-bold">{d}</span>
                    <span className="text-right tabular-nums">{logged ? fmt(f) : "–"}</span>
                    <span className="text-right tabular-nums">{logged ? fmt(b) : "–"}</span>
                    <span className="text-right font-bold tabular-nums">{logged ? fmt(f - b) : "–"}</span>
                    <span className="text-right text-xs">
                      {logged && (
                        <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                          kind === 'over' ? 'bg-red-200 text-red-800' :
                          kind === 'met' ? 'bg-green-200 text-green-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {kind === 'over' ? `Over ${fmt((f - b) - dayTarget(d))}` :
                           kind === 'met' ? 'On target' :
                           `Under ${fmt(dayTarget(d) - (f - b))}`}
                        </span>
                      )}
                      {!logged && "–"}
                    </span>
                  </div>
                );
              })}
              <div 
                className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-3 rounded-xl text-white font-bold"
                style={{ background: "linear-gradient(160deg, #1d2029 0%, #0a0b0f 100%)" }}
              >
                <span>Week</span>
                <span className="text-right tabular-nums">{fmt(calc.totalFood)}</span>
                <span className="text-right tabular-nums">{fmt(calc.totalBurn)}</span>
                <span className="text-right tabular-nums">{fmt(calc.totalNet)}</span>
                <span className="text-right text-sm font-normal opacity-70">of {fmt(calc.weekly)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center mt-4 pt-3 border-t border-gray-200">
              {hasShifts && (
                <button
                  onClick={() => setShifts({})}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Even out upcoming days
                </button>
              )}
              <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-red-200 text-red-800 text-xs">Over</span>
              <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-green-200 text-green-800 text-xs">On target</span>
              <span className="inline-block px-2 py-0.5 rounded-full font-medium bg-blue-200 text-blue-800 text-xs">Under</span>
              <span className="text-xs text-gray-500">
                {calc.upcoming.length > 0 ? `Dashed rows are upcoming days sharing the ${fmt(calc.pool)} left this week. Tap − or + to move 100 calories; the other upcoming days balance it out. ` : ""}
                Net compared with that day's target ({fmt(calc.dailyBudget)}, or the held target on a planned day). Within {TOL} counts as on target.
              </span>
            </div>
          </div>
        </div>

        {/* Weigh-ins */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Weigh-ins</h2>
          <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
          <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-xl">
            <span className="block text-xs font-semibold tracking-wider uppercase opacity-80">Latest</span>
            <span className="block text-4xl font-extrabold leading-tight">{weighins.length > 0 ? `${weighins[weighins.length - 1].weight} lbs` : "–"}</span>
          </div>
          <p className="text-sm text-gray-600">
            {weighins.length > 1
              ? `${signed(num(weighins[weighins.length - 1].weight) - num(weighins[0].weight))} lbs since ${prettyDate(weighins[0].date)}. Latest: ${weighins[weighins.length - 1].weight} lbs.`
              : weighins.length === 1
                ? `Starting point: ${weighins[0].weight} lbs on ${prettyDate(weighins[0].date)}. Weigh in once a week, same morning, before eating.`
                : "No weigh-ins yet."}
          </p>
          {weighins.length > 1 && (
            <div className="flex items-end gap-1.5 h-24">
              {(() => {
                const vals = weighins.map((w: WeighIn) => num(w.weight));
                const max = Math.max(...vals);
                const min = Math.min(...vals);
                const span = Math.max(1, max - min);
                return weighins.map((w: WeighIn, i: number) => (
                  <div key={w.date} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full max-w-[40px] bg-gradient-to-b from-purple-500 to-blue-500 rounded-xl shadow-md"
                      style={{ height: `${20 + ((vals[i] - min) / span) * 60}px` }}
                    />
                    <span className="text-xs text-gray-500">{w.weight}</span>
                  </div>
                ));
              })()}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date (YYYY-MM-DD)</label>
              <input
                type="text"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Weight (lbs)</label>
              <input
                type="number"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="e.g. 187"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addWeighin}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Add weigh-in
              </button>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Weight</th>
                  <th className="pb-2">Change</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {weighins.map((w, i) => (
                  <tr key={w.date} className="border-b last:border-0">
                    <td className="py-2">{prettyDate(w.date)}</td>
                    <td className="py-2">{w.weight} lbs</td>
                    <td className="py-2">{i === 0 ? "–" : signed(num(w.weight) - num(weighins[i - 1].weight))}</td>
                    <td className="py-2">{i === 0 ? "–" : signed(num(w.weight) - num(weighins[0].weight))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {weighins.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => removeWeighin(weighins[weighins.length - 1].date)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
              >
                Remove {prettyDate(weighins[weighins.length - 1].date)}
              </button>
            </div>
          )}
          <p className="text-sm text-gray-600">
            The Weight field under "Your details" still sets your calorie budget. Update it there when you want the budget to follow your new weight.
          </p>
        </div>

        {/* Your details */}
        <div className="space-y-3">
          <button
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <h2 className="text-xl font-bold">Your details</h2>
            <span className="text-gray-400">{detailsOpen ? "▼" : "▶"}</span>
          </button>
          {detailsOpen && (
            <>
              <div className="h-1.5 w-18 rounded-full bg-gradient-to-r from-blue-500 to-pink-500"></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
                  <input
                    type="number"
                    value={settings.weight}
                    onChange={e => setField("weight")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
                  <input
                    type="number"
                    value={settings.ft}
                    onChange={e => setField("ft")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height (in)</label>
                  <input
                    type="number"
                    value={settings.inch}
                    onChange={e => setField("inch")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={settings.age}
                    onChange={e => setField("age")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly goal</label>
                  <select
                    value={settings.goal}
                    onChange={e => setField("goal")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0.5">Lose 0.5 lb</option>
                    <option value="1">Lose 1 lb</option>
                    <option value="1.5">Lose 1.5 lbs</option>
                    <option value="2">Lose 2 lbs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily activity (without workouts)</label>
                  <select
                    value={settings.activity}
                    onChange={e => setField("activity")(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1.2">Mostly sitting</option>
                    <option value="1.375">Desk job plus kids</option>
                    <option value="1.55">On my feet a lot</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                You burn about {fmt(calc.bmr)} calories at rest and {fmt(calc.tdee)} on a normal day before workouts. Each pound a week is a 500-calorie daily deficit. These are estimates from the Mifflin-St Jeor formula, so check your weight weekly and adjust the activity level if the scale doesn't match.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
