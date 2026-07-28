"use client";

import { Suspense } from "react";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
