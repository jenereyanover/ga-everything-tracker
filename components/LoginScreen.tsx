"use client";

import { CalendarRange, GanttChartSquare, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ALLOWED_DOMAIN } from "@/lib/firebase";

export default function LoginScreen() {
  const { signIn, error, demo } = useAuth();
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white/80 p-8 shadow-card backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-blue-500 text-white shadow-lg shadow-brand-500/30">
            <GanttChartSquare className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">GoAbroad Everything</h1>
            <p className="text-sm text-ink-500">Project tracker &amp; timeline</p>
          </div>
        </div>

        <ul className="mb-7 space-y-3 text-sm text-ink-700">
          <li className="flex gap-3"><CalendarRange className="mt-0.5 h-4 w-4 text-brand-500" /> One place for every project’s progress, dates and release.</li>
          <li className="flex gap-3"><GanttChartSquare className="mt-0.5 h-4 w-4 text-brand-500" /> A shared timeline so everyone sees what’s coming.</li>
          <li className="flex gap-3"><Users className="mt-0.5 h-4 w-4 text-brand-500" /> Edited together, live, by the whole team.</li>
        </ul>

        <button onClick={signIn} className="btn-ghost w-full !py-3 shadow-sm">
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.300-8l-6.5 5C9.5 39.600 16.200 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.200-2.200 4.200-4.100 5.600l6.200 5.200C37 39.200 44 34 44 24c0-1.300-.1-2.600-.4-3.900z" />
          </svg>
          {demo ? "Continue in demo mode" : "Sign in with Google"}
        </button>

        {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <p className="mt-5 text-center text-xs text-ink-400">
          {demo
            ? "Firebase isn’t configured yet — data is saved only in this browser."
            : ALLOWED_DOMAIN
              ? `Restricted to @${ALLOWED_DOMAIN} accounts.`
              : "Use your team Google account."}
        </p>
      </div>
    </main>
  );
}
