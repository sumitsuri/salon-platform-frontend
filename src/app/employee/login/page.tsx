"use client";

import { PortalLoginPage } from "@/components/auth/PortalLoginPage";

export default function EmployeeLoginPage() {
  return (
    <PortalLoginPage
      portal="employee"
      titleKey="employeeSignInTitle"
      hintKey="employeeSignInHint"
      alternatePortal="manager"
      alternateHref="/login/"
      alternateLabelKey="useManagerSignIn"
    />
  );
}
