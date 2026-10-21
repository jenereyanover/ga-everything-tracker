"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, Plus } from "lucide-react";
import { ASSIGNEES, type Assignee } from "@/lib/types";

const toggle = (list: Assignee[], a: Assignee) => (list.includes(a) ? list.filter((x) => x !== a) : ASSIGNEES.filter((x) => x === a || list.includes(x)));

/** Toggle chips, used in the edit panel. */
export function AssigneeChips({ value, onChange }: { value: Assignee[]; onChange: (v: Assignee[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ASSIGNEES.map((a) => {
        const on = value.includes(a);
        return (
          <button
            key={a}
            type="button"
            onClick={() => onChange(toggle(value, a))}
            className={clsx("rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide transition", on ? "border-brand-500 bg-brand-500 text-white" : "border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:text-ink-900")}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}

export function AssigneeTags({ value, max = 2 }: { value: Assignee[]; max?: number }) {
  if (!value.length) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {value.slice(0, max).map((a) => <span key={a} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-500">{a}</span>)}
      {value.length > max && <span className="text-[10px] font-semibold text-ink-400">+{value.length - max}</span>}
    </span>
  );
}

/** Table cell: shows tags, opens a checklist popover (fixed-positioned so the table's overflow doesn't clip it). */
export function AssigneeCell({ value, onChange }: { value: Assignee[]; onChange: (v: Assignee[]) => void }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e.type === "mousedown" && (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setPos(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", esc);
    };
  }, [pos]);

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    setPos({ x: r.left, y: Math.min(r.bottom + 4, window.innerHeight - 300) });
  };

  return (
    <>
      <button ref={btn} type="button" onClick={() => (pos ? setPos(null) : open())} className="cell-input flex min-h-[32px] flex-wrap items-center gap-1 text-left">
        {value.length ? value.map((a) => <span key={a} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-700">{a}</span>) : <Plus className="h-3.5 w-3.5 text-ink-300" />}
      </button>
      {pos && (
        <div ref={pop} style={{ left: pos.x, top: pos.y }} className="fixed z-50 max-h-72 w-48 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop">
          {ASSIGNEES.map((a) => {
            const on = value.includes(a);
            return (
              <button key={a} type="button" onClick={() => onChange(toggle(value, a))} className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide text-ink-700 hover:bg-ink-50">
                {a}
                {on && <Check className="h-3.5 w-3.5 text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
