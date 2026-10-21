"use client";

import { useMemo, useState } from "react";
import { Link2, X } from "lucide-react";
import { sectionColor } from "@/lib/dates";
import type { Project } from "@/lib/types";

/** Pick the projects that must finish before this one starts. */
export default function DependencyPicker({ value, onChange, options }: { value: string[]; onChange: (ids: string[]) => void; options: Project[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(options.map((p) => [p.id, p])), [options]);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return options
      .filter((p) => !value.includes(p.id) && (!needle || p.name.toLowerCase().includes(needle) || (p.section || "").toLowerCase().includes(needle)))
      .slice(0, 8);
  }, [options, value, q]);

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-col gap-1.5">
          {value.map((id) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <span key={id} className="flex items-center gap-2 rounded-lg bg-ink-50 py-1.5 pl-3 pr-1.5 text-xs">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                <span className="min-w-0 flex-1 truncate font-medium text-ink-700">{p.name}</span>
                <button type="button" onClick={() => onChange(value.filter((v) => v !== id))} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label={`Remove ${p.name}`}><X className="h-3.5 w-3.5" /></button>
              </span>
            );
          })}
        </div>
      )}
      <input
        className="field"
        placeholder={options.length ? "Search projects to add a dependency…" : "No other projects yet"}
        disabled={!options.length}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-ink-200 bg-white p-1 shadow-pop">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange([...value, p.id]); setQ(""); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-ink-50"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: sectionColor(p.section || "General").fill }} />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="shrink-0 text-[11px] text-ink-400">{p.section || "General"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
