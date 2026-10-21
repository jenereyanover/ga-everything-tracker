"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { GanttChartSquare, ListChecks, LogOut, Plus, Search, TableProperties } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { subscribeProjects } from "@/lib/db";
import { statusOf } from "@/lib/dates";
import type { Project } from "@/lib/types";
import Avatar from "./Avatar";
import { Ring } from "./ui";
import TrackerTable from "./TrackerTable";
import Gantt from "./Gantt";
import ProjectDrawer, { type DrawerState } from "./ProjectDrawer";

type Tab = "tracker" | "timeline";

export default function Workspace() {
  const { user, signOut, demo } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("tracker");
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<DrawerState>(null);

  useEffect(() => subscribeProjects(setProjects, (e) => setLoadError(e.message)), []);
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "timeline" || h === "tracker") setTab(h);
  }, []);
  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  const all = projects ?? [];
  const sections = useMemo(() => Array.from(new Set(all.map((p) => p.section || "General"))), [all]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        (sectionFilter === "all" || (p.section || "General") === sectionFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q)),
    );
  }, [all, query, sectionFilter]);

  const stats = useMemo(() => {
    const c = { active: 0, done: 0, overdue: 0, planned: 0 };
    all.forEach((p) => c[statusOf(p)]++);
    const avg = all.length ? Math.round(all.reduce((s, p) => s + p.progress, 0) / all.length) : 0;
    return { ...c, avg };
  }, [all]);

  if (!user) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white/70 p-4 backdrop-blur md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-md shadow-brand-500/30">
            <GanttChartSquare className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">GoAbroad</div>
            <div className="text-xs text-ink-400">Everything Tracker</div>
          </div>
        </div>

        <nav className="space-y-1">
          <NavBtn active={tab === "tracker"} onClick={() => go("tracker")} icon={<TableProperties className="h-4 w-4" />} label="Tracker" />
          <NavBtn active={tab === "timeline"} onClick={() => go("timeline")} icon={<GanttChartSquare className="h-4 w-4" />} label="Timeline" />
        </nav>

        <div className="mt-7 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Sections</div>
        <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          <SectionBtn active={sectionFilter === "all"} onClick={() => setSectionFilter("all")} label="All projects" count={all.length} />
          {sections.map((s) => (
            <SectionBtn key={s} active={sectionFilter === s} onClick={() => setSectionFilter(s)} label={s} count={all.filter((p) => (p.section || "General") === s).length} />
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
          <Ring value={stats.avg} size={52}>{stats.avg}%</Ring>
          <div className="text-xs leading-5 text-ink-500">
            <div className="text-[13px] font-semibold text-ink-900">Overall progress</div>
            {stats.done} done · {stats.overdue} overdue
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2.5 border-t border-ink-200/70 pt-4">
          <Avatar user={user} size={34} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-ink-400">{user.email}</div>
          </div>
          <button onClick={signOut} title="Sign out" className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-ink-200/70 bg-white/60 px-5 py-3 backdrop-blur md:px-8">
          <div className="mr-auto">
            <h1 className="text-xl font-semibold tracking-tight">{tab === "tracker" ? "Project Tracker" : "Timeline"}</h1>
            <p className="text-xs text-ink-400">
              {visible.length} project{visible.length === 1 ? "" : "s"}
              {sectionFilter !== "all" && <> in {sectionFilter}</>}
              {demo && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Demo mode · local only</span>}
            </p>
          </div>

          {/* mobile tab switch */}
          <div className="flex rounded-lg bg-ink-100 p-0.5 md:hidden">
            {(["tracker", "timeline"] as Tab[]).map((t) => (
              <button key={t} onClick={() => go(t)} className={clsx("rounded-md px-3 py-1 text-xs font-medium capitalize", tab === t ? "bg-white shadow-sm" : "text-ink-500")}>{t}</button>
            ))}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects…" className="field !w-56 !pl-9" />
          </div>
          <button className="btn-primary" onClick={() => setDrawer({ mode: "create", section: sectionFilter === "all" ? undefined : sectionFilter })}>
            <Plus className="h-4 w-4" /> New project
          </button>
        </header>

        {loadError && <div className="m-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn’t load projects: {loadError}</div>}

        <div className="min-h-0 flex-1 overflow-hidden">
          {projects === null ? (
            <div className="p-8 text-sm text-ink-400">Loading…</div>
          ) : tab === "tracker" ? (
            <TrackerTable projects={visible} onOpen={(p) => setDrawer({ mode: "edit", project: p })} onAdd={(section) => setDrawer({ mode: "create", section })} />
          ) : (
            <Gantt projects={visible} onOpen={(p) => setDrawer({ mode: "edit", project: p })} />
          )}
        </div>
      </main>

      <ProjectDrawer state={drawer} sections={sections} onClose={() => setDrawer(null)} />
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={clsx("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition", active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900")}>
      {icon}
      {label}
    </button>
  );
}

function SectionBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button onClick={onClick} className={clsx("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] transition", active ? "bg-ink-100 font-medium text-ink-900" : "text-ink-500 hover:bg-ink-100/70")}>
      <span className="truncate">{label}</span>
      <span className="text-xs text-ink-400">{count}</span>
    </button>
  );
}
