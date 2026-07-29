"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useAppShell } from "@/lib/app-shell-context";
import { useBreadcrumbs } from "@/lib/breadcrumb-context";
import { Breadcrumbs, BreadcrumbItem } from "@/components/Breadcrumbs";
import { isHomePath } from "@/components/app-nav";
import { PulseStatCard, PageLoader, enterpriseTableHead } from "@/components/enterprise-ui";

export { PageLoader, PulseStatCard } from "@/components/enterprise-ui";

export const inputClass =
  "w-full px-3.5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] transition shadow-sm";

export const selectClass = inputClass;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--brand)] hover:opacity-90 active:opacity-80 text-[var(--brand-on-brand)] font-semibold rounded-xl shadow-sm transition disabled:opacity-40 disabled:pointer-events-none text-sm";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl transition text-sm";

/** Dense toolbar / table actions — prefer over ad-hoc padding overrides. */
export const btnPrimarySm =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[var(--brand)] hover:opacity-90 active:opacity-80 text-[var(--brand-on-brand)] font-semibold rounded-xl shadow-sm transition disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm";

export const btnSecondarySm =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[var(--surface)] hover:bg-[var(--surface-muted)] border border-[var(--border)] text-[var(--text-primary)] font-medium rounded-xl transition text-xs sm:text-sm";

export const btnDangerSm =
  "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm";

export function PageHeader({
  title,
  subtitle,
  action,
  showBack,
  breadcrumbs: breadcrumbsOverride,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Override auto back link; set false to hide on sub-pages */
  showBack?: boolean;
  /** Override auto breadcrumbs entirely */
  breadcrumbs?: BreadcrumbItem[];
}) {
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { homeHref, homeLabel } = useAppShell();
  const autoBreadcrumbs = useBreadcrumbs();
  const breadcrumbs = breadcrumbsOverride ?? autoBreadcrumbs;
  const isSubPage = !isHomePath(pathname, homeHref);
  const shouldShowBack = (showBack ?? isSubPage) && breadcrumbs.length === 0;

  return (
    <div className="space-y-2">
      {breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} testId="page-breadcrumbs" className="hidden md:flex" />
      )}
      {shouldShowBack && (
        <Link
          href={homeHref}
          data-testid="page-back-link"
          className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-text)] hover:opacity-80 touch-manipulation -ml-0.5"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span>{tCommon("backTo", { page: homeLabel })}</span>
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5 line-clamp-2 sm:truncate">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">{action}</div>}
      </div>
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
        "bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm mp-animate-in transition",
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
  icon,
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
  return (
    <PulseStatCard
      label={label}
      value={value}
      icon={icon}
      accent={accent}
      trend={trend}
      className={className}
    />
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
        "flex items-center gap-3 p-4 rounded-2xl border transition hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] mp-animate-in",
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
            "flex-none sm:flex-1 min-w-[4.75rem] sm:min-w-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-[11px] sm:text-sm font-semibold rounded-lg transition whitespace-nowrap touch-manipulation min-h-11",
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
    status === "COMPLETED" || status === "APPROVED" || status === "READY_FOR_BILLING"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
      : status === "PRESENT" || status === "IN_PROGRESS" || status === "INFO"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
        : status === "PENDING" || status === "MEDIUM" || status === "DRAFT"
          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
          : status === "CANCELLED" || status === "REJECTED" || status === "ABSENT" || status === "HIGH"
            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800"
            : status === "LOW"
              ? "bg-[var(--brand-light)] text-[var(--brand-text)] border-[var(--brand-ring)]"
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
  variant?: "error" | "success" | "warning" | "info";
}) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300",
    warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300",
    info: "bg-[var(--brand-light)] border-[var(--brand-ring)] text-[var(--brand-text)]",
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
        onClick && "hover:bg-[var(--surface-muted)] active:bg-[var(--brand-light)]",
        !onClick && "hover:bg-[var(--surface-muted)]/50"
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

/** Two-up stat grid for mobile table cards — label on top, value below. */
export function MobileStatGrid({
  items,
  columns = 2,
}: {
  items: { label: string; value: React.ReactNode; accentClass?: string }[];
  columns?: 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-2.5 min-w-0"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] truncate">
            {item.label}
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums mt-1 truncate",
              item.accentClass ?? "text-[var(--text-primary)]"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** PWA-native split: stacked cards on phone, horizontal table from md+. */
export function ResponsiveTableShell({
  mobile,
  children,
  className,
}: {
  mobile: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className="md:hidden">{mobile}</div>
      <div className={cn("hidden md:block responsive-table-wrap", className)}>{children}</div>
    </>
  );
}

export function DataTable({
  headers,
  children,
  mobile,
  className,
}: {
  headers: string[];
  children: React.ReactNode;
  mobile: React.ReactNode;
  className?: string;
}) {
  return (
    <ResponsiveTableShell mobile={mobile} className={className}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-[var(--border)] bg-[var(--brand-muted)]">
            {headers.map((h) => (
              <th key={h} className={cn("px-4 py-3 whitespace-nowrap", enterpriseTableHead)}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </ResponsiveTableShell>
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("closePanel")}
      />
      <div
        className={cn(
          "relative w-full h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200",
          wide ? "max-w-xl" : "max-w-md",
          "max-sm:max-w-none"
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
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] shrink-0 touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain">{children}</div>
        {footer && (
          <div className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/50 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
  return (
    <div className={cn("hero-banner relative overflow-hidden rounded-2xl p-5 shadow-xl mp-animate-in", className)}>
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl mp-pulse-glow" />
      <div className="relative">{children}</div>
    </div>
  );
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
          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 hover:bg-[var(--surface-muted)] touch-manipulation min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] disabled:opacity-40 hover:bg-[var(--surface-muted)] touch-manipulation min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
          aria-label={t("nextPage")}
        >
          <ChevronRight className="w-4 h-4" />
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

/** Mobile filter stack — pairs with desktop FilterableTable. */
export function MobileFilterPanel({
  columns,
  open,
}: {
  columns: { label: string; filter?: ColumnFilter }[];
  open: boolean;
}) {
  const t = useTranslations("components.ui");
  if (!open) return null;
  const active = columns.filter((c) => c.filter && c.filter.type !== "none");
  if (active.length === 0) return null;

  return (
    <div
      className="lg:hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3 shadow-sm"
      data-testid="mobile-filter-panel"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {active.map((col) => {
          const filter = col.filter!;
          return (
            <label key={col.label} className="block space-y-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {col.label}
              </span>
              {filter.type === "text" && (
                <input
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  placeholder={filter.placeholder ?? t("filter")}
                  className={`${inputClass} py-2.5 text-sm`}
                />
              )}
              {filter.type === "select" && (
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={`${selectClass} py-2.5 text-sm`}
                >
                  {filter.options.map((o) => (
                    <option key={o.value || "all"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              {filter.type === "date" && (
                <input
                  type="date"
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={`${inputClass} py-2.5 text-sm`}
                />
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

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
    <table className={cn("w-full text-sm", className)}>
        <thead>
          <tr className="text-left border-b border-[var(--border)] bg-[var(--brand-muted)]">
            {columns.map((col) => (
              <th key={col.label} className={cn("px-4 py-3 whitespace-nowrap", enterpriseTableHead)}>
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
  );
}
