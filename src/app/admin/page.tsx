"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { BranchTrends } from "@/components/BranchTrends";

type Period = "all" | "days60" | "month" | "week" | "today";

function periodToRange(period: Period): { startDate?: string; endDate?: string } {
  if (period === "all") return {};
  const today = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (period === "today") return { startDate: fmt(today), endDate: fmt(today) };
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  if (period === "days60") {
    const start = new Date(today);
    start.setDate(start.getDate() - 59);
    return { startDate: fmt(start), endDate: fmt(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { startDate: fmt(start), endDate: fmt(today) };
}

const PERIOD_LABELS: Record<Period, string> = {
  all: "All Time",
  days60: "Last 60 Days",
  month: "This Month",
  week: "Last 7 Days",
  today: "Today",
};

export default function AdminDashboardPage() {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("days60");
  const [initialized, setInitialized] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branches.length > 0 && !initialized) {
      setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, initialized]);

  const dateRange = periodToRange(period);

  const { data: dashboard, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", selectedBranches, period],
    queryFn: () =>
      api.getDashboard({
        ...dateRange,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  if (!initialized) return <p className="text-slate-400">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">CEO Dashboard</h1>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400">Updating...</span>
          )}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-300 shadow-sm transition"
          >
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </select>
          <BranchMultiSelect
            branches={branches}
            selected={selectedBranches}
            onChange={setSelectedBranches}
          />
        </div>
      </div>

      {selectedBranches.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-slate-400">
          Select at least one branch to view data
        </div>
      ) : isLoading || !dashboard ? (
        <p className="text-slate-400">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: formatCurrency(dashboard.totalRevenue) },
              { label: "Visits", value: dashboard.totalVisits },
              { label: "Avg Ticket", value: formatCurrency(dashboard.avgTicketSize) },
              { label: "Discounts", value: formatCurrency(dashboard.totalDiscounts) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                <p className="text-sm text-slate-500">{s.label}</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {dashboard.branchTrends && dashboard.branchTrends.length > 0 && (
            <BranchTrends trends={dashboard.branchTrends} />
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h2 className="font-semibold mb-4 text-slate-800">Branch Comparison</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2">Branch</th>
                    <th>Revenue</th>
                    <th>Visits</th>
                    <th>Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.branchStats.map((b) => (
                    <tr key={b.branchId} className="border-t border-slate-50">
                      <td className="py-2 font-medium">{b.branchName}</td>
                      <td>{formatCurrency(b.revenue)}</td>
                      <td>{b.visits}</td>
                      <td>{formatCurrency(b.avgTicket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h2 className="font-semibold mb-4 text-slate-800">Staff Leaderboard</h2>
              {dashboard.topStaff.length === 0 && (
                <p className="text-slate-400 text-sm py-4">No staff data for selected branches</p>
              )}
              {dashboard.topStaff.map((s, i) => (
                <div key={s.staffId} className="flex justify-between py-2 border-t border-slate-50 text-sm">
                  <span>
                    {i + 1}. {s.staffName}{" "}
                    <span className="text-slate-400">({s.branchName})</span>
                  </span>
                  <span className="font-semibold">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h2 className="font-semibold mb-4 text-slate-800">Top Services</h2>
              {dashboard.topServices.length === 0 && (
                <p className="text-slate-400 text-sm py-4">No service data for selected branches</p>
              )}
              {dashboard.topServices.map((s) => (
                <div key={s.serviceName} className="flex justify-between py-2 border-t border-slate-50 text-sm">
                  <span>{s.serviceName} ({s.count})</span>
                  <span className="font-semibold">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <h2 className="font-semibold mb-4 text-slate-800">Payment Mix</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span>Cash</span>
                  <span className="font-semibold">{formatCurrency(dashboard.paymentMix.cash)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>UPI</span>
                  <span className="font-semibold">{formatCurrency(dashboard.paymentMix.upi)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Card</span>
                  <span className="font-semibold">{formatCurrency(dashboard.paymentMix.card)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
