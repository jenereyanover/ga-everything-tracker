import type { Project } from "./types";

/** Dependency ids that still point at an existing project. */
export const depsOf = (p: Project, byId: Map<string, Project>): string[] => (p.dependsOn ?? []).filter((id) => byId.has(id) && id !== p.id);

/** True if `p` depends on `targetId`, directly or through a chain. Used to prevent circular dependencies. */
export function dependsOnTransitively(p: Project, targetId: string, byId: Map<string, Project>, seen = new Set<string>()): boolean {
  if (seen.has(p.id)) return false;
  seen.add(p.id);
  return depsOf(p, byId).some((id) => id === targetId || dependsOnTransitively(byId.get(id)!, targetId, byId, seen));
}
