"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export const inputClass =
  "w-full px-3.5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] transition shadow-sm";

export const selectClass = inputClass;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--brand)] hover:opacity-90 active:opacity-80 text-[var(--brand-on-brand)] font-semibold rounded-xl shadow-sm transition disabled:opacity-50 disabled:pointer-events-none text-sm";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl transition text-sm";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2 sm:truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm",
        padding && "p-4 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
  trend,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "brand" | "emerald" | "amber" | "violet";
  trend?: string;
  className?: string;
}) {
  const accents = {
    brand: "bg-[var(--brand)] shadow-[var(--brand)]/25",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/25",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/25",
    violet: "from-violet-500 to-violet-600 shadow-violet-500/25",
  };

  return (
    <div className={cn("bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm min-w-0", className)}>
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white",
            accent === "brand" ? accents.brand : `bg-gradient-to-br ${accents[accent]}`
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)] mt-3 tracking-tight">{value}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">{label}</p>
    </div>
  );
}

export function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  color = "brand",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  color?: "brand" | "emerald" | "amber" | "violet";
}) {
  const colors = {
    brand: "bg-[var(--brand-light)] text-[var(--brand-text)] border-[var(--brand-muted)]",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900",
    amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900",
    violet: "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/50 dark:text-violet-400 dark:border-violet-900",
  };

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border transition active:scale-[0.98]",
        colors[color]
      )}
    >
      <div className="w-11 h-11 rounded-xl bg-[var(--surface)] flex items-center justify-center shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm">{label}</p>
        {description && <p className="text-xs opacity-70 mt-0.5">{description}</p>}
      </div>
    </Link>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-[var(--surface-muted)] rounded-xl overflow-x-auto no-scrollbar border border-[var(--border)] w-full">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-none sm:flex-1 min-w-[4.5rem] sm:min-w-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition whitespace-nowrap",
              active
                ? "bg-[var(--surface)] text-[var(--brand-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const STATUS_KEYS = new Set([
  "COMPLETED",
  "IN_PROGRESS",
  "READY_FOR_BILLING",
  "CANCELLED",
  "DRAFT",
  "PRESENT",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "ABSENT",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
]);

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const t = useTranslations("components.status");
  const label = STATUS_KEYS.has(status) ? t(status as "COMPLETED") : status.replace(/_/g, " ");
  const style =
    status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
      : status === "PRESENT"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
        : status === "APPROVED"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
          : status === "PENDING"
            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
            : "bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--border)]";

  return (
    <span className={cn("text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border", style, className)}>
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 px-4 text-center">
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AlertBanner({
  children,
  variant = "error",
}: {
  children: React.ReactNode;
  variant?: "error" | "success" | "warning";
}) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
    warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300",
  };
  return (
    <div className={cn("text-sm border rounded-xl px-4 py-3", styles[variant])}>{children}</div>
  );
}

export function ListRow({
  title,
  subtitle,
  trailing,
  onClick,
  meta,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  meta?: React.ReactNode;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-[var(--border)] last:border-0",
        onClick && "hover:bg-[var(--surface-muted)] active:bg-[var(--brand-light)]"
      )}
    >
      {meta}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-[var(--text-primary)] truncate">{title}</p>
        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-right">{trailing}</div>}
    </Comp>
  );
}

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--surface-muted)]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Right-side panel for create/edit/detail flows (enterprise drawer pattern). */
export function SideSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const t = useTranslations("components.ui");
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("closePanel")}
      />
      <div
        className={cn(
          "relative w-full h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col",
          wide ? "max-w-xl" : "max-w-md"
        )}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-[var(--border)] shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-[var(--text-primary)] truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] shrink-0"
            aria-label={t("close")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/50 space-y-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-[var(--text-primary)]">{value ?? "—"}</p>
    </div>
  );
}

export function AvatarInitial({ name, className }: { name: string; className?: string }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div
      className={cn(
        "w-9 h-9 rounded-full bg-[var(--brand-light)] text-[var(--brand-text)] font-bold text-sm flex items-center justify-center shrink-0",
        className
      )}
    >
      {initial}
    </div>
  );
}

export function HeroBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("hero-banner rounded-2xl p-5 shadow-lg", className)}>{children}</div>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label mb-2 px-0.5">{children}</p>;
}

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export function TablePagination({
  page,
  size,
  totalPages,
  totalElements,
  onPageChange,
  onSizeChange,
}: {
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}) {
  const t = useTranslations("components.ui");
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/50">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>{t("rows", { count: totalElements })}</span>
        <span className="text-[var(--text-tertiary)]">·</span>
        <span>{t("perPage")}</span>
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className={`${selectClass} py-1.5 w-auto min-w-[4rem]`}
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--text-secondary)]">
          {totalPages === 0 ? 0 : page + 1} / {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 hover:bg-[var(--surface-muted)]"
          aria-label={t("previousPage")}
        >
          ‹
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 hover:bg-[var(--surface-muted)]"
          aria-label={t("nextPage")}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export type ColumnFilter =
  | { type: "none" }
  | { type: "text"; placeholder?: string; value: string; onChange: (v: string) => void }
  | { type: "select"; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }
  | { type: "date"; value: string; onChange: (v: string) => void };

export function FilterableTable({
  columns,
  children,
  className,
}: {
  columns: { label: string; filter?: ColumnFilter }[];
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("components.ui");
  const hasFilters = columns.some((c) => c.filter && c.filter.type !== "none");

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border)] bg-[var(--surface-muted)]">
            {columns.map((col) => (
              <th key={col.label} className="px-4 py-2.5 font-semibold text-xs uppercase tracking-wide whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
          {hasFilters && (
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {columns.map((col) => {
                const filter = col.filter;
                return (
                <th key={`${col.label}-filter`} className="px-2 py-2 font-normal">
                  {filter?.type === "text" && (
                    <input
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      placeholder={filter.placeholder ?? t("filter")}
                      className={`${inputClass} py-1.5 text-xs w-full min-w-0`}
                    />
                  )}
                  {filter?.type === "select" && (
                    <select
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className={`${selectClass} py-1.5 text-xs w-full min-w-0`}
                    >
                      {filter.options.map((o) => (
                        <option key={o.value || "all"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {filter?.type === "date" && (
                    <input
                      type="date"
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className={`${inputClass} py-1.5 text-xs w-full min-w-0`}
                    />
                  )}
                </th>
              );})}
            </tr>
          )}
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
