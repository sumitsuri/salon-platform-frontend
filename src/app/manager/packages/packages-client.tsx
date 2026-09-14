"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gift, Plus } from "lucide-react";
import {
  api,
  CreateServicePackagePlanRequest,
  CustomerPackageSubscription,
  ServicePackagePlan,
} from "@/lib/api";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { formatCurrency, cn } from "@/lib/utils";
import { formatPackageInclusions } from "@/lib/package-inclusions";
import { discountPercentFromPrice } from "@/lib/package-pricing";
import {
  getExpiringThisMonthRange,
  getExpiringThisWeekRange,
  todayIsoDate,
} from "@/lib/date-range";
import { DataListPanel } from "@/components/DataListPanel";
import {
  PageHeader,
  AlertBanner,
  btnPrimary,
  btnSecondary,
  btnSecondarySm,
  inputClass,
  selectClass,
  FilterableTable,
  MobileFilterPanel,
  ResponsiveTableShell,
  TablePagination,
} from "@/components/ui";
import { PackagePlanFormSheet, type PackagePlanFormValues } from "./PackagePlanFormSheet";
import type { PackagePlanItemDraft } from "./package-plan-types";

type ExpiringWindow = "week" | "month" | "custom";

type PlanFilters = {
  name: string;
  status: string;
  redemption: string;
};

const emptyPlanFilters: PlanFilters = { name: "", status: "", redemption: "" };

function expiringQueryRange(
  window: ExpiringWindow,
  customFrom: string,
  customTo: string
): { expiresFrom: string; expiresTo: string } {
  if (window === "month") {
    const { from, to } = getExpiringThisMonthRange();
    return { expiresFrom: from, expiresTo: to };
  }
  if (window === "custom") {
    const from = customFrom || todayIsoDate();
    const to = customTo || from;
    return { expiresFrom: from, expiresTo: to >= from ? to : from };
  }
  const { from, to } = getExpiringThisWeekRange();
  return { expiresFrom: from, expiresTo: to };
}

function draftsFromPlan(plan: ServicePackagePlan): PackagePlanItemDraft[] {
  return (plan.items ?? []).map((item, idx) => ({
    serviceId: item.serviceId,
    serviceName: item.serviceName || "Service",
    quantity: item.quantity,
    sortOrder: item.sortOrder ?? idx,
  }));
}

function formFromPlan(plan: ServicePackagePlan): PackagePlanFormValues {
  return {
    name: plan.name,
    validityDays: plan.validityDays,
    singleVisit: plan.redemptionMode === "SINGLE_VISIT",
    discountPercent: discountPercentFromPrice(plan.listPriceTotal, plan.packagePrice),
    packagePrice: plan.packagePrice,
    items: draftsFromPlan(plan),
  };
}

const emptyForm: PackagePlanFormValues = {
  name: "",
  validityDays: 90,
  singleVisit: false,
  discountPercent: 15,
  packagePrice: 0,
  items: [],
};

function planFiltersActive(f: PlanFilters) {
  return Object.values(f).some((v) => v !== "");
}

