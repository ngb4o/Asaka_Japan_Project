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

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await getProfileRequest();
      setUser(profile);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginRequest(email, password);
      setToken(result.token);
      await refreshProfile();
      router.push("/dashboard");
    },
    [refreshProfile, router]
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
