export const STATUSES = ["Not Started", "Started", "Blocked", "At Risk", "Done"] as const;
export type Status = (typeof STATUSES)[number];

export const ASSIGNEES = ["TECH", "FRONTEND", "BACKEND", "DESIGN", "SALES", "REVENUE", "DEMAND", "ELSA", "CONTENT", "ACQ & ENABLE", "MANAGERS", "ADMIN"] as const;
export type Assignee = (typeof ASSIGNEES)[number];

export type Project = {
  id: string;
  name: string;
  section: string;
  status: Status;
  /** one or more teams/owners; empty when unassigned */
  assignees: Assignee[];
  /** ids of projects that must finish before this one */
  dependsOn?: string[];
  /** legacy single-value field from before multi-select */
  assignee?: string;
  /** 0–100 */
  progress: number;
  /** yyyy-MM-dd or "" */
  start: string;
  due: string;
  release: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  updatedBy: string;
};

export type ProjectInput = Partial<Omit<Project, "id" | "createdAt" | "updatedAt" | "updatedBy">> & { id?: string };

export type AppUser = { uid: string; name: string; email: string; photo?: string };
