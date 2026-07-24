"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";

export type AppShellContextValue = {
  homeHref: string;
  homeLabel: string;
};

const AppShellContext = createContext<AppShellContextValue>({
  homeHref: "/",
  homeLabel: "Home",
});

export function AppShellProvider({
  homeHref,
  homeLabel,
  children,
}: AppShellContextValue & { children: React.ReactNode }) {
  return (
    <AppShellContext.Provider value={{ homeHref, homeLabel }}>{children}</AppShellContext.Provider>
  );
}

export function useAppShell() {
  return useContext(AppShellContext);
}

/** True when the current route is not the section home (dashboard). */
export function useIsSubPage() {
  const pathname = usePathname();
  const { homeHref } = useAppShell();
  return pathname !== homeHref;
}
