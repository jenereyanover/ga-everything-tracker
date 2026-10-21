import { differenceInCalendarDays, startOfToday } from "date-fns";
import { assigneesOf, parseDate, statusOf } from "./dates";
import { depsOf } from "./deps";
import { ASSIGNEES, type Assignee, type Project } from "./types";

export type ReasonKind = "overdue" | "blocked" | "atRisk" | "waiting" | "clash" | "behind";
export type Reason = { kind: ReasonKind; label: string; severity: number };

/** Longer tasks count for more in percentages. Tasks without dates count as one day. */
export const weightOf = (p: Project) => {
  const s = parseDate(p.start);
  const e = parseDate(p.due);
  return s && e ? Math.max(1, differenceInCalendarDays(e, s) + 1) : 1;
};

export const effectiveProgress = (p: Project) => (statusOf(p) === "Done" ? 100 : p.progress);

export function weightedProgress(list: Project[]): number {
  const total = list.reduce((n, p) => n + weightOf(p), 0);
  if (!total) return 0;
  return Math.round(list.reduce((n, p) => n + effectiveProgress(p) * weightOf(p), 0) / total);
}

/** A task that starts before a dependency (still unfinished) is due to finish. Shared by the table, insights and timeline. */
export const hasClash = (p: Project, dep: Project) => {
  const start = parseDate(p.start);
  const depDue = parseDate(dep.due);
  return statusOf(dep) !== "Done" && !!start && !!depDue && differenceInCalendarDays(start, depDue) < 0;
};

export function attentionReasons(p: Project, byId: Map<string, Project>, today = startOfToday()): Reason[] {
  const status = statusOf(p);
  if (status === "Done") return [];
  const out: Reason[] = [];
  const start = parseDate(p.start);
  const due = parseDate(p.due);

  if (due && differenceInCalendarDays(due, today) < 0) {
    const n = differenceInCalendarDays(today, due);
    out.push({ kind: "overdue", label: `Overdue by ${n} day${n === 1 ? "" : "s"}`, severity: 5 });
  }
  if (status === "Blocked") out.push({ kind: "blocked", label: "Blocked", severity: 4 });
  if (status === "At Risk") out.push({ kind: "atRisk", label: "Marked at risk", severity: 2 });

  const deps = depsOf(p, byId).map((id) => byId.get(id)!);
  const unfinished = deps.filter((d) => statusOf(d) !== "Done");
  const clashes = deps.filter((d) => hasClash(p, d));
  if (clashes.length) out.push({ kind: "clash", label: `Date clash with ${clashes.map((d) => d.name).slice(0, 2).join(", ")}`, severity: 3 });
  if (unfinished.length && (status !== "Not Started" || (start && differenceInCalendarDays(start, today) <= 0)))
    out.push({ kind: "waiting", label: `Waiting on ${unfinished.map((d) => d.name).slice(0, 2).join(", ")}${unfinished.length > 2 ? ` +${unfinished.length - 2}` : ""}`, severity: 2 });

  if (start && due && !out.some((r) => r.kind === "overdue")) {
    const dur = differenceInCalendarDays(due, start) + 1;
    const elapsed = Math.min(dur, Math.max(0, differenceInCalendarDays(today, start)));
    const expected = Math.round((elapsed / dur) * 100);
    if (expected - p.progress >= 25) out.push({ kind: "behind", label: `Behind: ${p.progress}% done, ~${expected}% expected`, severity: 1 });
  }
  return out.sort((a, b) => b.severity - a.severity);
}

export const attentionScore = (reasons: Reason[]) => reasons.reduce((n, r) => n + r.severity, 0);

export function dueSoon(list: Project[], days = 14, today = startOfToday()): Project[] {
  return list
    .filter((p) => {
      const due = parseDate(p.due);
      return statusOf(p) !== "Done" && !!due && differenceInCalendarDays(due, today) >= 0 && differenceInCalendarDays(due, today) <= days;
    })
    .sort((a, b) => a.due.localeCompare(b.due));
}

export type DeptStats = { name: Assignee; count: number; progress: number; overdue: number; blocked: number; behind: number };

/** One card per assignee team; a task with several assignees counts for each. */
export function deptStats(list: Project[], byId: Map<string, Project>): DeptStats[] {
  return ASSIGNEES.map((name) => {
    const mine = list.filter((p) => assigneesOf(p).includes(name));
    const reasons = mine.map((p) => attentionReasons(p, byId));
    return {
      name,
      count: mine.length,
      progress: weightedProgress(mine),
      overdue: reasons.filter((r) => r.some((x) => x.kind === "overdue")).length,
      blocked: reasons.filter((r) => r.some((x) => x.kind === "blocked")).length,
      behind: reasons.filter((r) => r.some((x) => x.kind === "behind")).length,
    };
  })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}
