"use client";

import { Suspense } from "react";
import { SalesSubNav } from "@/modules/sales/components/SalesSubNav";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <SalesSubNav />
      </Suspense>
      <Suspense
        fallback={
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[var(--ink-muted)]">
            Loading…
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
