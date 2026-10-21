"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronDown, Diamond, Link2, Maximize2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { saveProject } from "@/lib/db";
import { depsOf } from "@/lib/deps";
import { assigneesOf, isOverdue, PRIORITY_META, priorityOf, sectionColor, STATUS_META, statusOf } from "@/lib/dates";
import { groupBySection } from "@/lib/group";
import { PRIORITIES, STATUSES, type Priority, type Project, type ProjectInput, type Status } from "@/lib/types";
import { ProgressBar } from "./ui";
import { AssigneeCell } from "./AssigneePicker";

const COLS = "grid-cols-[minmax(280px,2.2fr)_150px_104px_120px_150px_136px_136px_136px_minmax(220px,1.6fr)_44px]";

type SortKey = "name" | "assignee" | "priority" | "status" | "progress" | "start" | "due" | "release";
type Sort = { key: SortKey; dir: 1 | -1 } | null;

const sortValue = (p: Project, key: SortKey): string | number => {
  switch (key) {
    case "name": return p.name.toLowerCase();
    case "assignee": return assigneesOf(p)[0] ?? "~";
    case "priority": return PRIORITIES.indexOf(priorityOf(p));
    case "status": return STATUSES.indexOf(statusOf(p));
    case "progress": return p.progress;
    default: return p[key] || "9999-99-99"; // undated rows sort last when ascending
  }
};

export default function TrackerTable({ projects, all, onOpen, onAdd }: { projects: Project[]; all: Project[]; onOpen: (p: Project) => void; onAdd: (section: string) => void }) {
  const { user } = useAuth();
  const [sort, setSort] = useState<Sort>(null);
  const groups = useMemo(() => groupBySection(projects), [projects]);
  const sorted = useMemo(() => {
    if (!sort) return null;
    return [...projects].sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [projects, sort]);
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const update = (id: string, patch: ProjectInput) => user && saveProject({ id, ...patch }, user).catch((e) => alert(e.message));

  // click: ascending → descending → back to grouped by section
  const toggleSort = (key: SortKey) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));

  if (!groups.length)
    return (
      <div className="grid place-items-center p-12 text-center">
        <div>
          <p className="font-medium">No projects match.</p>
          <p className="mt-1 text-sm text-ink-400">Try different filters, or add a new project.</p>
        </div>
      </div>
    );

  const heads: [string, SortKey | null][] = [["Project", "name"], ["Assignee", "assignee"], ["Priority", "priority"], ["Status", "status"], ["Progress", "progress"], ["Start", "start"], ["Due", "due"], ["Released", "release"], ["Notes", null]];

  return (
    <div className="min-w-[1340px] overflow-clip rounded-2xl border border-ink-200/70 bg-white shadow-card">
      <div className={clsx("grid items-center border-b border-ink-200/70 bg-ink-50/95 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400", COLS)}>
        {heads.map(([label, key], i) =>
          key ? (
            <button key={label} onClick={() => toggleSort(key)} className={clsx("flex items-center gap-1 text-left uppercase tracking-wider hover:text-ink-700", i === 0 && "pl-2", sort?.key === key && "text-brand-700")} title="Click to sort">
              {label}
              {sort?.key === key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
            </button>
          ) : (
            <div key={label}>{label}</div>
          ),
        )}
        <div />
      </div>

      {sorted ? (
        sorted.map((p) => <Row key={p.id} p={p} byId={byId} color={sectionColor(p.section || "General").fill} update={update} onOpen={onOpen} />)
      ) : (
        groups.map((g) => {
          const c = sectionColor(g.name);
          const isCollapsed = collapsed[g.name];
          return (
            <section key={g.name}>
              <div className="group/section flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-3 py-2">
                <button onClick={() => setCollapsed((st) => ({ ...st, [g.name]: !isCollapsed }))} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-ink-100">
                  <ChevronDown className={clsx("h-4 w-4 text-ink-400 transition", isCollapsed && "-rotate-90")} />
                  <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: c.base, color: c.text }}>{g.name}</span>
                </button>
                <span className="text-xs text-ink-400">{g.items.length}</span>
                <div className="ml-2 hidden w-28 items-center gap-2 sm:flex">
                  <ProgressBar value={g.avg} color={c.fill} className="flex-1" />
                  <span className="text-[11px] tabular-nums text-ink-400">{g.avg}%</span>
                </div>
                <button onClick={() => onAdd(g.name)} className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 opacity-0 transition hover:bg-brand-50 group-hover/section:opacity-100 focus:opacity-100">
                  <Plus className="h-3.5 w-3.5" /> Add project
                </button>
              </div>

              {!isCollapsed && g.items.map((p) => <Row key={p.id} p={p} byId={byId} color={c.fill} update={update} onOpen={onOpen} />)}
            </section>
          );
        })
      )}
    </div>
  );
}

