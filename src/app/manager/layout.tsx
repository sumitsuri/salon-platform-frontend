"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, UserPlus, ClipboardList, LogOut } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/manager", label: "Home", icon: Home, exact: true },
  { href: "/manager/walk-in", label: "Walk-in", icon: UserPlus },
  { href: "/manager/bookings", label: "Bookings", icon: ClipboardList },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top app bar — Amazon / Flipkart style */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          {/* Row 1: Brand + Nav + User */}
          <div className="flex items-center gap-6 h-14">
            <Link href="/manager" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                {(user.tenantName || "S")[0]}
              </div>
              <span className="font-semibold text-slate-900 hidden sm:block">
                {user.tenantName || "Salon"}
              </span>
            </Link>

            <nav className="flex items-center gap-1 flex-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      active
                        ? "text-indigo-700 bg-indigo-50 border-b-2 border-indigo-600 rounded-b-none"
                        : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Row 2: Context breadcrumb */}
          <div className="pb-2 text-xs text-slate-500 flex items-center gap-1">
            <span className="font-medium text-slate-700">{user.branchName}</span>
            <span>·</span>
            <span>{user.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-5">{children}</main>
    </div>
  );
}
