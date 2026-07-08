"use client";

import { useEffect } from "react";
import { applyThemeToDocument, useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useThemeStore((s) => s.darkMode);
  const customAccentEnabled = useThemeStore((s) => s.customAccentEnabled);
  const customAccentColor = useThemeStore((s) => s.customAccentColor);
  const tenantColor = useAuthStore((s) => s.user?.primaryColor);

  useEffect(() => {
    applyThemeToDocument(
      { darkMode, customAccentEnabled, customAccentColor },
      tenantColor
    );
  }, [darkMode, customAccentEnabled, customAccentColor, tenantColor]);

  return <>{children}</>;
}
