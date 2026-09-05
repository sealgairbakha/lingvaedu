import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  finishRecovery: () => void;
  displayName: string;
  initials: string;
  avatarUrl: string;
  role: "admin" | "staff" | "student";
  isAdmin: boolean;
  canEditCourses: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let authEventReceived = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || authEventReceived) return;
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (active && !authEventReceived) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      if (_event === "PASSWORD_RECOVERY") setRecovery(true);
      if (_event === "SIGNED_OUT") setRecovery(false);
      setSession(nextSession);
      setLoading(false);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;
    const displayName = String(
      user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "Пользователь",
    );
    const initials = displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    const avatarUrl = String(user?.user_metadata?.avatar_url || "");
    const rawRole = user?.app_metadata?.role;
    const role = rawRole === "admin" || rawRole === "staff" ? rawRole : "student";
    return {
      user,
      session,
      loading,
      recovery,
      finishRecovery: () => setRecovery(false),
      displayName,
      initials,
      avatarUrl,
      role,
      isAdmin: role === "admin",
      canEditCourses: role === "admin" || role === "staff",
      signOut: async () => {
        await supabase?.auth.signOut();
      },
    };
  }, [session, loading, recovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
