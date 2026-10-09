"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { redirectStaffPortalToEmployeeHost } from "@/lib/app-hosts";

/** On app.antrahq.com, send /employee/* to employee.antrahq.com (separate auth storage). */
export function EmployeeHostRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) redirectStaffPortalToEmployeeHost(pathname);
  }, [pathname]);

  return null;
}
