export type Project = {
  id: string;
  name: string;
  section: string;
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
