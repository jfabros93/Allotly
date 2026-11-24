import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DAYS, DEFAULT_PLAN, DEFAULT_SETTINGS, SEED_LOGS, SEED_WEIGHINS,
  computeWeek, emptyWeek, normalizeLogs, sortWeighins, todayIndex,
  type AppState, type DayLog, type Plan, type Settings, type WeekCalc, type WeighIn,
} from "@/lib/week";
import { num } from "@/lib/format";

const STORE_KEY = "dynamic-calorie-counter-v1";
const PASSCODE_KEY = "allotly-passcode";

export type SyncStatus = "saved" | "syncing" | "offline";

type Store = {
  settings: Settings;
  logs: Record<string, DayLog>;
  weighins: WeighIn[];
  plan: Plan | null;
  shifts: Record<string, number>;
  day: string;
  calc: WeekCalc;
  calPerMile: number;
  syncStatus: SyncStatus;
  showPasscodePrompt: boolean;
  hasShifts: boolean;
  setDay: (d: string) => void;
  setField: (key: keyof Settings, v: string) => void;
  setLog: (d: string, key: keyof DayLog, v: string) => void;
  addTo: (key: keyof DayLog, amount: number) => void;
  clearDay: (d: string) => void;
  startNewWeek: () => void;
  addWeighin: (date: string, weight: string) => boolean;
  removeWeighin: (date: string) => void;
  setPlan: (p: Plan | null) => void;
  nudge: (d: string, delta: number) => void;
  evenOut: () => void;
  submitPasscode: (code: string) => void;
  continueOffline: () => void;
};

const Ctx = createContext<Store | null>(null);

export function useAllotly(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useAllotly must be used inside <AllotlyProvider>");
  return s;
}

export function AllotlyProvider({ children }: { children: ReactNode }) {
  // Defaults (including demo data) only show on a first-ever run with nothing saved.
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<Record<string, DayLog>>(SEED_LOGS);
  const [weighins, setWeighins] = useState<WeighIn[]>(SEED_WEIGHINS);
  const [plan, setPlan] = useState<Plan | null>(DEFAULT_PLAN);
  const [shifts, setShifts] = useState<Record<string, number>>({});
  const [day, setDay] = useState<string>(DAYS[todayIndex()]);
  const [loaded, setLoaded] = useState(false);
  const [showPasscodePrompt, setShowPasscodePrompt] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("saved");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<AppState>({ settings, logs, weighins, plan, shifts });
  stateRef.current = { settings, logs, weighins, plan, shifts };

  const applyState = (s: Partial<AppState>) => {
    if (s.settings) setSettings(s.settings);
    if (s.logs) setLogs(normalizeLogs(s.logs));
    if (s.weighins) setWeighins(sortWeighins(s.weighins));
    if (s.plan !== undefined) setPlan(s.plan);
    if (s.shifts) setShifts(s.shifts);
  };

  // Load from localStorage first
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) applyState(JSON.parse(raw) as Partial<AppState>);
    } catch {
      // storage unavailable
    }
    setLoaded(true);
  }, []);

  const saveToServer = useCallback(async (state: AppState, passcode: string) => {
    try {
      const response = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Allotly-Passcode": passcode },
        body: JSON.stringify(state),
      });
      if (response.status === 401) {
        window.localStorage.removeItem(PASSCODE_KEY);
        setShowPasscodePrompt(true);
        setSyncStatus("offline");
        return;
      }
      setSyncStatus(response.ok ? "saved" : "offline");
    } catch {
      setSyncStatus("offline");
    }
  }, []);

  // Then fetch from the server
  useEffect(() => {
    if (!loaded) return;
    const run = async () => {
      const passcode = window.localStorage.getItem(PASSCODE_KEY);
      if (!passcode) { setShowPasscodePrompt(true); return; }
      try {
        const response = await fetch("/api/data", { headers: { "X-Allotly-Passcode": passcode } });
        if (response.status === 401) {
          window.localStorage.removeItem(PASSCODE_KEY);
          setShowPasscodePrompt(true);
          return;
        }
        if (!response.ok) { setSyncStatus("offline"); return; }
        const serverData = (await response.json()) as Partial<AppState>;
        if (serverData.settings) {
          applyState(serverData);
          window.localStorage.setItem(STORE_KEY, JSON.stringify(serverData));
        } else {
          await saveToServer(stateRef.current, passcode);
        }
        setSyncStatus("saved");
      } catch {
        setSyncStatus("offline");
      }
    };
    run();
  }, [loaded, saveToServer]);

  // Save to localStorage and (debounced) to the server on every change
  useEffect(() => {
    if (!loaded) return;
    const state: AppState = { settings, logs, weighins, plan, shifts };
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable
    }
    const passcode = window.localStorage.getItem(PASSCODE_KEY);
    if (!passcode) return;
    setSyncStatus("syncing");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToServer(state, passcode), 1000);
  }, [settings, logs, weighins, plan, shifts, loaded, saveToServer]);

  const calc = useMemo(
    () => computeWeek({ settings, logs, plan, shifts, todayIdx: todayIndex() }),
    [settings, logs, plan, shifts],
  );

  const setLog = (d: string, key: keyof DayLog, v: string) =>
    setLogs((prev) => ({ ...prev, [d]: { ...prev[d], [key]: v } }));

  const nudge = (d: string, delta: number) => {
    const others = calc.upcoming.filter((x) => x !== d);
    if (others.length === 0) return;
    const next: Record<string, number> = {};
    calc.upcoming.forEach((x) => { next[x] = shifts[x] || 0; });
    next[d] += delta;
    others.forEach((x) => { next[x] -= delta / others.length; });
    setShifts(next);
  };

  const store: Store = {
    settings, logs, weighins, plan, shifts, day, calc,
    calPerMile: num(settings.weight) * 0.72,
    syncStatus, showPasscodePrompt,
    hasShifts: calc.upcoming.some((d) => Math.abs(shifts[d] || 0) > 0.5),
    setDay,
    setField: (key, v) => setSettings((s) => ({ ...s, [key]: v })),
    setLog,
    addTo: (key, amount) => setLog(day, key, String(num(logs[day][key]) + amount)),
    clearDay: (d) => setLogs((prev) => ({ ...prev, [d]: { food: "", burn: "" } })),
    startNewWeek: () => {
      if (!window.confirm("Start a new week? This clears every day's food and exercise and removes your plan.")) return;
      setLogs(emptyWeek());
      setPlan(null);
      setShifts({});
    },
    addWeighin: (date, weight) => {
      if (num(weight) <= 0 || date === "") return false;
      setWeighins((prev) => sortWeighins([...prev.filter((w) => w.date !== date), { date, weight }]));
      return true;
    },
    removeWeighin: (date) => setWeighins((prev) => prev.filter((w) => w.date !== date)),
    setPlan,
    nudge,
    evenOut: () => setShifts({}),
    submitPasscode: (code) => {
      if (!code.trim()) return;
      window.localStorage.setItem(PASSCODE_KEY, code);
      setShowPasscodePrompt(false);
      window.location.reload();
    },
    continueOffline: () => { setShowPasscodePrompt(false); setSyncStatus("offline"); },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
