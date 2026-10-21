"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Maximize2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { saveProject } from "@/lib/db";
import { sectionColor, statusOf } from "@/lib/dates";
import { groupBySection } from "@/lib/group";
import type { Project, ProjectInput } from "@/lib/types";
import { ProgressBar, StatusPill } from "./ui";

const COLS = "grid-cols-[minmax(280px,2.2fr)_120px_150px_136px_136px_136px_minmax(220px,1.6fr)_44px]";

export default function TrackerTable({ projects, onOpen, onAdd }: { projects: Project[]; onOpen: (p: Project) => void; onAdd: (section: string) => void }) {
  const { user } = useAuth();
  const groups = useMemo(() => groupBySection(projects), [projects]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const update = (id: string, patch: ProjectInput) => user && saveProject({ id, ...patch }, user).catch((e) => alert(e.message));

  if (!groups.length)
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <div>
          <p className="font-medium">No projects match.</p>
          <p className="mt-1 text-sm text-ink-400">Try a different search, or add a new project.</p>
        </div>
      </div>
    );

  return (
    <div className="h-full overflow-auto px-5 pb-10 pt-5 md:px-8">
      <div className="min-w-[1130px] overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card">
        <div className={clsx("sticky top-0 z-10 grid items-center border-b border-ink-200/70 bg-ink-50/95 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400 backdrop-blur", COLS)}>
          <div className="pl-2">Project</div><div>Status</div><div>Progress</div><div>Start</div><div>Due</div><div>Released</div><div>Notes</div><div />
        </div>

        {groups.map((g) => {
          const c = sectionColor(g.name);
          const isCollapsed = collapsed[g.name];
          return (
            <section key={g.name}>
              <div className="group/section flex items-center gap-2 border-b border-ink-100 bg-ink-50/60 px-3 py-2">
                <button onClick={() => setCollapsed((s) => ({ ...s, [g.name]: !isCollapsed }))} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-ink-100">
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

              {!isCollapsed &&
                g.items.map((p) => <Row key={p.id} p={p} color={c.fill} update={update} onOpen={onOpen} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Row({ p, color, update, onOpen }: { p: Project; color: string; update: (id: string, patch: ProjectInput) => void; onOpen: (p: Project) => void }) {
  const overdue = statusOf(p) === "overdue";
  return (
    <div className={clsx("group grid items-center border-b border-ink-100 px-3 py-1 last:border-0 hover:bg-brand-50/30", COLS)}>
      <div className="flex items-center gap-1 pr-2">
        <span className="mr-1 h-6 w-1 shrink-0 rounded-full" style={{ background: color }} />
        <TextCell value={p.name} onCommit={(v) => v.trim() && update(p.id, { name: v })} className="font-medium" placeholder="Project name" />
      </div>
      <div><StatusPill status={statusOf(p)} /></div>
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
