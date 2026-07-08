import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "coordinator" | "supporter";

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isSupporter: boolean;
  canEdit: boolean; // admin or coordinator
  signOut: () => Promise<void>;
}

/**
 * Reactive auth + roles hook. Reads the Supabase session, subscribes to
 * onAuthStateChange, and fetches the user's roles from `public.user_roles`.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Subscribe FIRST (per Supabase docs) so we don't miss state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        // Defer role fetch to avoid deadlocks in the auth callback
        setTimeout(() => {
          if (!mounted) return;
          void fetchRoles(s.user.id);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    // 2. Then read the current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) void fetchRoles(s.user.id);
      setLoading(false);
    });

    async function fetchRoles(userId: string) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        console.warn("fetch roles failed", error.message);
        setRoles([]);
        return;
      }
      if (!mounted) return;
      setRoles((data ?? []).map((r) => r.role as AppRole));
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isCoordinator = roles.includes("coordinator");
  const isSupporter = roles.includes("supporter");

  return {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    isAdmin,
    isCoordinator,
    isSupporter,
    canEdit: isAdmin || isCoordinator,
    async signOut() {
      await supabase.auth.signOut();
    },
  };
}
