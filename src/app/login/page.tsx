"use client";

import { PortalLoginPage } from "@/components/auth/PortalLoginPage";

export default function LoginPage() {
  return (
    <PortalLoginPage
      portal="manager"
      titleKey="managerSignInTitle"
      hintKey="managerSignInHint"
      alternatePortal="employee"
      alternateHref="/employee/login/"
      alternateLabelKey="useEmployeeSignIn"
    />
  );
}
