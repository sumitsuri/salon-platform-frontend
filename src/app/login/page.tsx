"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalLoginPage } from "@/components/auth/PortalLoginPage";
import {
  EMPLOYEE_HOST_LOGIN_PATH,
  isEmployeeAppHost,
  isPlatformAppHost,
  platformLoginPath,
} from "@/lib/app-hosts";

/** Manager / CEO login on app.antrahq.com. Employee and platform hosts sign in at `/`. */
export default function LoginPage() {
  const router = useRouter();
  const [showManagerLogin, setShowManagerLogin] = useState(false);

  useEffect(() => {
    if (isEmployeeAppHost()) {
      router.replace(EMPLOYEE_HOST_LOGIN_PATH);
      return;
    }
    if (isPlatformAppHost()) {
      router.replace(platformLoginPath());
      return;
    }
    setShowManagerLogin(true);
  }, [router]);

  if (!showManagerLogin) return null;

  return <PortalLoginPage />;
}
