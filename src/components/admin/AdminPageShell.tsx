"use client";

import { cn } from "@/lib/utils";

export type AdminPageShellWidth = "default" | "hub" | "wide";

// The app shell already caps content at 1920px; per-page caps here only left dead gutters on laptops/desktops.
const WIDTH_CLASS: Record<AdminPageShellWidth, string> = {
  default: "max-w-none",
  hub: "max-w-lg md:max-w-none",
  wide: "max-w-none",
};

type AdminPageShellProps = {
  children: React.ReactNode;
  className?: string;
  /** default: CEO module pages; hub: mobile hub columns; wide: org / dense tables */
  width?: AdminPageShellWidth;
};

/** Shared admin page column — matches manager home density and bottom-tab padding rhythm. */
export function AdminPageShell({ children, className, width = "default" }: AdminPageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto min-w-0 w-full max-md:overflow-x-visible md:overflow-x-clip pb-8",
        "max-md:flex max-md:flex-col max-md:gap-3",
        "md:dashboard-page-flow md:dashboard-page-flow--tight",
        WIDTH_CLASS[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
