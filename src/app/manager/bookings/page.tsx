"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";

export default function ManagerBookingsPage() {
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const { data, isLoading } = useQuery({
    queryKey: ["bookings", branchId],
    queryFn: () => api.getBookings({ branchId, page: 0, size: 50 }),
    enabled: !!branchId,
  });
  const bookings = data?.content ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Bookings</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading && <p className="p-5 text-slate-400 text-sm">Loading...</p>}
        <div className="divide-y divide-slate-50">
          {bookings.map((b) => (
            <div key={b.id} className="px-5 py-4 flex justify-between items-center hover:bg-slate-50 transition">
              <div>
                <p className="font-medium text-sm text-slate-800">{b.customerName}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(b.createdAt).toLocaleString("en-IN")} · {b.lines?.map((l) => l.serviceName).join(", ")}
                </p>
              </div>
              <div className="text-right">
                {b.billPreview && (
                  <p className="text-sm font-semibold">{formatCurrency(b.billPreview.grandTotal)}</p>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full",
                  b.status === "COMPLETED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                  {b.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          ))}
          {!isLoading && bookings.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-12">No bookings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
