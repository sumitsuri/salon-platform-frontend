"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserPlus, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";
import {
  PageHeader,
  Card,
  StatusBadge,
  EmptyState,
  btnPrimary,
  StatCard,
  FilterableTable,
  TablePagination,
  AvatarInitial,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";

const STATUSES = ["", "COMPLETED", "IN_PROGRESS", "READY_FOR_BILLING", "CANCELLED", "DRAFT"];

type Filters = {
  customer: string;
  service: string;
  stylist: string;
  amount: string;
  status: string;
  date: string;
};

const emptyFilters: Filters = {
  customer: "",
  service: "",
  stylist: "",
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

export default function ManagerBookingsPage() {
  const t = useTranslations("manager.bookings");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("components.status");
  const branchId = useAuthStore((s) => s.user?.branchId) || "";
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setPage(0);
  }, [debounced, size, branchId]);

  const amountFilter = parseAmount(debounced.amount);

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", branchId, debounced, page, size],
    queryFn: () =>
      api.getBookings({
        branchId,
        customer: debounced.customer || undefined,
        service: debounced.service || undefined,
        stylist: debounced.stylist || undefined,
        status: debounced.status || undefined,
        minAmount: amountFilter.minAmount,
        maxAmount: amountFilter.maxAmount,
        dateFrom: debounced.date || undefined,
        dateTo: debounced.date || undefined,
        page,
        size,
      }),
    enabled: !!branchId,
  });

  const bookings = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const active = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED");
  const totalRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const columns = [
    {
      label: t("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.namePhone"),
        value: filters.customer,
        onChange: (v: string) => updateFilter("customer", v),
      },
    },
    {
      label: t("columns.services"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.service"),
        value: filters.service,
        onChange: (v: string) => updateFilter("service", v),
      },
    },
    {
      label: t("columns.stylist"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.stylist"),
        value: filters.stylist,
        onChange: (v: string) => updateFilter("stylist", v),
      },
    },
    {
      label: t("columns.amount"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.amount"),
        value: filters.amount,
        onChange: (v: string) => updateFilter("amount", v),
      },
    },
    {
      label: t("columns.status"),
      filter: {
        type: "select" as const,
        value: filters.status,
        onChange: (v: string) => updateFilter("status", v),
        options: STATUSES.map((s) => ({
          value: s,
          label: s ? tStatus(s as "COMPLETED") : t("filters.all"),
        })),
      },
    },
    {
      label: t("columns.time"),
      filter: {
        type: "date" as const,
        value: filters.date,
        onChange: (v: string) => updateFilter("date", v),
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle", {
          count: totalElements,
          page: totalPages === 0 ? 0 : page + 1,
          totalPages: totalPages || 1,
        })}
        action={
          <Link href="/manager/walk-in" className={`${btnPrimary} py-2.5 px-4 hidden sm:inline-flex`}>
            <UserPlus className="w-4 h-4" />
            {t("walkIn")}
          </Link>
        }
      />

      <MissionStrip />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t("revenuePage")} value={formatCurrency(totalRevenue)} icon={IndianRupee} accent="brand" />
        <StatCard label={t("completed")} value={completed.length} icon={CheckCircle2} accent="emerald" />
        <StatCard label={t("active")} value={active.length} icon={Clock} accent="amber" />
      </div>

      <Card padding={false}>
        {isLoading && <p className="p-4 text-[var(--text-secondary)] text-sm">{tCommon("loading")}</p>}
        {!isLoading && bookings.length === 0 ? (
          <EmptyState
            title={t("noBookingsTitle")}
            description={t("noBookingsDesc")}
            action={
              <Link href="/manager/walk-in" className={btnPrimary}>
                <UserPlus className="w-4 h-4" />
                {t("newWalkIn")}
              </Link>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <FilterableTable columns={columns}>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AvatarInitial name={b.customerName} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{b.customerName}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{b.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {b.lines?.map((l) => (
                          <span
                            key={l.id}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--brand-light)] text-[var(--brand-text)]"
                          >
                            {l.serviceName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {b.lines?.map((l) => l.staffName).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </FilterableTable>
            </div>

            <div className="md:hidden divide-y divide-[var(--border)]">
              {bookings.map((b) => (
                <div key={b.id} className="px-4 py-3 flex gap-3">
                  <AvatarInitial name={b.customerName} />
                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <p className="font-semibold text-sm text-[var(--text-primary)] truncate col-span-1">
                      {b.customerName}
                    </p>
                    <p className="font-bold text-sm text-[var(--text-primary)] text-right">
                      {b.billPreview ? formatCurrency(b.billPreview.grandTotal) : "—"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] col-span-2">
                      {new Date(b.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {b.lines?.map((l) => l.serviceName).join(", ")}
                    </p>
                    <div className="col-span-2 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {b.lines?.map((l) => l.staffName).filter(Boolean).join(", ")}
                      </span>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <TablePagination
          page={page}
          size={size}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={setPage}
          onSizeChange={setSize}
        />
      </Card>
    </div>
  );
}