export default function ManagerPackagesClient() {
  const t = useTranslations("manager.packages");
  const tCommon = useTranslations("common");
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthHydrated();
  const branchId = user?.branchId || "";
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"plans" | "expiring">("plans");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PackagePlanFormValues>(emptyForm);
  const [planFilters, setPlanFilters] = useState<PlanFilters>(emptyPlanFilters);
  const [debouncedPlanFilters, setDebouncedPlanFilters] = useState<PlanFilters>(emptyPlanFilters);
  const [showPlanFilters, setShowPlanFilters] = useState(false);
  const filtersReady = useRef(false);
  const [expiringWindow, setExpiringWindow] = useState<ExpiringWindow>("week");
  const [customExpiresFrom, setCustomExpiresFrom] = useState(todayIsoDate());
  const [customExpiresTo, setCustomExpiresTo] = useState(todayIsoDate());
  const [highlightPlanId, setHighlightPlanId] = useState<string | null>(null);
  const [planPage, setPlanPage] = useState(0);
  const [planPageSize, setPlanPageSize] = useState(10);

  useEffect(() => {
    setPlanPage(0);
  }, [debouncedPlanFilters]);

  useEffect(() => {
    setPlanPage(0);
  }, [planPageSize]);

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      setDebouncedPlanFilters(planFilters);
      return;
    }
    const timer = setTimeout(() => setDebouncedPlanFilters(planFilters), 300);
    return () => clearTimeout(timer);
  }, [planFilters]);

  const expiringRange = useMemo(
    () => expiringQueryRange(expiringWindow, customExpiresFrom, customExpiresTo),
    [expiringWindow, customExpiresFrom, customExpiresTo]
  );

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["package-plans"],
    queryFn: () => api.getPackagePlans(false),
    enabled: hydrated,
  });

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (debouncedPlanFilters.name && !p.name.toLowerCase().includes(debouncedPlanFilters.name.toLowerCase())) {
        return false;
      }
      if (debouncedPlanFilters.status && p.status !== debouncedPlanFilters.status) {
        return false;
      }
      if (debouncedPlanFilters.redemption && p.redemptionMode !== debouncedPlanFilters.redemption) {
        return false;
      }
      return true;
    });
  }, [plans, debouncedPlanFilters]);

  const sortedPlans = useMemo(
    () =>
      [...filteredPlans].sort(
        (a, b) => b.packagePrice - a.packagePrice || a.name.localeCompare(b.name)
      ),
    [filteredPlans]
  );

  const planTotalPages = Math.max(1, Math.ceil(sortedPlans.length / planPageSize) || 1);

  useEffect(() => {
    if (planPage > 0 && planPage >= planTotalPages) {
      setPlanPage(Math.max(0, planTotalPages - 1));
    }
  }, [planPage, planTotalPages]);

  const paginatedPlans = useMemo(() => {
    const start = planPage * planPageSize;
    return sortedPlans.slice(start, start + planPageSize);
  }, [sortedPlans, planPage, planPageSize]);

  const displayPlans = paginatedPlans;

  useEffect(() => {
    if (!highlightPlanId) return;
    const idx = sortedPlans.findIndex((p) => p.id === highlightPlanId);
    if (idx >= 0) {
      setPlanPage(Math.floor(idx / planPageSize));
    }
  }, [highlightPlanId, sortedPlans, planPageSize]);

  const { data: expiringPage, isLoading: expiringLoading } = useQuery({
    queryKey: ["expiring-packages", branchId, expiringRange.expiresFrom, expiringRange.expiresTo],
    queryFn: () =>
      api.listExpiringPackages({
        branchId,
        expiresFrom: expiringRange.expiresFrom,
        expiresTo: expiringRange.expiresTo,
        page: 0,
        size: 50,
      }),
    enabled: hydrated && !!branchId && tab === "expiring",
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string | null;
      body: CreateServicePackagePlanRequest;
    }) => {
      if (id) return api.updatePackagePlan(id, body);
      return api.createPackagePlan(body);
    },
    onSuccess: (plan, variables) => {
      queryClient.invalidateQueries({ queryKey: ["package-plans"] });
      queryClient.invalidateQueries({ queryKey: ["active-package-plans"] });
      setFormOpen(false);
      setEditingPlanId(null);
      if (!variables.id && plan?.id) {
        setHighlightPlanId(plan.id);
        setTab("plans");
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  function openCreate() {
    setError("");
    setEditingPlanId(null);
    setFormInitial({ ...emptyForm, singleVisit: false });
    setFormOpen(true);
  }

  function openEdit(plan: ServicePackagePlan) {
    if (plan.predefinedRank) return;
    setError("");
    setEditingPlanId(plan.id);
    setFormInitial(formFromPlan(plan));
    setFormOpen(true);
  }

  function buildRequest(values: PackagePlanFormValues): CreateServicePackagePlanRequest {
    return {
      name: values.name,
      packagePrice: values.packagePrice,
      validityDays: values.validityDays,
      redemptionMode: values.singleVisit ? "SINGLE_VISIT" : "MULTI_VISIT",
      branchIds: branchId ? [branchId] : [],
      items: values.items.map((item, idx) => ({
        serviceId: item.serviceId,
        quantity: item.quantity,
        sortOrder: idx,
      })),
    };
  }

  function handleFormSubmit(values: PackagePlanFormValues) {
    setError("");
    if (values.items.length === 0) {
      setError(t("itemsRequired"));
      return;
    }
    saveMutation.mutate({ id: editingPlanId, body: buildRequest(values) });
  }

  const planFilterColumns = [
    {
      label: t("columnName"),
      filter: {
        type: "text" as const,
        placeholder: t("filterName"),
        value: planFilters.name,
        onChange: (v: string) => setPlanFilters((f) => ({ ...f, name: v })),
      },
    },
    {
      label: t("columnPrice"),
    },
    {
      label: t("columnValidity"),
    },
    {
      label: t("columnStatus"),
      filter: {
        type: "select" as const,
        value: planFilters.status,
        onChange: (v: string) => setPlanFilters((f) => ({ ...f, status: v })),
        options: [
          { value: "", label: tCommon("all") },
          { value: "ACTIVE", label: "ACTIVE" },
          { value: "PAUSED", label: "PAUSED" },
        ],
      },
    },
    {
      label: t("columnRedemption"),
      filter: {
        type: "select" as const,
        value: planFilters.redemption,
        onChange: (v: string) => setPlanFilters((f) => ({ ...f, redemption: v })),
        options: [
          { value: "", label: tCommon("all") },
          { value: "SINGLE_VISIT", label: t("singleVisitShort") },
          { value: "MULTI_VISIT", label: t("multiVisitShort") },
        ],
      },
    },
    { label: t("columnIncludes") },
    { label: t("columnActions") },
  ];

  if (!hydrated) return null;

  return (
    <div className="space-y-4 pb-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div className="flex gap-2">
        <button type="button" className={tab === "plans" ? btnPrimary : btnSecondary} onClick={() => setTab("plans")}>
          {t("tabPlans")}
        </button>
        <button
          type="button"
          className={tab === "expiring" ? btnPrimary : btnSecondary}
          onClick={() => setTab("expiring")}
        >
          {t("tabExpiring")}
        </button>
      </div>

      {tab === "plans" ? (
        <>
          <MobileFilterPanel
            columns={planFilterColumns}
            open={showPlanFilters}
            onClose={() => setShowPlanFilters(false)}
            title={t("filterPlans")}
          />

          <DataListPanel
            icon={Gift}
            iconVariant="accent"
            title={t("plansListTitle")}
            hint={t("plansHint")}
            filterColumns={planFilterColumns}
            showFilters={showPlanFilters}
            onShowFiltersChange={setShowPlanFilters}
            activeFilterCount={planFiltersActive(planFilters) ? Object.values(planFilters).filter(Boolean).length : 0}
            toolbarEnd={
              <button
                type="button"
                className={`${btnSecondarySm} inline-flex min-h-9 items-center gap-1 touch-manipulation`}
                onClick={openCreate}
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                {t("createPlan")}
              </button>
            }
            onClearAllFilters={
              planFiltersActive(planFilters)
                ? () => setPlanFilters(emptyPlanFilters)
                : undefined
            }
          >
            {isLoading ? (
              <p className="text-sm text-[var(--text-secondary)] p-4">{tCommon("loading")}</p>
            ) : filteredPlans.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] py-8 text-center px-4">{t("noPlansMatch")}</p>
            ) : (
              <>
              <ResponsiveTableShell
                mobile={
                  <ul className="divide-y divide-[var(--border)]">
                    {displayPlans.map((plan) => (
                      <PlanMobileRow
                        key={plan.id}
                        plan={plan}
                        t={t}
                        onEdit={() => openEdit(plan)}
                        selected={plan.id === highlightPlanId}
                      />
                    ))}
                  </ul>
                }
              >
                <FilterableTable columns={planFilterColumns} filterPlacement="toolbar">
                  {displayPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={cn(
                        "border-b border-[var(--border)] hover:bg-[var(--surface-muted)]/60",
                        plan.id === highlightPlanId &&
                          "bg-[var(--brand-light)]/40 ring-2 ring-inset ring-[var(--brand)]/35"
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {plan.predefinedRank ? `#${plan.predefinedRank} · ` : ""}
                        {plan.name}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{formatCurrency(plan.packagePrice)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {t("validityDaysShort", { days: plan.validityDays })}
                      </td>
                      <td className="px-4 py-3 text-xs uppercase text-[var(--text-tertiary)]">{plan.status}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {plan.redemptionMode === "SINGLE_VISIT" ? t("singleVisitShort") : t("multiVisitShort")}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)] max-w-[12rem] line-clamp-2">
                        {formatPackageInclusions(plan.items) || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PlanActions plan={plan} t={t} onEdit={() => openEdit(plan)} />
                      </td>
                    </tr>
                  ))}
                </FilterableTable>
              </ResponsiveTableShell>
              <TablePagination
                page={planPage}
                size={planPageSize}
                totalPages={planTotalPages}
                totalElements={sortedPlans.length}
                onPageChange={setPlanPage}
                onSizeChange={setPlanPageSize}
              />
              </>
            )}
          </DataListPanel>
        </>
      ) : (
        <ExpiringTab
          t={t}
          tCommon={tCommon}
          expiringWindow={expiringWindow}
          setExpiringWindow={setExpiringWindow}
          customExpiresFrom={customExpiresFrom}
          setCustomExpiresFrom={setCustomExpiresFrom}
          customExpiresTo={customExpiresTo}
          setCustomExpiresTo={setCustomExpiresTo}
          expiringRange={expiringRange}
          expiringPage={expiringPage}
          expiringLoading={expiringLoading}
        />
      )}

      <PackagePlanFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPlanId(null);
        }}
        branchId={branchId}
        title={editingPlanId ? t("editPlanTitle") : t("createPlanTitle")}
        initial={formInitial}
        saving={saveMutation.isPending}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

