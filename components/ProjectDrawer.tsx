"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste, Loader2, Trash2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AssigneeChips } from "./AssigneePicker";
import { deleteProject, saveProject } from "@/lib/db";
import { assigneesOf, fmt, sectionColor, statusOf } from "@/lib/dates";
import { STATUSES, type Project } from "@/lib/types";

export type DrawerState = { mode: "create"; section?: string } | { mode: "edit"; project: Project } | null;

type Form = Pick<Project, "name" | "section" | "assignees" | "status" | "progress" | "start" | "due" | "release" | "notes">;
const empty = (section = ""): Form => ({ name: "", section, assignees: [], status: "Not Started", progress: 0, start: "", due: "", release: "", notes: "" });

export default function ProjectDrawer({ state, sections, onClose, onImport }: { state: DrawerState; sections: string[]; onClose: () => void; onImport: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = state !== null;

  useEffect(() => {
    if (!state) return;
    setError(null);
    setForm(state.mode === "edit" ? { ...state.project, assignees: assigneesOf(state.project), status: statusOf(state.project) } : empty(state.section));
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dateOrderBad = form.start && form.due && form.due < form.start;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !state) return;
    if (!form.name.trim()) return setError("Give the project a name.");
    if (dateOrderBad) return setError("Due date can’t be before the start date.");
    setBusy(true);
    try {
      await saveProject({ ...form, id: state.mode === "edit" ? state.project.id : undefined }, user);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn’t save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (state?.mode !== "edit" || !confirm(`Delete “${state.project.name}”? This can’t be undone.`)) return;
    setBusy(true);
    try {
      await deleteProject(state.project.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Couldn’t delete.");
    } finally {
      setBusy(false);
    }
  };

  const color = sectionColor(form.section || "General");

  return (
    <>
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-pop transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!open}>
        {open && (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ background: color.fill }} />
                <h2 className="text-base font-semibold">{state?.mode === "edit" ? "Edit project" : "New project"}</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {state?.mode === "create" && (
                <button type="button" onClick={onImport} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 text-left text-sm transition hover:bg-brand-50">
                  <ClipboardPaste className="h-5 w-5 shrink-0 text-brand-600" />
                  <span><b className="font-medium text-brand-700">Paste from your sheet</b><span className="block text-xs text-ink-500">Import many projects at once from Google Sheets or CSV.</span></span>
                </button>
              )}
              <Label text="Project name">
                <input autoFocus className="field" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. New program listing design" />
              </Label>

              <Label text="Section">
                <input className="field" list="sections" value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. Content Production" />
                <datalist id="sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
              </Label>

              <Label text="Assignees">
                <AssigneeChips value={form.assignees} onChange={(v) => set("assignees", v)} />
              </Label>

              <Label text="Status">
                <select className="field" value={form.status} onChange={(e) => set("status", e.target.value as Form["status"])}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Label>

              <Label text={`Progress · ${form.progress}%`}>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} step={5} value={form.progress} onChange={(e) => set("progress", +e.target.value)} className="flex-1" />
                  <input type="number" min={0} max={100} value={form.progress} onChange={(e) => set("progress", +e.target.value)} className="field !w-20" />
                </div>
              </Label>

              <div className="grid grid-cols-2 gap-4">
                <Label text="Start date"><input type="date" className="field" value={form.start} onChange={(e) => set("start", e.target.value)} /></Label>
                <Label text="Due date"><input type="date" className="field" value={form.due} min={form.start || undefined} onChange={(e) => set("due", e.target.value)} /></Label>
              </div>
              <Label text="Release date">
                <input type="date" className="field" value={form.release} onChange={(e) => set("release", e.target.value)} />
              </Label>

              <Label text="Notes">
                <textarea rows={5} className="field resize-none" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Links, blockers, status updates…" />
              </Label>

              {state?.mode === "edit" && state.project.updatedAt > 0 && (
                <p className="text-xs text-ink-400">Last updated by {state.project.updatedBy} · {fmt(new Date(state.project.updatedAt).toISOString().slice(0, 10))}</p>
              )}
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            </div>

            <div className="flex items-center gap-2 border-t border-ink-100 px-6 py-4">
              {state?.mode === "edit" && (
                <button type="button" onClick={remove} disabled={busy} className="btn !px-3 text-rose-600 hover:bg-rose-50" title="Delete project"><Trash2 className="h-4 w-4" /></button>
              )}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {state?.mode === "edit" ? "Save changes" : "Add project"}
                </button>
              </div>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-500">{text}</span>
      {children}
    </label>
  );
}
