import { useAllotly } from "@/state/allotly-store";
import { fmt } from "@/lib/format";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { inputCls } from "@/components/brand";
import type { Settings } from "@/lib/week";

const FIELDS: { key: keyof Settings; label: string }[] = [
  { key: "weight", label: "Weight (lbs)" },
  { key: "ft", label: "Height (ft)" },
  { key: "inch", label: "Height (in)" },
  { key: "age", label: "Age" },
];

export const goalLabel = (g: string) => `Lose ${g} ${g === "0.5" || g === "1" ? "lb" : "lbs"}/wk`;

/** "Your details": the settings that drive the calorie budget. */
export function DetailsSheet({ open, onOpenChange, side = "right" }: { open: boolean; onOpenChange: (o: boolean) => void; side?: "right" | "bottom" }) {
  const { settings, setField, calc } = useAllotly();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="max-h-[90dvh] overflow-y-auto font-sans">
        <SheetHeader>
          <SheetTitle>Your details</SheetTitle>
          <SheetDescription>These set your weekly calorie budget.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-xs text-[#475569]">
                {f.label}
                <input className={inputCls} inputMode="decimal" value={settings[f.key]} onChange={(e) => setField(f.key, e.target.value)} />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-[#475569]">
              Weekly goal
              <select className={inputCls} value={settings.goal} onChange={(e) => setField("goal", e.target.value)}>
                <option value="0.5">Lose 0.5 lb</option>
                <option value="1">Lose 1 lb</option>
                <option value="1.5">Lose 1.5 lbs</option>
                <option value="2">Lose 2 lbs</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[#475569]">
              Daily activity (without workouts)
              <select className={inputCls} value={settings.activity} onChange={(e) => setField("activity", e.target.value)}>
                <option value="1.2">Mostly sitting</option>
                <option value="1.375">Desk job plus kids</option>
                <option value="1.55">On my feet a lot</option>
              </select>
            </label>
          </div>
          <p className="m-0 text-[13px] leading-normal text-[#475569]">
            You burn about {fmt(calc.bmr)} calories at rest and {fmt(calc.tdee)} on a normal day before workouts. Each pound a week is a 500-calorie daily deficit. These are estimates from the Mifflin-St Jeor formula, so check your weight weekly and adjust the activity level if the scale doesn't match.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