function PlanSellLink({
  plan,
  t,
  compact,
}: {
  plan: ServicePackagePlan;
  t: ReturnType<typeof useTranslations<"manager.packages">>;
  compact?: boolean;
}) {
  if (plan.status !== "ACTIVE") return null;
  return (
    <Link
      href={`/manager/walk-in?new=1&packagePlanId=${encodeURIComponent(plan.id)}`}
      className={cn(
        btnSecondarySm,
        compact && "px-2.5 py-1 text-[11px] font-bold whitespace-nowrap min-h-8"
      )}
    >
      {t("sellThisPackage")}
    </Link>
  );
}

function PlanActions({
  plan,
  t,
  onEdit,
  compact,
}: {
  plan: ServicePackagePlan;
  t: ReturnType<typeof useTranslations<"manager.packages">>;
  onEdit: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", compact ? "shrink-0" : "flex-wrap gap-1.5 justify-end")}>
      {!plan.predefinedRank ? (
        <button
          type="button"
          className={cn(btnSecondarySm, compact && "px-2 py-1 text-[10px]")}
          onClick={onEdit}
        >
          {t("editPlan")}
        </button>
      ) : null}
      <PlanSellLink plan={plan} t={t} compact={compact} />
    </div>
  );
}

function PlanMobileRow({
  plan,
  t,
  onEdit,
  selected,
}: {
  plan: ServicePackagePlan;
  t: ReturnType<typeof useTranslations<"manager.packages">>;
  onEdit: () => void;
  selected?: boolean;
}) {
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 touch-manipulation",
        selected && "bg-[var(--brand-light)]/40 ring-2 ring-inset ring-[var(--brand)]/35"
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-[var(--text-primary)]">
          {selected ? (
            <span className="mr-1 inline-flex rounded-md bg-[var(--brand)] px-1 py-px text-[9px] font-bold uppercase text-[var(--brand-on-brand)]">
              {t("planJustCreated")}
            </span>
          ) : null}
          {plan.predefinedRank ? `#${plan.predefinedRank} · ` : ""}
          {plan.name}
        </p>
        <p className="truncate text-[11px] leading-snug text-[var(--text-secondary)]">
          <span className="font-semibold tabular-nums text-[var(--text-primary)]">
            {formatCurrency(plan.packagePrice)}
          </span>
          {" · "}
          {t("validityDaysShort", { days: plan.validityDays })}
          {formatPackageInclusions(plan.items) ? (
            <>
              {" · "}
              <span className="text-[var(--text-tertiary)]">{formatPackageInclusions(plan.items)}</span>
            </>
          ) : null}
        </p>
      </div>
      <PlanActions plan={plan} t={t} onEdit={onEdit} compact />
    </li>
  );
}

