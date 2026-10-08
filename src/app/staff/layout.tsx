"use client";

import { LegacyStaffRedirect } from "@/components/LegacyStaffRedirect";

export default function LegacyStaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LegacyStaffRedirect />
      {children}
    </>
  );
}
