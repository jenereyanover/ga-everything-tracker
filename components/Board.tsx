"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, CalendarDays, Diamond, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { saveProject } from "@/lib/db";
import { assigneesOf, fmt, isOverdue, PRIORITY_META, priorityOf, sectionColor, STATUS_META, statusOf } from "@/lib/dates";
import { depsOf } from "@/lib/deps";
import { attentionReasons } from "@/lib/insights";
import { STATUSES, type Project, type Status } from "@/lib/types";
import { AssigneeTags } from "./AssigneePicker";
import { ProgressBar } from "./ui";

/** Status columns; drag a card to another column to change its status. */
export default function Board({ projects, all, onOpen }: { projects: Project[]; all: Project[]; onOpen: (p: Project) => void }) {
  const { user } = useAuth();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  const columns = useMemo(
    () => STATUSES.map((s) => ({ status: s, items: projects.filter((p) => statusOf(p) === s).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")) })),
    [projects],
  );

  const drop = (status: Status) => {
    const p = dragId ? byId.get(dragId) : null;
    setDragId(null);
    setOver(null);
    if (p && user && statusOf(p) !== status) saveProject({ id: p.id, status }, user).catch((e) => alert(e.message));
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map(({ status, items }) => {
        const m = STATUS_META[status];
        return (
          <section
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => { e.preventDefault(); drop(status); }}
            className={clsx("flex w-72 shrink-0 flex-col rounded-2xl border bg-ink-50/70 p-2.5 transition", over === status ? "border-brand-400 bg-brand-50/60" : "border-ink-200/70")}
          >
            <header className="mb-2 flex items-center gap-2 px-1.5 pt-1">
              <span className={clsx("h-2 w-2 rounded-full", m.dot)} />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-500">{status}</h3>
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-500">{items.length}</span>
            </header>
            <div className="flex min-h-[80px] flex-col gap-2">
              {items.map((p) => (
                <Card key={p.id} p={p} byId={byId} dragging={dragId === p.id} onDragStart={() => setDragId(p.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onOpen={onOpen} />
              ))}
              {!items.length && <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-ink-200 py-6 text-xs text-ink-300">Drop here</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ p, byId, dragging, onDragStart, onDragEnd, onOpen }: { p: Project; byId: Map<string, Project>; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onOpen: (p: Project) => void }) {
  const c = sectionColor(p.section || "General");
  const prio = priorityOf(p);
  const reasons = attentionReasons(p, byId);
  const deps = depsOf(p, byId);
  return (
    <article
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", p.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(p)}
      className={clsx("cursor-grab rounded-xl border border-ink-200/70 bg-white p-3 shadow-sm transition hover:shadow-card active:cursor-grabbing", dragging && "opacity-40")}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: c.base, color: c.text }}>{p.section || "General"}</span>
        <span className={clsx("ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_META[prio].pill)}>{prio}</span>
      </div>
      <div className="mb-2 flex items-start gap-1.5 text-[13px] font-medium leading-snug">
        {p.milestone && <Diamond className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
        <span className="line-clamp-3">{p.name}</span>
      </div>
      <ProgressBar value={p.progress} color={c.fill} />
      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-ink-400">
        <span className="tabular-nums">{p.progress}%</span>
        {p.due && (
          <span className={clsx("flex items-center gap-1", isOverdue(p) && "font-medium text-rose-600")}>
            <CalendarDays className="h-3 w-3" />{fmt(p.due, "MMM d")}
          </span>
        )}
        {deps.length > 0 && <span className="flex items-center gap-1"><Link2 className="h-3 w-3" />{deps.length}</span>}
        {reasons.length > 0 && <span title={reasons.map((r) => r.label).join("\n")} className="text-amber-500"><AlertTriangle className="h-3.5 w-3.5" /></span>}
        <span className="ml-auto"><AssigneeTags value={assigneesOf(p)} max={2} /></span>
      </div>
    </article>
  );
}
