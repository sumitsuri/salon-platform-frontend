"use client";

import { useEffect } from "react";
import { PortalLoginPage } from "@/components/auth/PortalLoginPage";
import { employeeLoginPath, isEmployeeAppHost } from "@/lib/app-hosts";

/** Manager, CEO, and platform sign-in — employee app lives on employee.antrahq.com */
export default function LoginPage() {
  useEffect(() => {
    if (isEmployeeAppHost()) {
      window.location.replace(employeeLoginPath());
    }
  }, []);

  return <PortalLoginPage />;
}
