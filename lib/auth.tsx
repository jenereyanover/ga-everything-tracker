"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { ALLOWED_DOMAIN, firebaseAuth, isFirebaseConfigured } from "./firebase";
import type { AppUser } from "./types";

type AuthCtx = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const DEMO_KEY = "ga-tracker:demo-user";

const demoUser: AppUser = { uid: "demo", name: "Demo Teammate", email: "demo@goabroad.com" };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      try {
        if (localStorage.getItem(DEMO_KEY)) setUser(demoUser);
      } catch {}
      setLoading(false);
      return;
    }
    const auth = firebaseAuth;
    return onAuthStateChanged(auth, async (u) => {
      if (u && ALLOWED_DOMAIN && !(u.email || "").toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
        await fbSignOut(auth);
        setError(`Please sign in with your @${ALLOWED_DOMAIN} Google account.`);
        setUser(null);
      } else {
        setUser(u ? { uid: u.uid, name: u.displayName || u.email || "Teammate", email: u.email || "", photo: u.photoURL || undefined } : null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    if (!isFirebaseConfigured || !firebaseAuth) {
      try {
        localStorage.setItem(DEMO_KEY, "1");
      } catch {}
      setUser(demoUser);
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      if (ALLOWED_DOMAIN) provider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: "select_account" });
      await signInWithPopup(firebaseAuth, provider);
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user") setError(e?.message || "Sign-in failed");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseAuth) await fbSignOut(firebaseAuth);
    try {
      localStorage.removeItem(DEMO_KEY);
    } catch {}
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, error, demo: !isFirebaseConfigured, signIn, signOut }), [user, loading, error, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};
