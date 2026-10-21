import { differenceInCalendarDays, format, isValid, parseISO, startOfToday } from "date-fns";
import type { Project } from "./types";

export const parseDate = (s: string) => {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
};

export const fmt = (s: string, pattern = "MMM d, yyyy") => {
  const d = parseDate(s);
  return d ? format(d, pattern) : "";
};

export type Status = "planned" | "active" | "done" | "overdue";

export const statusOf = (p: Project): Status => {
  if (p.progress >= 100) return "done";
  const due = parseDate(p.due);
  const start = parseDate(p.start);
  const today = startOfToday();
  if (due && differenceInCalendarDays(due, today) < 0) return "overdue";
  if (p.progress <= 0 && start && differenceInCalendarDays(start, today) > 0) return "planned";
  return "active";
};

export const STATUS_META: Record<Status, { label: string; dot: string; pill: string }> = {
  planned: { label: "Planned", dot: "bg-ink-300", pill: "bg-ink-100 text-ink-500" },
  active: { label: "In progress", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700" },
  done: { label: "Done", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
  overdue: { label: "Overdue", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700" },
};

export const SECTION_PALETTE = [
  { base: "#E9E3FF", fill: "#7C5CFA", text: "#4a2aac" },
  { base: "#FFE8CC", fill: "#FF9F1C", text: "#8a4b00" },
  { base: "#D6E4FF", fill: "#3B6CF6", text: "#1b3fa3" },
  { base: "#D3F5E3", fill: "#22B573", text: "#0b6b42" },
  { base: "#FFD9EE", fill: "#E0489E", text: "#8f1f60" },
  { base: "#CDF3F4", fill: "#1FB5BD", text: "#0b6a70" },
  { base: "#FFDAD6", fill: "#F25C54", text: "#9c2620" },
];

export const sectionColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SECTION_PALETTE[h % SECTION_PALETTE.length];
};
