"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { UserPlus, TrendingUp, Users, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";

export default function ManagerHomePage() {
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", branchId],
    queryFn: () => api.getBookings({ branchId, page: 0, size: 50 }),
    enabled: !!branchId,
  });
  const bookings = data?.content ?? [];

  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const todayRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);
  const inProgress = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED").length;

  const stats = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: "Completed Visits", value: completed.length, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Today&apos;s Overview</h1>
          <p className="text-sm text-slate-500">{user?.branchName}</p>
        </div>
        <Link href="/manager/walk-in"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition text-sm">
          <UserPlus className="w-4 h-4" />
          New Walk-in
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", s.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Recent Visits</h2>
          <Link href="/manager/bookings" className="text-sm text-indigo-600 hover:underline">View all</Link>
        </div>
        {isLoading && <p className="p-5 text-slate-400 text-sm">Loading...</p>}
        <div className="divide-y divide-slate-50">
          {bookings.slice(0, 8).map((b) => (
            <div key={b.id} className="px-5 py-3.5 flex justify-between items-center hover:bg-slate-50 transition">
              <div>
                <p className="font-medium text-sm text-slate-800">{b.customerName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {b.customerPhone} · {b.lines?.map((l) => l.serviceName).join(", ")}
                </p>
              </div>
              <div className="text-right">
                {b.billPreview && (
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(b.billPreview.grandTotal)}</p>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full",
                  b.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {b.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
          {!isLoading && bookings.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-10">No visits yet. Start a walk-in!</p>
          )}
        </div>
      </div>
    </div>
  );
}
