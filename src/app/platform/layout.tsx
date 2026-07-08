"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, LogOut } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { SettingsButton, SettingsSheet } from "@/components/SettingsSheet";

const nav = [{ href: "/platform", label: "Tenants", icon: Building2, exact: true }];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "PLATFORM_SUPER_ADMIN") router.replace("/login");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 animate-pulse" />
          <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "PLATFORM_SUPER_ADMIN") return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-[var(--surface-muted)] flex flex-col">
      <header className="bg-[var(--header-bg)] border-b border-[var(--border)] sticky top-0 z-40">
        <div className="px-3 sm:px-4 lg:px-6 flex items-center justify-between h-14 max-w-7xl mx-auto w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-sm shadow-md shrink-0 text-white">
              P
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--text-primary)] truncate leading-tight">Salon Platform</p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate leading-tight">Platform Admin · {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SettingsButton onClick={() => setSettingsOpen(true)} />
            <button
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="hidden lg:block bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 flex gap-1 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition",
                  active ? "bg-violet-600 text-white" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 w-full px-3 sm:px-4 lg:px-6 py-4 pb-6 max-w-7xl mx-auto min-w-0">{children}</main>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
