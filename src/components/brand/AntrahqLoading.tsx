"use client";

import { AntrahqLogo } from "./AntrahqLogo";

export function AntrahqLoading({ label }: { label?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8">
      <AntrahqLogo size="md" variant="dark" className="pravaah-loading-pulse" />
      {label && <p className="text-sm text-[var(--text-secondary)] font-medium">{label}</p>}
    </div>
  );
}
