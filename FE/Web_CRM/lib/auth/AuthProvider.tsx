"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getProfileRequest,
  loginRequest,
  logoutRequest,
} from "@/lib/api/auth";
import { clearToken, setToken } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { primaryRole, resolveRoles } from "@/lib/auth/permissions";
import { clearApiCache } from "@/lib/offline/api-cache";
import { clearMutationQueue } from "@/lib/offline/mutation-queue";
import { prefetchOfflineForUser } from "@/lib/offline/prefetch";
import { clearAppBadge } from "@/lib/pwa/app-badge";

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeProfile(profile: UserProfile): UserProfile {
  const roles = resolveRoles(
    profile.roles,
    profile.role ? [profile.role] : null
  );
  return {
    ...profile,
    roles: roles.length ? roles : profile.role ? [profile.role] : [],
    role: primaryRole(roles, profile.role) || profile.role || "sales",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getProfileRequest();
      setUser(normalizeProfile(profile));
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  useEffect(() => {
    if (loading || !user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const timer = window.setTimeout(() => {
      void prefetchOfflineForUser(user);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest(email, password);
      setToken(result.token);
      const profile = normalizeProfile(await getProfileRequest());
      setUser(profile);
      void prefetchOfflineForUser(profile, { force: true });
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.statusCode !== 401) {
        throw error;
      }
    } finally {
      clearToken();
      setUser(null);
      void clearApiCache();
      void clearMutationQueue();
      void clearAppBadge();
      try {
        window.localStorage.removeItem("crm_offline_prefetch_at");
        window.localStorage.removeItem("crm_offline_prefetch_ok");
      } catch {
        // ignore
      }
      router.push("/login");
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshProfile }),
    [user, loading, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
