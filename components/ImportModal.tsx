"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardPaste, Loader2, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { importProjects } from "@/lib/db";
import { fmt, STATUS_META } from "@/lib/dates";
import { parseSheet } from "@/lib/importSheet";
import type { Project } from "@/lib/types";
import clsx from "clsx";

const key = (name: string, section: string) => `${section.trim().toLowerCase()}|${name.trim().toLowerCase()}`;

export default function ImportModal({ open, existing, onClose }: { open: boolean; existing: Project[]; onClose: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [skipDupes, setSkipDupes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setText(""); setError(null); setSkipDupes(true); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const result = useMemo(() => (text.trim() ? parseSheet(text) : null), [text]);
  const existingKeys = useMemo(() => new Set(existing.map((p) => key(p.name, p.section || "General"))), [existing]);
  const rows = result?.rows ?? [];
  const dupes = rows.filter((r) => existingKeys.has(key(r.name, r.section)));
  const toImport = skipDupes ? rows.filter((r) => !existingKeys.has(key(r.name, r.section))) : rows;

  const submit = async () => {
    if (!user || !toImport.length) return;
    setBusy(true);
    try {
      await importProjects(toImport, user);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-semibold">Import from sheet</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="text-sm text-ink-500">
            In Google Sheets, select the rows <b className="text-ink-700">including the header row</b>, copy (⌘/Ctrl+C), and paste below. CSV text works too.
            Recognised columns: <span className="text-ink-700">Section, Task/Project, Assignee, Status, Progress, Start, Due, Date Released, Notes</span>. Other columns are ignored.
          </div>

          <textarea
            autoFocus
            rows={result ? 4 : 10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your sheet rows here…"
            className="field resize-y font-mono text-xs"
          />

          {result?.error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{result.error}</p>}

          {result && !result.error && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="font-medium text-ink-900">{toImport.length} project{toImport.length === 1 ? "" : "s"} to import</span>
                {result.sectionHeaders > 0 && <span className="text-ink-400">{result.sectionHeaders} section heading row{result.sectionHeaders === 1 ? "" : "s"} used for grouping</span>}
                {result.skipped > 0 && <span className="text-ink-400">{result.skipped} empty row{result.skipped === 1 ? "" : "s"} skipped</span>}
                {!result.usedHeaders && <span className="text-amber-700">No header row found. Assuming column order: Section, Task, Assignee, Status, Progress, Start, Due, Released, Notes.</span>}
                {dupes.length > 0 && (
                  <label className="ml-auto flex cursor-pointer items-center gap-2 text-ink-700">
                    <input type="checkbox" checked={skipDupes} onChange={(e) => setSkipDupes(e.target.checked)} className="accent-brand-600" />
                    Skip {dupes.length} already in tracker
                  </label>
                )}
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-ink-200/70">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-ink-50 text-[11px] uppercase tracking-wider text-ink-400">
                    <tr>{["Section", "Project", "Assignee", "Status", "%", "Start", "Due", "Released", "Notes"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const dupe = existingKeys.has(key(r.name, r.section));
                      const m = STATUS_META[r.status];
                      return (
                        <tr key={r.line} className={clsx("border-t border-ink-100", dupe && skipDupes && "opacity-40")}>
                          <td className="px-3 py-1.5 text-ink-500">{r.section}</td>
                          <td className="max-w-[240px] truncate px-3 py-1.5 font-medium">{r.name}{dupe && <span className="ml-2 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-normal text-ink-500">duplicate</span>}</td>
                          <td className="px-3 py-1.5 text-ink-500">{r.assignees.join(", ") || "–"}</td>
                          <td className="px-3 py-1.5"><span className={clsx("rounded-full px-2 py-0.5 font-medium", m.pill)}>{r.status}</span></td>
                          <td className="px-3 py-1.5 tabular-nums">{r.progress}</td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.start, "MMM d, yy") || "–"}</td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.due, "MMM d, yy") || "–"}</td>
                          <td className="px-3 py-1.5 tabular-nums">{fmt(r.release, "MMM d, yy") || "–"}</td>
                          <td className="max-w-[200px] truncate px-3 py-1.5 text-ink-500">{r.notes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={busy || !toImport.length} className="btn-primary">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {toImport.length || ""} project{toImport.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
