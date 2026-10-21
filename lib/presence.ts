"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { firestore, isFirebaseConfigured } from "./firebase";
import type { AppUser } from "./types";

const HEARTBEAT_MS = 30_000;
const ACTIVE_MS = 75_000;

/** Who else has the tracker open right now. Each viewer writes presence/{uid} every 30s; stale entries are ignored. */
export function usePresence(me: AppUser | null): AppUser[] {
  const [viewers, setViewers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (!me) return;
    if (!isFirebaseConfigured || !firestore) {
      setViewers([me]); // demo mode: just you
      return;
    }
    const db = firestore;
    const ref = doc(db, "presence", me.uid);
    const beat = () => {
      if (document.visibilityState === "hidden") return;
      setDoc(ref, { uid: me.uid, name: me.name, email: me.email, photo: me.photo ?? "", lastSeen: Date.now() }).catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);
    const leave = () => void deleteDoc(ref).catch(() => {});
    window.addEventListener("pagehide", leave);

    let docs: (AppUser & { lastSeen: number })[] = [];
    const refresh = () => setViewers(docs.filter((d) => Date.now() - d.lastSeen < ACTIVE_MS));
    const unsub = onSnapshot(collection(db, "presence"), (snap) => {
      docs = snap.docs.map((d) => d.data() as AppUser & { lastSeen: number });
      refresh();
    });
    const sweep = setInterval(refresh, 15_000); // drop people whose heartbeat stopped

    return () => {
      clearInterval(timer);
      clearInterval(sweep);
      document.removeEventListener("visibilitychange", beat);
      window.removeEventListener("pagehide", leave);
      unsub();
      leave();
    };
  }, [me]);

  return viewers;
}
