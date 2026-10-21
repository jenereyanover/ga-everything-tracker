import type { Project } from "./types";

export type Group = { name: string; items: Project[]; avg: number };

/** Group by section; sections ordered by their earliest project, projects by start date. */
export function groupBySection(projects: Project[]): Group[] {
  const map = new Map<string, Project[]>();
  [...projects].sort((a, b) => a.createdAt - b.createdAt).forEach((p) => {
    const k = p.section || "General";
    map.set(k, [...(map.get(k) ?? []), p]);
  });
  return Array.from(map, ([name, items]) => ({
    name,
    items: items.sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999") || a.createdAt - b.createdAt),
    avg: Math.round(items.reduce((s, p) => s + p.progress, 0) / items.length),
  }));
}
