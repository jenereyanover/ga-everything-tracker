import { differenceInCalendarDays, format, isValid, parseISO, startOfToday } from "date-fns";
import { ASSIGNEES, STATUSES, type Assignee, type Project, type Status } from "./types";

export const parseDate = (s: string) => {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
};

export const fmt = (s: string, pattern = "MMM d, yyyy") => {
  const d = parseDate(s);
  return d ? format(d, pattern) : "";
};

/** Assignees, including projects saved with the older single `assignee` field. */
export const assigneesOf = (p: Project): Assignee[] =>
  Array.isArray(p.assignees) ? p.assignees : p.assignee && (ASSIGNEES as readonly string[]).includes(p.assignee) ? [p.assignee as Assignee] : [];

/** Stored status; projects saved before the field existed fall back to a guess from progress. */
export const statusOf = (p: Project): Status =>
  p.status && STATUSES.includes(p.status) ? p.status : p.progress >= 100 ? "Done" : p.progress > 0 ? "Started" : "Not Started";

export const isOverdue = (p: Project) => {
  const due = parseDate(p.due);
  return statusOf(p) !== "Done" && !!due && differenceInCalendarDays(due, startOfToday()) < 0;
};

export const STATUS_META: Record<Status, { dot: string; pill: string }> = {
  "Not Started": { dot: "bg-ink-300", pill: "bg-ink-100 text-ink-500" },
  Started: { dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700" },
  Blocked: { dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700" },
  "At Risk": { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700" },
  Done: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700" },
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
