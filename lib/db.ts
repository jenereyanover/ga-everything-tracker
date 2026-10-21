import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { firestore, isFirebaseConfigured } from "./firebase";
import { seedProjects } from "./seed";
import type { AppUser, Project, ProjectInput } from "./types";

const LOCAL_KEY = "ga-tracker:projects";
const COLLECTION = "projects";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

// ---------- local demo store ----------
const listeners = new Set<(p: Project[]) => void>();

const readLocal = (): Project[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedProjects();
  writeLocal(seeded, false);
  return seeded;
};

const writeLocal = (list: Project[], notify = true) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {}
  if (notify) listeners.forEach((l) => l(list));
};

// ---------- public API ----------
export function subscribeProjects(cb: (p: Project[]) => void, onError?: (e: Error) => void): () => void {
  if (isFirebaseConfigured && firestore) {
    return onSnapshot(
      collection(firestore, COLLECTION),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Project, "id">) }))),
      (e) => onError?.(e),
    );
  }
  listeners.add(cb);
  cb(readLocal());
  return () => void listeners.delete(cb);
}

export async function saveProject(input: ProjectInput, user: AppUser): Promise<void> {
  const now = Date.now();
  const patch = {
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.section !== undefined && { section: input.section.trim() || "General" }),
    ...(input.assignees !== undefined && { assignees: input.assignees }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.milestone !== undefined && { milestone: input.milestone }),
    ...(input.dependsOn !== undefined && { dependsOn: input.dependsOn }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.progress !== undefined && { progress: clamp(input.progress) }),
    ...(input.start !== undefined && { start: input.start }),
    ...(input.due !== undefined && { due: input.due }),
    ...(input.release !== undefined && { release: input.release }),
    ...(input.notes !== undefined && { notes: input.notes }),
    updatedAt: now,
    updatedBy: user.name,
  };

  if (isFirebaseConfigured && firestore) {
    if (input.id) await updateDoc(doc(firestore, COLLECTION, input.id), patch);
    else
      await addDoc(collection(firestore, COLLECTION), {
        name: "Untitled project", section: "General", status: "Not Started", assignees: [], dependsOn: [], priority: "Medium", milestone: false, progress: 0, start: "", due: "", release: "", notes: "",
        ...patch,
        createdAt: now,
      });
    return;
  }

  const list = readLocal();
  if (input.id) writeLocal(list.map((p) => (p.id === input.id ? { ...p, ...patch } : p)));
  else
    writeLocal([
      ...list,
      { id: `local-${now}`, name: "Untitled project", section: "General", status: "Not Started", assignees: [], dependsOn: [], priority: "Medium", milestone: false, progress: 0, start: "", due: "", release: "", notes: "", ...patch, createdAt: now } as Project,
    ]);
}

export async function importProjects(items: Omit<ProjectInput, "id">[], user: AppUser): Promise<void> {
  const now = Date.now();
  const full = items.map((it, i) => ({
    name: (it.name ?? "").trim() || "Untitled project",
    section: (it.section ?? "").trim() || "General",
    status: it.status ?? "Not Started",
    assignees: it.assignees ?? [],
    dependsOn: it.dependsOn ?? [],
    priority: it.priority ?? "Medium",
    milestone: it.milestone ?? false,
    progress: clamp(it.progress ?? 0),
    start: it.start ?? "",
    due: it.due ?? "",
    release: it.release ?? "",
    notes: it.notes ?? "",
    createdAt: now + i, // keeps the sheet's row order
    updatedAt: now,
    updatedBy: user.name,
  }));

  if (isFirebaseConfigured && firestore) {
    for (let i = 0; i < full.length; i += 400) {
      const batch = writeBatch(firestore);
      full.slice(i, i + 400).forEach((p) => batch.set(doc(collection(firestore!, COLLECTION)), p));
      await batch.commit();
    }
    return;
  }
  writeLocal([...readLocal(), ...full.map((p, i) => ({ id: `local-${now}-${i}`, ...p }) as Project)]);
}

export async function deleteProject(id: string): Promise<void> {
  if (isFirebaseConfigured && firestore) return deleteDoc(doc(firestore, COLLECTION, id));
  writeLocal(readLocal().filter((p) => p.id !== id));
}

export function resetDemoData() {
  writeLocal(seedProjects());
}
