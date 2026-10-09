"use client";

import { useEffect, useState } from "react";
import { PortalLoginPage } from "@/components/auth/PortalLoginPage";
import { EmployeeLoginPage } from "@/components/auth/EmployeeLoginPage";
import { isEmployeeAppHost } from "@/lib/app-hosts";

/** `/login/` — manager on app.antrahq.com, employee on employee.antrahq.com (same path, different origin). */
export default function LoginPage() {
  const [employeeHost, setEmployeeHost] = useState(false);

  useEffect(() => {
    setEmployeeHost(isEmployeeAppHost());
  }, []);

  if (employeeHost) {
    return <EmployeeLoginPage />;
  }
  return <PortalLoginPage />;
}