function ExpiringTab({
  t,
  tCommon,
  expiringWindow,
  setExpiringWindow,
  customExpiresFrom,
  setCustomExpiresFrom,
  customExpiresTo,
  setCustomExpiresTo,
  expiringRange,
  expiringPage,
  expiringLoading,
}: {
  t: ReturnType<typeof useTranslations<"manager.packages">>;
  tCommon: ReturnType<typeof useTranslations<"common">>;
  expiringWindow: ExpiringWindow;
  setExpiringWindow: (w: ExpiringWindow) => void;
  customExpiresFrom: string;
  setCustomExpiresFrom: (v: string) => void;
  customExpiresTo: string;
  setCustomExpiresTo: (v: string) => void;
  expiringRange: { expiresFrom: string; expiresTo: string };
  expiringPage: { content?: CustomerPackageSubscription[] } | undefined;
  expiringLoading: boolean;
}) {
  return (
    <section className="dashboard-widget-card p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{t("expiringHint")}</p>
        <select
          className={cn(selectClass, "w-full sm:w-auto sm:min-w-[14rem]")}
          value={expiringWindow}
          onChange={(e) => setExpiringWindow(e.target.value as ExpiringWindow)}
          aria-label={t("expiringWindowLabel")}
        >
          <option value="week">{t("expiringWindowWeek")}</option>
          <option value="month">{t("expiringWindowMonth")}</option>
          <option value="custom">{t("expiringWindowCustom")}</option>
        </select>
      </div>
      {expiringWindow === "custom" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 rounded-lg border border-[var(--border)] p-3">
          <div className="flex-1">
            <span className="ui-field-label block mb-1">{t("expiringCustomFrom")}</span>
            <input type="date" className={inputClass} value={customExpiresFrom} onChange={(e) => setCustomExpiresFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <span className="ui-field-label block mb-1">{t("expiringCustomTo")}</span>
            <input type="date" className={inputClass} value={customExpiresTo} onChange={(e) => setCustomExpiresTo(e.target.value)} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-tertiary)]">
          {t("expiringRangeLabel", { from: expiringRange.expiresFrom, to: expiringRange.expiresTo })}
        </p>
      )}
      {expiringLoading ? <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p> : null}
      <ul className="divide-y divide-[var(--border)]">
        {(expiringPage?.content ?? []).map((sub) => (
          <li key={sub.id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{sub.customerName || sub.customerPhone}</p>
              <p className="text-[var(--text-secondary)]">
                {sub.planName} · {t("expiresOn", { date: sub.expiresOn })}
              </p>
            </div>
            <Link
              href={`/manager/walk-in?phone=${encodeURIComponent(sub.customerPhone || "")}`}
              className={btnSecondary}
            >
              {t("followUpVisit")}
            </Link>
          </li>
        ))}
      </ul>
      {(expiringPage?.content?.length ?? 0) === 0 && !expiringLoading ? (
        <p className="text-sm text-[var(--text-tertiary)] py-4 text-center">{t("noExpiring")}</p>
      ) : null}
    </section>
  );
}
