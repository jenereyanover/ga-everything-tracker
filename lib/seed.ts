import { addDays, format, startOfToday } from "date-fns";
import type { Project } from "./types";

const d = (n: number) => format(addDays(startOfToday(), n), "yyyy-MM-dd");

type Row = [string, string, number, number | null, number | null, number | null, string];

// section, name, progress, start offset, due offset, release offset, notes  (offsets are days from today)
const rows: Row[] = [
  ["High Level", "Alternative lead acquisition experiment on listings (modal)", 80, -60, 10, 14, "Testing on Adelante"],
  ["High Level", "Listing tier changes & listing completeness", 100, -90, -20, -18, "RELEASED"],
  ["High Level", "Extract master list of outbound emails (B2B + B2C)", 40, -10, 25, null, "Waiting on backend"],
  ["Program Listing Redesign", "Post-listing redesign launch data review & monitoring", 30, -14, 18, null, ""],
  ["Program Listing Redesign", "B2C marketing comms post-launch", 55, -20, 12, 15, ""],
  ["Content Production", "Guide audits and tab implementation", 45, -75, -5, null, "STOPPED"],
  ["Content Production", "Create long-tail keyword search articles", 60, -40, 45, null, "ONGOING"],
  ["Content Production", "Reviews form update (Phase 2)", 20, 3, 60, 66, ""],
  ["SEO Improvements", "Q3 SEO audit fixes", 70, -30, 20, null, "In progress"],
  ["Frontend Improvements", "New program listing design", 100, -120, -40, -35, "Prototype ready"],
  ["Frontend Improvements", "Implement new program listing design", 85, -50, 14, 21, "Staged for review"],
  ["Frontend Improvements", "Outline content for editorial guidelines page", 0, 20, 70, null, ""],
];

export const seedProjects = (): Project[] =>
  rows.map(([section, name, progress, s, e, r, notes], i) => ({
    id: `seed-${i}`,
    section,
    name,
    progress,
    start: s === null ? "" : d(s),
    due: e === null ? "" : d(e),
    release: r === null ? "" : d(r),
    notes,
    createdAt: 1_700_000_000_000 + i,
    updatedAt: 1_700_000_000_000 + i,
    updatedBy: "Demo data",
  }));
