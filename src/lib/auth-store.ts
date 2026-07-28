"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, AuthUser } from "./api";
import { clearStoredAuth } from "./auth-session";
import { syncLocaleFromUser } from "./locale-client";

interface AuthState {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        const user = await api.login(email, password);
        set({ user });
        syncLocaleFromUser(user.preferredLocale, true);
      },
      logout: () => {
        clearStoredAuth();
        set({ user: null });
      },
      setUser: (user) => set({ user }),
    }),
    { name: "auth" }
  )
);

/** Wait for Zustand persist to load user from localStorage before auth redirects. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finish = () => setHydrated(true);
    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(finish);
    // Fallback if hydration already completed between hasHydrated check and subscription
    const t = window.setTimeout(() => {
      if (useAuthStore.persist.hasHydrated()) finish();
    }, 0);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, []);

  return hydrated;
}

export function getHomeForRole(role: string) {
  switch (role) {
    case "PLATFORM_SUPER_ADMIN":
      return "/platform/overview";
    case "SALES_EXECUTIVE":
      return "/platform/sales";
    case "BRAND_ADMIN":
      return "/admin";
    default:
      return "/manager";
  }
}
