"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ensureValidSession } from "@/lib/api";
import { getStoredUser, redirectToLogin } from "@/lib/auth-session";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguagePickerModal, LocaleSync } from "@/components/LanguagePickerModal";
import { PwaScrollRecovery } from "@/components/PwaScrollRecovery";
import { ToastViewport } from "@/components/ToastViewport";

const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

function SessionKeeper() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const validateSession = useCallback(async () => {
    if (!getStoredUser()) return;
    const ok = await ensureValidSession();
    if (!ok && getStoredUser()) {
      logout();
      redirectToLogin(true);
    }
  }, [logout]);

  useEffect(() => {
    if (!hydrated || !user) return;
    void validateSession();
  }, [hydrated, user, validateSession]);

  useEffect(() => {
    if (!hydrated || !user) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") void validateSession();
    };

    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void validateSession(), SESSION_REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [hydrated, user, validateSession]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <SessionKeeper />
        <PwaScrollRecovery />
        <LocaleSync />
        <LanguagePickerModal />
        <ToastViewport />
        <div className="app-viewport">{children}</div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
