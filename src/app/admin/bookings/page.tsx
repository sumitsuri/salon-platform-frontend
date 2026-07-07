"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50, 100] as const;
const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  branch: string;
  amount: string;
  status: string;
  date: string;
};

const emptyFilters: Filters = {
  customer: "",
  branch: "",
  amount: "",
  status: "",
  date: "",
};

function parseAmount(value: string): { minAmount?: number; maxAmount?: number } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const num = Number(trimmed.replace(/[₹,\s]/g, ""));
  if (Number.isNaN(num)) return {};
  return { minAmount: num, maxAmount: num };
}

export default function AdminBookingsPage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    setPage(0);
  }, [debounced, size]);

  const amountFilter = parseAmount(debounced.amount);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["all-bookings", debounced, page, size],
    queryFn: () =>
      api.getBookings({
        customer: debounced.customer || undefined,
        branch: debounced.branch || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size,
      }),
  });

  const bookings = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Bookings</h1>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3 font-medium text-slate-600">Customer</th>
                <th className="p-3 font-medium text-slate-600">Branch</th>
                <th className="p-3 font-medium text-slate-600">Amount</th>
                <th className="p-3 font-medium text-slate-600">Status</th>
                <th className="p-3 font-medium text-slate-600">Date</th>
              </tr>
              <tr className="border-t border-slate-200 bg-white">
                <th className="p-2">
                  <input
                    value={filters.customer}
                    onChange={(e) => updateFilter("customer", e.target.value)}
                    placeholder="Name or phone"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-normal"
                  />
                </th>
                <th className="p-2">
                  <input
                    value={filters.branch}
                    onChange={(e) => updateFilter("branch", e.target.value)}
                    placeholder="Branch name"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-normal"
                  />
                </th>
                <th className="p-2">
                  <input
                    value={filters.amount}
                    onChange={(e) => updateFilter("amount", e.target.value)}
                    placeholder="Amount"
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-normal"
                  />
                </th>
                <th className="p-2">
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter("status", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-normal bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s || "all"} value={s}>
                        {s || "All statuses"}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="p-2">
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => updateFilter("date", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs font-normal"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Loading bookings...
                  </td>
                </tr>
              )}
              {!isLoading && bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No bookings match your filters
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <span className="font-medium text-slate-800">{b.customerName}</span>
                    <br />
                    <span className="text-slate-400 text-xs">{b.customerPhone}</span>
                  </td>
                  <td className="p-3 text-slate-700">{b.branchName}</td>
                  <td className="p-3 font-medium">
                    {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "-"}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {new Date(b.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Rows per page:</span>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-sm"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-slate-400">
              {isFetching && !isLoading ? "Updating..." : `${totalElements} total`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              Page {totalPages === 0 ? 0 : page + 1} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md border border-slate-200 bg-white disabled:opacity-40 hover:bg-slate-100"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
