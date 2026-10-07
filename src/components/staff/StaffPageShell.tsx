"use client";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Full-width staff pages — matches admin/manager dashboard flow on tablet and desktop. */
export function StaffPageShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto min-w-0 w-full max-w-none pb-8",
        "max-md:flex max-md:flex-col max-md:gap-2",
        "md:dashboard-page-flow md:dashboard-page-flow--tight",
        className,
      )}
    >
      {children}
    </div>
  );
}
