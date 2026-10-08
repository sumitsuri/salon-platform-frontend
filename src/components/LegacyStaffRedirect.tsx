"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Old /staff/* bookmarks → /employee/* */
export function LegacyStaffRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const next = pathname?.replace(/^\/staff/, "/employee") || "/employee/";
    router.replace(next.endsWith("/") ? next : `${next}/`);
  }, [pathname, router]);

  return null;
}
