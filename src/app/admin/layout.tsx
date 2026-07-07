"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, ClipboardList, Building2, LogOut } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/branches", label: "Branches", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN") router.replace("/manager");
  }, [user, router, hydrated]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  if (!user || (user.role !== "BRAND_ADMIN" && user.role !== "PLATFORM_SUPER_ADMIN")) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 h-14">
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">
                {(user.tenantName || "A")[0]}
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">{user.tenantName}</p>
                <p className="text-[10px] text-slate-400 leading-tight">Brand Admin</p>
              </div>
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
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:block">{user.name}</span>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
