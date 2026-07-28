"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Inbox, Kanban, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { salesPathWithSearchParams } from "@/modules/sales/lib/pipeline-search-params";

const ADMIN_LINKS = [
  { href: "/platform/sales", label: "Pipeline", icon: Kanban, exact: true },
  { href: "/platform/sales/incoming", label: "Incoming leads", icon: Inbox },
  { href: "/platform/sales/team", label: "Team", icon: Users },
];

const REP_LINKS = [
  { href: "/platform/sales", label: "My Pipeline", icon: Kanban, exact: true },
  { href: "/platform/sales/growth", label: "My Progress", icon: BarChart3 },
];

export function SalesSubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const links = role === "PLATFORM_SUPER_ADMIN" ? ADMIN_LINKS : REP_LINKS;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-2">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const target = salesPathWithSearchParams(href, searchParams);
        return (
          <Link
            key={href}
            href={target}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-violet-600 text-white"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-muted)]"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
