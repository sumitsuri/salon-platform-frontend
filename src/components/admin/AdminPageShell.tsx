"use client";

import { cn } from "@/lib/utils";

export type AdminPageShellWidth = "default" | "hub" | "wide";

const WIDTH_CLASS: Record<AdminPageShellWidth, string> = {
  default: "max-w-6xl",
  hub: "max-w-lg",
  wide: "max-w-7xl",
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
