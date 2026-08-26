"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useInfiniteScrollTrigger } from "@/lib/use-infinite-scroll-trigger";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { repairOrphanedScrollLock } from "@/lib/scroll-lock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppShell } from "@/lib/app-shell-context";
import { useBreadcrumbs } from "@/lib/breadcrumb-context";
import { Breadcrumbs, BreadcrumbItem } from "@/components/Breadcrumbs";
import { isHomePath } from "@/components/app-nav";
import { PulseStatCard, PageLoader, enterpriseTableHead } from "@/components/enterprise-ui";

export { PageLoader, PulseStatCard } from "@/components/enterprise-ui";

export const inputClass =
  "w-full min-h-11 px-3.5 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)] focus:border-[var(--brand)] transition shadow-sm touch-manipulation";

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

/** Searchable single-select — type to filter options, click to pick. */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel,
  disabled,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const t = useTranslations("components.ui");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  function openList() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div ref={containerRef} className={cn("relative min-w-0", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          placeholder={placeholder ?? t("searchPlaceholder")}
          disabled={disabled}
          className={cn(inputClassName ?? inputClass, "pr-9")}
          autoComplete="off"
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]",
            disabled && "opacity-40",
          )}
          aria-hidden
        />
      </div>
      {open && !disabled && (
        <ul
          className="absolute z-[120] mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
          role="listbox"
        >
          <li>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]",
                !value && "bg-[var(--surface-muted)] font-semibold text-[var(--brand-text)]",
              )}
              onClick={() => pick("")}
            >
              {allLabel ?? t("allOptions")}
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[var(--text-tertiary)]">{t("noMatches")}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)] truncate",
                    o.value === value && "bg-[var(--surface-muted)] font-semibold text-[var(--brand-text)]",
                  )}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  showBack,
  breadcrumbs: breadcrumbsOverride,
  breadcrumbsAlwaysVisible = false,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Override auto back link; set false to hide on sub-pages */
  showBack?: boolean;
  /** Override auto breadcrumbs entirely */
  breadcrumbs?: BreadcrumbItem[];
  /** When set, breadcrumbs render on all breakpoints (e.g. drill-down pages on mobile). */
  breadcrumbsAlwaysVisible?: boolean;
}) {
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { homeHref, homeLabel } = useAppShell();
  const autoBreadcrumbs = useBreadcrumbs();
  const breadcrumbs = breadcrumbsOverride ?? autoBreadcrumbs;
  const isSubPage = !isHomePath(pathname, homeHref);
  const shouldShowBack = (showBack ?? isSubPage) && breadcrumbs.length === 0;

  return (
    <div className="space-y-2 min-w-0 max-w-full">
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          items={breadcrumbs}
          testId="page-breadcrumbs"
          className={cn(breadcrumbsAlwaysVisible ? "flex" : "hidden md:flex")}
        />
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
        {action && (
          <div className="shrink-0 flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0 max-w-full justify-stretch sm:justify-end [&_button]:min-h-11">
            {action}
          </div>
        )}
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
        "bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm mp-animate-in transition min-w-0 max-w-full",
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
        "flex items-center gap-3 p-4 rounded-2xl border transition hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] mp-animate-in min-w-0 max-w-full w-full",
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
  const scrollable = options.length > 5;

  return (
    <div
      role="tablist"
      className={cn(
        "p-1 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)] w-full max-w-full min-w-0",
        scrollable
          ? "flex gap-0.5 overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar"
          : "grid gap-0.5"
      )}
      style={scrollable ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center justify-center gap-1 px-2 py-2.5 text-[10px] sm:text-sm font-semibold rounded-lg transition touch-manipulation min-h-11",
              scrollable ? "flex-none min-w-[4.5rem] whitespace-nowrap" : "min-w-0 w-full",
              active
                ? "bg-[var(--surface)] text-[var(--brand-text)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
            <span className={scrollable ? undefined : "truncate"}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const STATUS_KEYS = new Set([
  "COMPLETED",
  "CONFIRMED",
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
  "SENT",
  "SKIPPED",
  "FAILED",
  "SENDING",
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
    status === "COMPLETED" || status === "APPROVED" || status === "READY_FOR_BILLING" || status === "SENT"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
      : status === "PRESENT" || status === "IN_PROGRESS" || status === "INFO" || status === "SENDING"
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800"
        : status === "PENDING" || status === "MEDIUM" || status === "DRAFT" || status === "CONFIRMED" || status === "SKIPPED"
          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
          : status === "CANCELLED" || status === "REJECTED" || status === "ABSENT" || status === "HIGH" || status === "FAILED"
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
    error:
      "border-[var(--border)] border-l-4 border-l-red-600 bg-[var(--surface)] text-[var(--text-primary)] dark:border-l-red-500",
    success:
      "border-[var(--border)] border-l-4 border-l-emerald-600 bg-[var(--surface)] text-[var(--text-primary)] dark:border-l-emerald-500",
    warning:
      "border-[var(--border)] border-l-4 border-l-amber-600 bg-[var(--surface)] text-[var(--text-primary)] dark:border-l-amber-500",
    info:
      "border-[var(--border)] border-l-4 border-l-[var(--brand)] bg-[var(--surface)] text-[var(--text-primary)]",
  };
  return (
    <div className={cn("text-sm rounded-xl px-4 py-3 shadow-sm", styles[variant])}>{children}</div>
  );
}

/** High-contrast inline notice — readable on any tenant brand color. */
export function Callout({
  title,
  children,
  icon,
  variant = "info",
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "info" | "success" | "warning" | "insight";
  className?: string;
}) {
  const accents = {
    info: "border-l-[var(--brand)]",
    success: "border-l-emerald-600 dark:border-l-emerald-500",
    warning: "border-l-amber-600 dark:border-l-amber-500",
    insight: "border-l-amber-600 dark:border-l-amber-500",
  };
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface)] px-3.5 py-3 shadow-sm",
        accents[variant],
        className
      )}
    >
      <div className="flex gap-2.5">
        {icon ? <div className="shrink-0 mt-0.5 text-[var(--text-secondary)]">{icon}</div> : null}
        <div className="min-w-0 space-y-1">
          {title ? (
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words">{title}</p>
          ) : null}
          {children ? (
            <div className="text-sm text-[var(--text-secondary)] leading-snug space-y-1">{children}</div>
          ) : null}
        </div>
      </div>
    </div>
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
        "w-full max-w-full min-w-0 block px-3 sm:px-4 py-3 text-left transition border-b border-[var(--border)] last:border-0",
        onClick && "hover:bg-[var(--surface-muted)] active:bg-[var(--brand-light)]",
        !onClick && "hover:bg-[var(--surface-muted)]/50"
      )}
    >
      <div className="flex items-start justify-between gap-x-2 gap-y-1 min-w-0">
        {meta}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-[var(--text-primary)] leading-snug truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 sm:line-clamp-1 sm:truncate">{subtitle}</p>
          )}
        </div>
        {trailing && (
          <div className="shrink-0 text-right pl-1 min-w-0 max-w-[46%] sm:max-w-[42%] [&_p]:truncate [&_span]:truncate">
            {trailing}
          </div>
        )}
      </div>
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
    <div
      className={cn(
        "grid gap-2 min-w-0",
        columns === 3 ? "grid-cols-1 min-[420px]:grid-cols-3" : "grid-cols-2"
      )}
    >
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
      <div className="md:hidden min-w-0 max-w-full w-full">{mobile}</div>
      <div className={cn("hidden md:block responsive-table-wrap min-w-0 max-w-full", className)}>{children}</div>
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

  useScrollLock(open);

  useEffect(() => {
    if (open) return;
    repairOrphanedScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-[var(--border)] shrink-0 pt-[max(1rem,env(safe-area-inset-top,0px))] max-sm:pt-4">
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
        <div className="flex-1 overflow-y-auto p-4 overscroll-contain touch-scroll-y" data-touch-scroll>{children}</div>
        {footer && (
          <div className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/50 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Centered confirmation modal — replaces native browser confirm for in-app flows. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmPending = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmPending?: boolean;
}) {
  const tCommon = useTranslations("common");

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, confirmPending]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!confirmPending) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 id="confirm-dialog-title" className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          <div className="text-sm text-[var(--text-secondary)] mt-2 space-y-2">{description}</div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={confirmPending}
            className={`${btnSecondary} w-full sm:w-auto`}
          >
            {cancelLabel ?? tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmPending}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            {confirmLabel}
          </button>
        </div>
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
    <div className={cn("hero-banner relative overflow-hidden rounded-2xl p-4 sm:p-5 shadow-xl mp-animate-in min-w-0 max-w-full w-full", className)}>
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

export function InfiniteScrollFooter({
  totalElements,
  loadedCount,
  hasMore,
  isFetchingNextPage,
  isLoading,
  onLoadMore,
}: {
  totalElements: number;
  loadedCount: number;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
}) {
  const t = useTranslations("components.ui");
  const sentinelRef = useInfiniteScrollTrigger(onLoadMore, !hasMore || isFetchingNextPage || !!isLoading);

  return (
    <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/50">
      <div className="flex flex-col items-center gap-1.5 text-sm text-[var(--text-secondary)]">
        <span data-testid="infinite-list-count">
          {totalElements > 0
            ? t("loadedRows", { loaded: loadedCount, total: totalElements })
            : t("rows", { count: 0 })}
        </span>
        {isFetchingNextPage && (
          <span data-testid="infinite-list-loading" className="text-xs text-[var(--text-tertiary)]">
            {t("loadingMore")}
          </span>
        )}
        {!hasMore && loadedCount > 0 && !isLoading && (
          <span data-testid="infinite-list-end" className="text-xs text-[var(--text-tertiary)]">
            {t("endOfList")}
          </span>
        )}
        <div ref={sentinelRef} data-testid="infinite-scroll-sentinel" className="h-1 w-full shrink-0" aria-hidden />
      </div>
    </div>
  );
}

export type ColumnFilter =
  | { type: "none" }
  | { type: "text"; placeholder?: string; value: string; onChange: (v: string) => void }
  | { type: "select"; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }
  | {
      type: "searchable-select";
      value: string;
      onChange: (v: string) => void;
      options: { value: string; label: string }[];
      placeholder?: string;
      allLabel?: string;
      disabled?: boolean;
    }
  | { type: "date"; value: string; onChange: (v: string) => void };

type FilterableColumn = { label: string; filterLabel?: string; filter?: ColumnFilter };

function renderColumnFilter(
  filter: ColumnFilter,
  t: ReturnType<typeof useTranslations>,
  size: "sm" | "md" = "sm"
) {
  const compact = size === "sm";
  const inputCls = compact ? `${inputClass} py-1.5 text-xs w-full min-w-0` : `${inputClass} py-2.5 text-sm w-full min-w-0`;
  const selectCls = compact ? `${selectClass} py-1.5 text-xs w-full min-w-0` : `${selectClass} py-2.5 text-sm w-full min-w-0`;

  if (filter.type === "text") {
    return (
      <input
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        placeholder={filter.placeholder ?? t("filter")}
        className={inputCls}
      />
    );
  }
  if (filter.type === "select") {
    return (
      <select value={filter.value} onChange={(e) => filter.onChange(e.target.value)} className={selectCls}>
        {filter.options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (filter.type === "searchable-select") {
    return (
      <SearchableSelect
        value={filter.value}
        onChange={filter.onChange}
        options={filter.options}
        placeholder={filter.placeholder}
        allLabel={filter.allLabel}
        disabled={filter.disabled}
        inputClassName={inputCls}
      />
    );
  }
  if (filter.type === "date") {
    return (
      <input
        type="date"
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className={inputCls}
      />
    );
  }
  return null;
}

/** Toolbar filters for wide tables — keeps header columns aligned with body rows. */
export function TableFilterToolbar({
  columns,
  className,
}: {
  columns: FilterableColumn[];
  className?: string;
}) {
  const t = useTranslations("components.ui");
  const active = columns.filter((c) => c.filter && c.filter.type !== "none");
  if (active.length === 0) return null;

  return (
    <div
      className={cn(
        "px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 border-b border-[var(--border)] bg-[var(--surface)]",
        className
      )}
      data-testid="table-filter-toolbar"
    >
      {active.map((col) => (
        <label key={col.label} className="block min-w-0 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            {col.filterLabel ?? col.label}
          </span>
          {renderColumnFilter(col.filter!, t, "md")}
        </label>
      ))}
    </div>
  );
}

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
      className="md:hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3 shadow-sm"
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
              {filter.type === "searchable-select" && (
                <SearchableSelect
                  value={filter.value}
                  onChange={filter.onChange}
                  options={filter.options}
                  placeholder={filter.placeholder}
                  allLabel={filter.allLabel}
                  disabled={filter.disabled}
                  inputClassName={`${inputClass} py-2.5 text-sm`}
                />
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
  filterPlacement = "header",
}: {
  columns: FilterableColumn[];
  children: React.ReactNode;
  className?: string;
  /** Use "toolbar" for wide tables so filters do not stretch column widths in thead. */
  filterPlacement?: "header" | "toolbar";
}) {
  const t = useTranslations("components.ui");
  const hasFilters = columns.some((c) => c.filter && c.filter.type !== "none");
  const useToolbarFilters = filterPlacement === "toolbar" && hasFilters;

  const table = (
    <table className={cn("w-full text-sm", className)}>
      <thead>
        <tr className="text-left border-b border-[var(--border)] bg-[var(--brand-muted)]">
          {columns.map((col) => (
            <th key={col.label} className={cn("px-4 py-3 whitespace-nowrap", enterpriseTableHead)}>
              {col.label}
            </th>
          ))}
        </tr>
        {hasFilters && !useToolbarFilters && (
          <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
            {columns.map((col) => {
              const filter = col.filter;
              return (
                <th key={`${col.label}-filter`} className="px-2 py-2 font-normal align-top">
                  {filter && filter.type !== "none" ? renderColumnFilter(filter, t, "sm") : null}
                </th>
              );
            })}
          </tr>
        )}
      </thead>
      <tbody>{children}</tbody>
    </table>
  );

  if (useToolbarFilters) {
    return (
      <>
        <TableFilterToolbar columns={columns} />
        {table}
      </>
    );
  }

  return table;
}
