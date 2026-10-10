"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import {
  isEmployeeAppHost,
  isPlatformAppHost,
  platformAppOrigin,
  redirectPlatformRoutesToPlatformHost,
} from "@/lib/app-hosts";
import { canonicalOriginForRole, isOnCorrectHostForRole } from "@/lib/role-home";
import { isPlatformRole } from "@/lib/platform-roles";

/** Keep authenticated users on the origin that matches their Play / PWA app (no cross-app session bleed). */
export function CrossOriginRoleGuard() {
  const pathname = usePathname();
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!pathname) return;
    if (redirectPlatformRoutesToPlatformHost(pathname)) return;
  }, [pathname]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (isOnCorrectHostForRole(user.role)) return;

    const path = window.location.pathname;
    const search = window.location.search;

    if (isPlatformRole(user.role) && !isPlatformAppHost()) {
      const dest = path.startsWith("/platform") ? path : "/platform/overview/";
      window.location.replace(`${platformAppOrigin()}${dest}${search}`);
      return;
    }

    if (user.role === "SALON_STAFF" && !isEmployeeAppHost()) {
      if (path.startsWith("/employee")) {
        window.location.replace(`${canonicalOriginForRole(user.role)}${path}${search}`);
      }
      return;
    }

    if (!isPlatformRole(user.role) && user.role !== "SALON_STAFF" && (isPlatformAppHost() || isEmployeeAppHost())) {
      window.location.replace(`${canonicalOriginForRole(user.role)}${path.startsWith("/login") ? "/login/" : path}${search}`);
    }
  }, [hydrated, user, pathname]);

  return null;
}
