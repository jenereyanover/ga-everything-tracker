"use client";

import { useState } from "react";
import clsx from "clsx";
import { Columns3, Table2 } from "lucide-react";
import type { Project } from "@/lib/types";
import Board from "./Board";
import Insights from "./Insights";
import TrackerTable from "./TrackerTable";

type View = "table" | "board";

/** Project Tracker tab: summary on top, then the work as a table or a status board. */
export default function TrackerPage({ projects, all, assigneeFilter, onPickAssignee, onOpen, onAdd }: {
  projects: Project[]; // after all filters
  all: Project[];
  assigneeFilter: string;
  onPickAssignee: (a: string) => void;
  onOpen: (p: Project) => void;
  onAdd: (section: string) => void;
}) {
  const [view, setView] = useState<View>("table");
  return (
    <div className="h-full overflow-auto px-5 pb-10 pt-5 md:px-8">
      <Insights projects={projects} all={all} assigneeFilter={assigneeFilter} onPickAssignee={onPickAssignee} onOpen={onOpen} />

      <div className="mb-3 flex items-center gap-3">
        <div className="flex rounded-lg bg-ink-100 p-0.5">
          {([["table", "Table", Table2], ["board", "Board", Columns3]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={clsx("flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition", view === v ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900")}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-400">{view === "board" ? "Drag a card to change its status." : "Click a column heading to sort."}</span>
      </div>

      {view === "table" ? (
        <TrackerTable projects={projects} all={all} onOpen={onOpen} onAdd={onAdd} />
      ) : projects.length ? (
        <Board projects={projects} all={all} onOpen={onOpen} />
      ) : (
        <div className="p-12 text-center text-sm text-ink-400">No projects match the current filters.</div>
      )}
    </div>
  );
}