function Row({ p, byId, color, update, onOpen }: { p: Project; byId: Map<string, Project>; color: string; update: (id: string, patch: ProjectInput) => void; onOpen: (p: Project) => void }) {
  const overdue = isOverdue(p);
  const deps = depsOf(p, byId).map((id) => byId.get(id)!);
  const waiting = deps.filter((d) => statusOf(d) !== "Done");
  return (
    <div className={clsx("group grid items-center border-b border-ink-100 px-3 py-1 last:border-0 hover:bg-brand-50/30", COLS)}>
      <div className="flex items-center gap-1 pr-2">
        <span className="mr-1 h-6 w-1 shrink-0 rounded-full" style={{ background: color }} />
        {p.milestone && <Diamond className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" aria-label="Milestone" />}
        <TextCell value={p.name} onCommit={(v) => v.trim() && update(p.id, { name: v })} className="font-medium" placeholder="Project name" />
        {deps.length > 0 && (
          <span
            title={`Depends on:\n${deps.map((d) => `${statusOf(d) === "Done" ? "✓" : "•"} ${d.name}`).join("\n")}`}
            className={clsx("flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", waiting.length ? "bg-amber-50 text-amber-700" : "bg-ink-100 text-ink-500")}
          >
            <Link2 className="h-3 w-3" />{deps.length}
          </span>
        )}
      </div>
      <div className="pr-2">
        <AssigneeCell value={assigneesOf(p)} onChange={(v) => update(p.id, { assignees: v })} />
      </div>
      <div className="pr-2"><PrioritySelect value={priorityOf(p)} onChange={(v) => update(p.id, { priority: v })} /></div>
      <div className="pr-2"><StatusSelect value={statusOf(p)} onChange={(v) => update(p.id, { status: v })} /></div>
      <div className="flex items-center gap-2 pr-3">
        <ProgressBar value={p.progress} color={color} className="flex-1" />
        <NumCell value={p.progress} onCommit={(v) => update(p.id, { progress: v })} />
      </div>
      <DateCell value={p.start} onCommit={(v) => update(p.id, { start: v })} />
      <DateCell value={p.due} onCommit={(v) => update(p.id, { due: v })} danger={overdue} />
      <DateCell value={p.release} onCommit={(v) => update(p.id, { release: v })} />
      <TextCell value={p.notes} onCommit={(v) => update(p.id, { notes: v })} placeholder="Add a note…" className="text-ink-500" />
      <button onClick={() => onOpen(p)} title="Open details" className="rounded-md p-1.5 text-ink-300 opacity-0 transition hover:bg-ink-100 hover:text-ink-700 group-hover:opacity-100">
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  const m = PRIORITY_META[value];
  return (
    <label className={clsx("relative inline-flex items-center rounded-full text-xs font-medium", m.pill)}>
      <span className={clsx("pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full", m.dot)} />
      <select value={value} onChange={(e) => onChange(e.target.value as Priority)} className="cursor-pointer appearance-none rounded-full bg-transparent py-0.5 pl-6 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-200">
        {PRIORITIES.map((x) => <option key={x} value={x} className="text-ink-900">{x}</option>)}
      </select>
    </label>
  );
}

/** Local draft; commits on blur / Enter so we don't write to the database on every keystroke. */
function useDraft<T>(value: T) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft] as const;
}

function TextCell({ value, onCommit, className, placeholder }: { value: string; onCommit: (v: string) => void; className?: string; placeholder?: string }) {
  const [draft, setDraft] = useDraft(value);
  const commit = () => (draft !== value ? onCommit(draft) : undefined);
  return (
    <input
      className={clsx("cell-input", className)}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function NumCell({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useDraft(String(value));
  return (
    <div className="relative w-14 shrink-0">
      <input
        className="cell-input !pr-5 text-right tabular-nums"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={() => {
          const n = Math.min(100, Number(draft) || 0);
          setDraft(String(n));
          if (n !== value) onCommit(n);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-300">%</span>
    </div>
  );
}

function DateCell({ value, onCommit, danger }: { value: string; onCommit: (v: string) => void; danger?: boolean }) {
  return (
    <div className="pr-2">
      <input
        type="date"
        className={clsx("cell-input tabular-nums", danger && "!text-rose-600", !value && "text-ink-300")}
        value={value}
        onChange={(e) => e.target.value !== value && onCommit(e.target.value)}
      />
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  const m = STATUS_META[value];
  return (
    <label className={clsx("relative inline-flex items-center rounded-full text-xs font-medium", m.pill)}>
      <span className={clsx("pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full", m.dot)} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
        className="cursor-pointer appearance-none rounded-full bg-transparent py-0.5 pl-6 pr-3 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-200"
      >
        {STATUSES.map((s) => <option key={s} value={s} className="text-ink-900">{s}</option>)}
      </select>
    </label>
  );
}
