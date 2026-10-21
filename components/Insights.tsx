"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { differenceInCalendarDays, startOfToday } from "date-fns";
import { AlertTriangle, CalendarClock, ChevronDown } from "lucide-react";
import { assigneesOf, fmt, parseDate, statusOf } from "@/lib/dates";
import { attentionReasons, attentionScore, deptStats, dueSoon, weightedProgress, type ReasonKind } from "@/lib/insights";
import type { Assignee, Project } from "@/lib/types";
import { AssigneeTags } from "./AssigneePicker";
import { ProgressBar, Ring } from "./ui";

const REASON_STYLE: Record<ReasonKind, string> = {
  overdue: "bg-rose-50 text-rose-700",
  blocked: "bg-rose-50 text-rose-700",
  clash: "bg-orange-50 text-orange-700",
  waiting: "bg-amber-50 text-amber-700",
  atRisk: "bg-amber-50 text-amber-700",
  behind: "bg-blue-50 text-blue-700",
};

const LIST_LIMIT = 6;

export default function Insights({ projects, all, assigneeFilter, onPickAssignee, onOpen }: {
  projects: Project[];
  all: Project[];
  assigneeFilter: string;
  onPickAssignee: (a: string) => void;
  onOpen: (p: Project) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showAllDue, setShowAllDue] = useState(false);
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  const overall = useMemo(() => weightedProgress(projects), [projects]);
  const depts = useMemo(() => deptStats(projects, byId), [projects, byId]);
  const attention = useMemo(
    () =>
      projects
        .map((p) => ({ p, reasons: attentionReasons(p, byId) }))
        .filter((x) => x.reasons.length)
        .sort((a, b) => attentionScore(b.reasons) - attentionScore(a.reasons)),
    [projects, byId],
  );
  const upcoming = useMemo(() => dueSoon(projects, 14), [projects]);
  const counts = useMemo(() => {
    const c = { done: 0, active: 0, blocked: 0, overdue: 0 };
    projects.forEach((p) => {
      const s = statusOf(p);
      if (s === "Done") c.done++;
      else if (s === "Started") c.active++;
      if (s === "Blocked") c.blocked++;
    });
    c.overdue = attention.filter((a) => a.reasons.some((r) => r.kind === "overdue")).length;
    return c;
  }, [projects, attention]);

  const today = startOfToday();

  return (
    <section className="mb-6">
      <button onClick={() => setCollapsed((c) => !c)} className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400 hover:text-ink-700">
        <ChevronDown className={clsx("h-4 w-4 transition", collapsed && "-rotate-90")} /> Summary
      </button>
      {!collapsed && (
        <div className="space-y-4">
          {/* progress cards */}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
            <div className="flex items-center gap-4 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
              <Ring value={overall} size={64} stroke={7}>{overall}%</Ring>
              <div className="min-w-0 text-xs leading-5 text-ink-500">
                <div className="text-sm font-semibold text-ink-900">Overall progress</div>
                {projects.length} tasks · {counts.done} done
                <div>
                  <span className={counts.overdue ? "font-medium text-rose-600" : ""}>{counts.overdue} overdue</span> · <span className={counts.blocked ? "font-medium text-rose-600" : ""}>{counts.blocked} blocked</span>
                </div>
              </div>
            </div>
            {depts.map((d) => {
              const active = assigneeFilter === d.name;
              return (
                <button
                  key={d.name}
                  onClick={() => onPickAssignee(active ? "all" : d.name)}
                  className={clsx("rounded-2xl border bg-white p-4 text-left shadow-card transition hover:border-brand-300", active ? "border-brand-400 ring-2 ring-brand-100" : "border-ink-200/70")}
                  title={active ? "Click to clear filter" : `Filter by ${d.name}`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold tracking-wide text-ink-700">{d.name}</span>
                    <span className="text-lg font-semibold tabular-nums">{d.progress}%</span>
                  </div>
                  <ProgressBar value={d.progress} className="mt-2" color={d.overdue || d.blocked ? "#f25c54" : "#7C5CFA"} />
                  <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                    <span>{d.count} task{d.count === 1 ? "" : "s"}</span>
                    {d.overdue > 0 && <span className="font-medium text-rose-600">{d.overdue} overdue</span>}
                    {d.blocked > 0 && <span className="font-medium text-rose-600">{d.blocked} blocked</span>}
                    {d.behind > 0 && <span className="font-medium text-blue-600">{d.behind} behind</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            {/* needs attention */}
            <div className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs attention
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{attention.length}</span>
              </div>
              {attention.length === 0 ? (
                <p className="py-4 text-sm text-ink-400">Nothing flagged. Everything is on track.</p>
              ) : (
                <>
                  <ul className="divide-y divide-ink-100">
                    {(showAllAttention ? attention : attention.slice(0, LIST_LIMIT)).map(({ p, reasons }) => (
                      <li key={p.id}>
                        <button onClick={() => onOpen(p)} className="flex w-full flex-col gap-1.5 py-2.5 text-left hover:bg-ink-50/60 sm:flex-row sm:items-center sm:gap-3">
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate text-[13px] font-medium">{p.name}</span>
                            <AssigneeTags value={assigneesOf(p)} max={2} />
                          </span>
                          <span className="flex flex-wrap gap-1.5">
                            {reasons.slice(0, 3).map((r) => (
                              <span key={r.kind} className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", REASON_STYLE[r.kind])}>{r.label}</span>
                            ))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {attention.length > LIST_LIMIT && (
                    <button onClick={() => setShowAllAttention((v) => !v)} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
                      {showAllAttention ? "Show fewer" : `Show all ${attention.length}`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* due soon */}
            <div className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-brand-500" /> Due in the next 14 days
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{upcoming.length}</span>
              </div>
              {upcoming.length === 0 ? (
                <p className="py-4 text-sm text-ink-400">No deadlines in the next two weeks.</p>
              ) : (
                <>
                  <ul className="divide-y divide-ink-100">
                    {(showAllDue ? upcoming : upcoming.slice(0, LIST_LIMIT)).map((p) => {
                      const n = differenceInCalendarDays(parseDate(p.due)!, today);
                      return (
                        <li key={p.id}>
                          <button onClick={() => onOpen(p)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-ink-50/60">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                            <span className="shrink-0 text-xs text-ink-400">{fmt(p.due, "MMM d")}</span>
                            <span className={clsx("w-16 shrink-0 text-right text-[11px] font-medium", n <= 3 ? "text-rose-600" : "text-ink-500")}>{n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {upcoming.length > LIST_LIMIT && (
                    <button onClick={() => setShowAllDue((v) => !v)} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
                      {showAllDue ? "Show fewer" : `Show all ${upcoming.length}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
