"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ensureValidSession } from "@/lib/api";
import { getStoredUser, redirectToLogin } from "@/lib/auth-session";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguagePickerModal, LocaleSync } from "@/components/LanguagePickerModal";

function SessionKeeper() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!hydrated || !user) return;

    ensureValidSession().then((ok) => {
      if (!ok && getStoredUser()) {
        logout();
        redirectToLogin(true);
      }
    });
  }, [hydrated, user, logout]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <SessionKeeper />
        <LocaleSync />
        <LanguagePickerModal />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
