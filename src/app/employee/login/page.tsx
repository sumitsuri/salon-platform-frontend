"use client";

import { useEffect } from "react";
import { employeeLoginUrl, isEmployeeAppHost, EMPLOYEE_HOST_LOGIN_PATH } from "@/lib/app-hosts";

/** Legacy URL — canonical employee sign-in is `/login/` on the employee host. */
export default function LegacyEmployeeLoginRoute() {
  useEffect(() => {
    if (isEmployeeAppHost()) {
      window.location.replace(EMPLOYEE_HOST_LOGIN_PATH);
    } else {
      window.location.replace(employeeLoginUrl());
    }
  }, []);

  return null;
}
