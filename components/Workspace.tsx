"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ClipboardPaste, GanttChartSquare, LogOut, PanelLeftClose, PanelLeftOpen, Plus, Search, TableProperties } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { subscribeProjects } from "@/lib/db";
import { usePresence } from "@/lib/presence";
import { assigneesOf, statusOf } from "@/lib/dates";
import { attentionReasons } from "@/lib/insights";
import { ASSIGNEES, STATUSES, type Assignee, type Project } from "@/lib/types";
import Avatar from "./Avatar";
import Viewers from "./Viewers";
import { Ring } from "./ui";
import TrackerPage from "./TrackerPage";
import Gantt from "./Gantt";
import ImportModal from "./ImportModal";
import ProjectDrawer, { type DrawerState } from "./ProjectDrawer";

type Tab = "tracker" | "timeline";

export default function Workspace() {
  const { user, signOut, demo } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("tracker");
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [importing, setImporting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("ga-tracker:sidebar-collapsed") === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("ga-tracker:sidebar-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  const viewers = usePresence(user);
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
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (p) =>
        (assigneeFilter === "all" || (assigneeFilter === "none" ? !assigneesOf(p).length : assigneesOf(p).includes(assigneeFilter as Assignee))) &&
        (sectionFilter === "all" || (p.section || "General") === sectionFilter) &&
        (statusFilter === "all" || statusOf(p) === statusFilter) &&
        (!q || p.name.toLowerCase().includes(q) || p.notes.toLowerCase().includes(q)) &&
        (!attentionOnly || attentionReasons(p, byId).length > 0),
    );
  }, [all, byId, query, sectionFilter, assigneeFilter, statusFilter, attentionOnly]);

  const stats = useMemo(() => {
    const c = { done: 0, attention: 0 };
    all.forEach((p) => {
      const s = statusOf(p);
      if (s === "Done") c.done++;
      if (s === "Blocked" || s === "At Risk") c.attention++;
    });
    const avg = all.length ? Math.round(all.reduce((s, p) => s + p.progress, 0) / all.length) : 0;
    return { ...c, avg };
  }, [all]);

  if (!user) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className={clsx("hidden shrink-0 flex-col border-r border-ink-200/70 bg-white/70 backdrop-blur transition-[width] duration-200 md:flex", collapsed ? "w-[76px] p-3" : "w-64 p-4")}>
        <div className={clsx("mb-6 flex items-center", collapsed ? "flex-col gap-3" : "gap-2.5 px-1")}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-md shadow-brand-500/30">
            <GanttChartSquare className="h-5 w-5" />
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-sm font-semibold">GoAbroad</div>
              <div className="truncate text-xs text-ink-400">Everything Tracker</div>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        <nav className="space-y-1">
          <NavBtn collapsed={collapsed} active={tab === "tracker"} onClick={() => go("tracker")} icon={<TableProperties className="h-4 w-4" />} label="Tracker" />
          <NavBtn collapsed={collapsed} active={tab === "timeline"} onClick={() => go("timeline")} icon={<GanttChartSquare className="h-4 w-4" />} label="Timeline" />
        </nav>

        {collapsed ? (
          <div className="flex-1" />
        ) : (
          <>
            <div className="mt-7 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Sections</div>
            <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              <SectionBtn active={sectionFilter === "all"} onClick={() => setSectionFilter("all")} label="All projects" count={all.length} />
              {sections.map((s) => (
                <SectionBtn key={s} active={sectionFilter === s} onClick={() => setSectionFilter(s)} label={s} count={all.filter((p) => (p.section || "General") === s).length} />
              ))}
            </div>
          </>
        )}

        {collapsed ? (
          <div className="mt-4 flex justify-center" title={`Overall progress ${stats.avg}% · ${stats.done} done`}>
            <Ring value={stats.avg} size={46} stroke={5}><span className="text-[11px]">{stats.avg}%</span></Ring>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
            <Ring value={stats.avg} size={52}>{stats.avg}%</Ring>
            <div className="text-xs leading-5 text-ink-500">
              <div className="text-[13px] font-semibold text-ink-900">Overall progress</div>
              {stats.done} done · {stats.attention} blocked / at risk
            </div>
          </div>
        )}

        <div className={clsx("mt-4 border-t border-ink-200/70 pt-4", collapsed ? "flex flex-col items-center gap-2" : "flex items-center gap-2.5")}>
          <span title={collapsed ? `${user.name}\n${user.email}` : undefined}><Avatar user={user} size={34} /></span>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-ink-400">{user.email}</div>
            </div>
          )}
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

          <Viewers viewers={viewers} meUid={user?.uid ?? ""} />

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
          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="field !w-auto cursor-pointer" aria-label="Filter by assignee">
            <option value="all">All assignees</option>
            {ASSIGNEES.map((a) => <option key={a} value={a}>{a}</option>)}
            <option value="none">Unassigned</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field !w-auto cursor-pointer" aria-label="Filter by status">
            <option value="all">All statuses</option>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <button
            onClick={() => setAttentionOnly((v) => !v)}
            aria-pressed={attentionOnly}
            className={clsx("btn border", attentionOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50")}
            title="Only show tasks that are overdue, blocked, waiting, clashing or behind"
          >
            <AlertTriangle className="h-4 w-4" /> Needs attention
          </button>
          <button className="btn-ghost" onClick={() => setImporting(true)} title="Paste rows copied from your Google Sheet">
            <ClipboardPaste className="h-4 w-4" /> Import
          </button>
          <button className="btn-primary" onClick={() => setDrawer({ mode: "create", section: sectionFilter === "all" ? undefined : sectionFilter })}>
            <Plus className="h-4 w-4" /> New project
          </button>
        </header>

        {loadError && <div className="m-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">Couldn’t load projects: {loadError}</div>}

        <div className="min-h-0 flex-1 overflow-hidden">
          {projects === null ? (
            <div className="p-8 text-sm text-ink-400">Loading…</div>
          ) : tab === "tracker" ? (
            <TrackerPage projects={visible} all={all} assigneeFilter={assigneeFilter} onPickAssignee={setAssigneeFilter} onOpen={(p) => setDrawer({ mode: "edit", project: p })} onAdd={(section) => setDrawer({ mode: "create", section })} />
          ) : (
            <Gantt projects={visible} onOpen={(p) => setDrawer({ mode: "edit", project: p })} />
          )}
        </div>
      </main>

      <ImportModal open={importing} existing={all} onClose={() => setImporting(false)} />
      <ProjectDrawer state={drawer} sections={sections} projects={all} onClose={() => setDrawer(null)} onImport={() => { setDrawer(null); setImporting(true); }} />
    </div>
  );
}

function NavBtn({ active, onClick, icon, label, collapsed }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; collapsed?: boolean }) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined} aria-label={label} className={clsx("flex w-full items-center rounded-lg py-2 text-sm font-medium transition", collapsed ? "justify-center px-0" : "gap-2.5 px-3", active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900")}>
      {icon}
      {!collapsed && label}
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
