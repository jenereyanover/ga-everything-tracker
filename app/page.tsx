"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import Workspace from "@/components/Workspace";

export default function Home() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="grid h-screen place-items-center text-brand-600">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  return user ? <Workspace /> : <LoginScreen />;
}
