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
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export function getHomeForRole(role: string) {
  switch (role) {
    case "PLATFORM_SUPER_ADMIN":
      return "/platform";
    case "BRAND_ADMIN":
      return "/admin";
    default:
      return "/manager";
  }
}
