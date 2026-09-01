"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { normalizeNavPath } from "@/components/app-nav";

type AppNavContextValue = {
  /** True while a client route transition is in flight. */
  isNavigating: boolean;
  /** Call from sidebar/mobile nav link clicks — serializes transitions. */
  beginNavigation: (href: string) => void;
};

const AppNavContext = createContext<AppNavContextValue>({
  isNavigating: false,
  beginNavigation: () => {},
});

function withTrailingSlash(href: string): string {
  if (href.includes("?") || href.includes("#")) return href;
  return href.endsWith("/") ? href : `${href}/`;
}

export function AppNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const refreshAttemptRef = useRef(false);

  useEffect(() => {
    if (!pendingHref) return;
    if (normalizeNavPath(pathname) !== normalizeNavPath(pendingHref)) return;

    setPendingHref(null);
    refreshAttemptRef.current = false;
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, [pathname, pendingHref]);

  useEffect(() => {
    if (!pendingHref) return;

    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);

    watchdogRef.current = window.setTimeout(() => {
      const target = normalizeNavPath(pendingHref);
      const current = normalizeNavPath(window.location.pathname);

      if (current === target) {
        if (!refreshAttemptRef.current) {
          refreshAttemptRef.current = true;
          router.refresh();
          return;
        }
        window.location.assign(withTrailingSlash(pendingHref));
        return;
      }

      window.location.assign(withTrailingSlash(pendingHref));
    }, 2200);

    return () => {
      if (watchdogRef.current) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [pendingHref, router]);

  const beginNavigation = useCallback(
    (href: string) => {
      const target = normalizeNavPath(href);
      if (target === normalizeNavPath(pathname)) return;
      refreshAttemptRef.current = false;
      setPendingHref(href);
    },
    [pathname]
  );

  const value = useMemo(
    () => ({
      isNavigating: pendingHref !== null,
      beginNavigation,
    }),
    [pendingHref, beginNavigation]
  );

  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
}

export function useAppNav() {
  return useContext(AppNavContext);
}
