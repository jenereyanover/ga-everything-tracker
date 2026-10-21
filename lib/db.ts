import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
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
        name: "Untitled project", section: "General", progress: 0, start: "", due: "", release: "", notes: "",
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
      { id: `local-${now}`, name: "Untitled project", section: "General", progress: 0, start: "", due: "", release: "", notes: "", ...patch, createdAt: now } as Project,
    ]);
}

export async function deleteProject(id: string): Promise<void> {
  if (isFirebaseConfigured && firestore) return deleteDoc(doc(firestore, COLLECTION, id));
  writeLocal(readLocal().filter((p) => p.id !== id));
}

export function resetDemoData() {
  writeLocal(seedProjects());
}
