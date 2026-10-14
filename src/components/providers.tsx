"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { ensureValidSession } from "@/lib/api";
import { getStoredUser, redirectToLogin } from "@/lib/auth-session";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguagePickerModal, LocaleSync } from "@/components/LanguagePickerModal";
import { PwaScrollRecovery } from "@/components/PwaScrollRecovery";
import { CrossOriginRoleGuard } from "@/components/auth/CrossOriginRoleGuard";
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

    // A phone that was offline (or asleep) comes back online: re-check straight away rather than waiting.
    const onOnline = () => void validateSession();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    const interval = window.setInterval(() => void validateSession(), SESSION_REFRESH_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, [hydrated, user, validateSession]);

  // Sessions no longer expire, so ask the browser not to evict this app's storage (and with it the sign-in).
  // Installed apps only: Firefox shows a permission prompt for this, which would be noise in a normal tab.
  useEffect(() => {
    if (!hydrated || !user) return;
    const installed =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!installed) return;
    void navigator.storage?.persist?.().catch(() => undefined);
  }, [hydrated, user]);

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
        <CrossOriginRoleGuard />
        <PwaScrollRecovery />
        <LocaleSync />
        <LanguagePickerModal />
        <ToastViewport />
        <div className="app-viewport">{children}</div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
