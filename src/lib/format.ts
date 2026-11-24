export const num = (s: string): number => {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const fmt = (n: number): string => Math.round(n).toLocaleString("en-US");

export const signed = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const parseDate = (s: string): Date | null => {
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
};

/** "Fri, Nov 13" */
export const shortDate = (s: string): string => {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : s;
};

export const todayStr = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
};

/** "Week of Nov 23" for the Monday of the current week */
export const weekOfLabel = (now: Date = new Date()): string => {
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
};

/** ["Mon","Tue","Wed","Thu","Fri","Sun"] -> "Mon–Fri, Sun" (runs of 3+ collapse to a range) */
export const dayRange = (days: string[], order: string[]): string => {
  const idx = days.map((d) => order.indexOf(d)).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++;
    if (j - i >= 2) parts.push(`${order[idx[i]]}–${order[idx[j]]}`);
    else for (let k = i; k <= j; k++) parts.push(order[idx[k]]);
    i = j + 1;
  }
  return parts.join(", ");
};
