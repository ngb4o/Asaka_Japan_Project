"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoginScreen } from "@/components/LoginScreen";
import { PageSkeleton } from "@/components/PageSkeleton";
import { NetworkError, currentUser } from "@/lib/api";
import { clearApiCache } from "@/lib/offline/api-cache";
import { clearOfflinePrefetchStamp } from "@/lib/offline/prefetch";
import { clearToken, getToken } from "@/lib/session";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<"checking" | "guest" | "in">("checking");
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setSession("guest");
      return;
    }
    currentUser()
      .then((user) => {
        if (!active) return;
        setAccountName(user.name);
        setSession("in");
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof NetworkError && getToken()) {
          setAccountName("Quản kho");
          setSession("in");
          return;
        }
        clearToken();
        setSession("guest");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      void clearApiCache();
      clearOfflinePrefetchStamp();
      setAccountName("");
      setSession("guest");
    }
    window.addEventListener("kho-unauthorized", onUnauthorized);
    return () => window.removeEventListener("kho-unauthorized", onUnauthorized);
  }, []);

  function logout() {
    clearToken();
    void clearApiCache();
    clearOfflinePrefetchStamp();
    setAccountName("");
    setSession("guest");
  }

  if (session === "checking") {
    return (
      <div className="h-full bg-[#f1f5f9] p-3 sm:p-4">
        <PageSkeleton />
      </div>
    );
  }

  if (session === "guest") {
    return (
      <LoginScreen
        onSuccess={(user) => {
          setAccountName(user.name);
          setSession("in");
        }}
      />
    );
  }

  return (
    <AppShell accountName={accountName} onLogout={logout}>
      {children}
    </AppShell>
  );
}
