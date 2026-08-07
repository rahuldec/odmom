import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

function toDate(value: string): Date | null {
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** "12 Mar 2026" — unambiguous for an India-based team, no locale surprises. */
export function formatDay(value: string): string {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy") : value;
}

/** "Today" / "Yesterday" / "4 days ago" / "12 Mar" — the scanning line. */
export function relativeDay(value: string): string {
  const d = toDate(value);
  if (!d) return value;
  const diff = differenceInCalendarDays(new Date(), d);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  if (diff < 0) return `In ${Math.abs(diff)} day${diff === -1 ? "" : "s"}`;
  return format(d, "d MMM");
}

export function monthLabel(value: string): string {
  const d = toDate(value);
  return d ? format(d, "MMMM yyyy") : "Undated";
}

export function monthKey(value: string): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM") : "0000-00";
}

/** "3 pending" / "1 pending" — no stray plurals in the UI. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
