import { format, isValid, parse } from "date-fns";
import { ASSIGNEES, PRIORITIES, STATUSES, type Assignee, type Priority, type Project, type Status } from "./types";

export type ImportRow = Pick<Project, "name" | "section" | "assignees" | "priority" | "status" | "progress" | "start" | "due" | "release" | "notes"> & { line: number };
export type ParseResult = { rows: ImportRow[]; skipped: number; sectionHeaders: number; usedHeaders: boolean; error?: string };

/** Minimal RFC-4180 style parser; Google Sheets copies as TSV with quoted multi-line cells. */
export function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const FIELD_ALIASES: Record<string, string[]> = {
  section: ["section", "group", "category"],
  name: ["task", "project", "project name", "name", "title"],
  assignee: ["assignee", "owner", "team", "assigned to"],
  priority: ["priority", "prio"],
  status: ["status", "state"],
  progress: ["progress", "% complete", "percent", "completion", "%"],
  start: ["start", "start date"],
  due: ["due", "end", "due date", "end date", "deadline"],
  release: ["date released", "released", "release", "release date"],
  notes: ["notes", "note", "comments", "remarks"],
};
const DEFAULT_ORDER = ["section", "name", "assignee", "status", "progress", "start", "due", "release", "notes"];

const DATE_FORMATS = ["M/d/yyyy", "M/d/yy", "yyyy-MM-dd", "MMM d, yyyy", "MMMM d, yyyy", "d MMM yyyy", "M-d-yyyy"];

export function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  for (const f of DATE_FORMATS) {
    const d = parse(s, f, new Date());
    if (isValid(d) && d.getFullYear() > 1999) return format(d, "yyyy-MM-dd");
  }
  return "";
}

/** Sheet cells like "JONAS / TECH" or "ACQ & ENABLE": keep every known assignee found. Longest names match first so "ACQ & ENABLE" isn't split on "&". */
export function normalizeAssignees(raw: string): Assignee[] {
  let rest = ` ${raw.toUpperCase()} `;
  const found = new Set<Assignee>();
  [...ASSIGNEES].sort((a, b) => b.length - a.length).forEach((a) => {
    const re = new RegExp(`(?<![A-Z])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Z])`);
    if (re.test(rest)) {
      found.add(a);
      rest = rest.replace(re, " ");
    }
  });
  return ASSIGNEES.filter((a) => found.has(a));
}

export function normalizeProgress(raw: string): number {
  const s = raw.trim().replace("%", "");
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const pct = raw.includes("%") || n > 1 || Number.isInteger(n) ? n : n * 100; // 0.45 → 45
  return Math.max(0, Math.min(100, Math.round(pct)));
}

const STATUS_SYNONYMS: Record<string, Status> = {
  "not started": "Not Started", "to do": "Not Started", todo: "Not Started", planned: "Not Started", backlog: "Not Started",
  started: "Started", "in progress": "Started", ongoing: "Started", active: "Started", wip: "Started",
  blocked: "Blocked", stopped: "Blocked", "on hold": "Blocked",
  "at risk": "At Risk", risk: "At Risk", delayed: "At Risk",
  done: "Done", complete: "Done", completed: "Done", released: "Done", finished: "Done",
};

/** Sheets without a Status column often keep it in Notes ("DONE", "ONGOING", "PAUSED"…). */
export function statusFromNotes(notes: string): Status | null {
  const n = notes.toUpperCase();
  if (/\b(PAUSED?|ON PAUSE|ON HOLD|STOPPED)\b/.test(n)) return "Blocked";
  if (/\b(DONE|RELEASED|COMPLETED?)\b/.test(n)) return "Done";
  if (/\b(ONGOING|IN PROGRESS|RECURRING|CODE REVIEW|FOR REVIEW|FOR RELEASE|PROTOTYPE)\b/.test(n)) return "Started";
  return null;
}

export function normalizeStatus(raw: string, progress: number, release: string, notes = ""): Status {
  const k = raw.trim().toLowerCase();
  const exact = STATUSES.find((s) => s.toLowerCase() === k);
  if (exact) return exact;
  if (STATUS_SYNONYMS[k]) return STATUS_SYNONYMS[k];
  if (progress >= 100) return "Done";
  const fromNotes = statusFromNotes(notes);
  if (fromNotes) return fromNotes;
  if (release && release <= format(new Date(), "yyyy-MM-dd")) return "Done"; // already released
  return progress > 0 || release ? "Started" : "Not Started";
}

export function parseSheet(text: string): ParseResult {
  const table = parseDelimited(text);
  if (!table.length) return { rows: [], skipped: 0, sectionHeaders: 0, usedHeaders: false, error: "Nothing to import yet." };

  // map header names → column index; fall back to our own column order when no header row is found
  const headerCells = table[0].map((c) => c.trim().toLowerCase());
  const idx: Record<string, number> = {};
  Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
    const i = headerCells.findIndex((h) => aliases.includes(h));
    if (i >= 0) idx[field] = i;
  });
  const usedHeaders = idx.name !== undefined;
  if (!usedHeaders) DEFAULT_ORDER.forEach((f, i) => (idx[f] = i));
  const body = usedHeaders ? table.slice(1) : table;

  const get = (r: string[], f: string) => (idx[f] === undefined ? "" : (r[idx[f]] ?? "").trim());
  const rows: ImportRow[] = [];
  let skipped = 0;
  let sectionHeaders = 0;
  let currentSection = "";

  body.forEach((r, n) => {
    const name = get(r, "name");
    if (!name) return void skipped++;
    const others = r.filter((c, i) => i !== idx.name && c.trim() !== "");
    // a lone task name with no other cells is a section heading row (like "High Level" in the sheet)
    if (others.length === 0) {
      currentSection = name;
      sectionHeaders++;
      return;
    }
    const release = normalizeDate(get(r, "release"));
    const status = normalizeStatus(get(r, "status"), normalizeProgress(get(r, "progress")), release, get(r, "notes"));
    // sheets without a progress column: a Done row counts as 100%
    const progress = get(r, "progress") ? normalizeProgress(get(r, "progress")) : status === "Done" ? 100 : 0;
    rows.push({
      line: n + (usedHeaders ? 2 : 1),
      name,
      section: get(r, "section") || currentSection || "General",
      progress,
      assignees: normalizeAssignees(get(r, "assignee")),
      priority: (PRIORITIES.find((x) => x.toLowerCase() === get(r, "priority").toLowerCase()) ?? "Medium") as Priority,
      status,
      start: normalizeDate(get(r, "start")),
      due: normalizeDate(get(r, "due")),
      release,
      notes: get(r, "notes"),
    });
  });

  return { rows, skipped, sectionHeaders, usedHeaders, error: rows.length ? undefined : "No project rows found. Make sure you copied the header row and at least one project." };
}
