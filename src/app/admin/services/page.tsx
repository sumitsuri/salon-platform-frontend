"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Hash, IndianRupee, MapPin, Plus, Scissors, Trash2, Check } from "lucide-react";
import {
  api,
  type Branch,
  type CatalogCategory,
  type CatalogServiceItem,
} from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { ServiceContributionPanel } from "@/components/ServiceContributionPanel";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  PageHeader,
  StatCard,
  EmptyState,
  selectClass,
  inputClass,
  btnPrimary,
  btnSecondary,
  Card,
  SideSheet,
  AlertBanner,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { useAdminBranchSelection } from "@/lib/use-admin-branch-selection";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { ProductDateRange, getDefaultDateRange } from "@/lib/date-range";
import { insightPeriodToRange } from "@/lib/insights-utils";

type Tab = "catalog" | "performance";

type BranchPriceDraft = { enabled: boolean; price: string };

function referenceBranch(branches: Branch[]) {
  return (
    branches.find(
      (b) => b.code === "MW02" || b.name.toLowerCase().includes("mantri lithos")
    ) ?? branches[0]
  );
}

function sharedListPriceForService(svc: CatalogServiceItem | null, branches: Branch[]): string {
  if (svc?.listPrice != null) return String(svc.listPrice);
  const ref = referenceBranch(branches);
  const refRow = ref ? svc?.branches.find((b) => b.branchId === ref.id && b.active) : undefined;
  if (refRow) return String(refRow.price);
  const first = svc?.branches.find((b) => b.active);
  if (first) return String(first.price);
  return "499";
}

function branchInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function BranchSwitch({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={cn(
        "relative w-12 h-7 rounded-full transition-colors shrink-0 touch-manipulation",
        enabled ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
          enabled && "translate-x-5"
        )}
      />
    </button>
  );
}

/** Fresha/Boulevard-style location coverage: offer toggle + inline list price. */
function BranchCoverageEditor({
  branches,
  value,
  onChange,
  t,
  sharedListPrice,
}: {
  branches: Branch[];
  value: Record<string, BranchPriceDraft>;
  onChange: (next: Record<string, BranchPriceDraft>) => void;
  t: ReturnType<typeof useTranslations>;
  sharedListPrice?: string;
}) {
  const [basePrice, setBasePrice] = useState(sharedListPrice ?? "499");

  useEffect(() => {
    if (sharedListPrice) setBasePrice(sharedListPrice);
  }, [sharedListPrice]);
  const enabledCount = branches.filter((b) => value[b.id]?.enabled).length;
  const total = branches.length;
  const coveragePct = total === 0 ? 0 : Math.round((enabledCount / total) * 100);

  function setRow(id: string, patch: Partial<BranchPriceDraft>) {
    const cur = value[id] || { enabled: false, price: basePrice };
    onChange({ ...value, [id]: { ...cur, ...patch } });
  }

  function offerEverywhere() {
    const next: Record<string, BranchPriceDraft> = {};
    for (const b of branches) {
      next[b.id] = {
        enabled: true,
        price: value[b.id]?.price || basePrice,
      };
    }
    onChange(next);
  }

  function clearAll() {
    const next: Record<string, BranchPriceDraft> = {};
    for (const b of branches) {
      next[b.id] = { enabled: false, price: value[b.id]?.price || basePrice };
    }
    onChange(next);
  }

  function applyBaseToOffered() {
    const next: Record<string, BranchPriceDraft> = { ...value };
    for (const b of branches) {
      const row = next[b.id] || { enabled: false, price: basePrice };
      if (row.enabled) next[b.id] = { ...row, price: basePrice };
    }
    onChange(next);
  }

  return (
      <div className="space-y-3" data-testid="branch-coverage-editor">
      {/* Coverage hero */}
      <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[color-mix(in_srgb,var(--brand)_6%,var(--surface))]" data-testid="coverage-hero">
        <div className="px-3.5 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand-text)]">
                {t("coverageLabel")}
              </p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5 leading-tight">
                {t("coverageCount", { enabled: enabledCount, total })}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t("coverageHint")}</p>
            </div>
            <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--brand)] text-white flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>
        <div className="flex border-t border-[var(--border)]">
          <button
            type="button"
            data-testid="offer-everywhere"
            onClick={offerEverywhere}
            className="flex-1 py-2.5 text-xs font-semibold text-[var(--brand-text)] hover:bg-[var(--surface)] transition"
          >
            {t("offerEverywhere")}
          </button>
          <div className="w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={clearAll}
            className="flex-1 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface)] transition"
          >
            {t("clearLocations")}
          </button>
        </div>
      </div>

      {/* Shared list price */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
        <div className="flex items-end gap-2">
          <label className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
              {t("sharedListPrice")}
            </span>
            <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-2.5 py-2 focus-within:ring-2 focus-within:ring-[var(--brand)]/30">
              <span className="text-sm font-semibold text-[var(--text-secondary)]">₹</span>
              <input
                type="number"
                min={0}
                className="w-full bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
              />
            </div>
          </label>
          <button
            type="button"
            onClick={applyBaseToOffered}
            disabled={enabledCount === 0}
            className={`${btnSecondary} py-2 px-3 text-xs shrink-0 disabled:opacity-40`}
          >
            {t("applyToOffered")}
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">{t("sharedPriceHint")}</p>
      </div>

      {/* Location cards */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)] px-0.5">
          {t("locationsHeading")}
        </p>
        {branches.map((b) => {
          const row = value[b.id] || { enabled: false, price: basePrice };
          return (
            <div
              key={b.id}
              data-testid="branch-coverage-card"
              data-branch-id={b.id}
              className={cn(
                "rounded-2xl border transition-all duration-200 overflow-hidden",
                row.enabled
                  ? "border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-[color-mix(in_srgb,var(--brand)_7%,var(--surface))] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] opacity-80"
              )}
            >
              <button
                type="button"
                className="w-full flex items-center gap-3 px-3 py-3 text-left touch-manipulation"
                onClick={() =>
                  setRow(b.id, {
                    enabled: !row.enabled,
                    price: row.price || basePrice,
                  })
                }
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                    row.enabled
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                  )}
                >
                  {row.enabled ? <Check className="w-4 h-4" /> : branchInitials(b.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">{b.name}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                    {b.code}
                    {row.enabled
                      ? ` · ${t("offeredAtPrice", { price: formatCurrency(Number(row.price) || 0) })}`
                      : ` · ${t("notOffered")}`}
                  </p>
                </div>
                <BranchSwitch
                  enabled={row.enabled}
                  onChange={(on) => setRow(b.id, { enabled: on, price: row.price || basePrice })}
                  label={t("toggleBranch", { branch: b.name })}
                />
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  row.enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-3 pb-3 pt-0">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 flex items-center gap-3">
                      <IndianRupee className="w-4 h-4 text-[var(--brand-text)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                          {t("listPriceHere")}
                        </p>
                        <input
                          type="number"
                          min={0}
                          className="w-full bg-transparent text-base font-bold text-[var(--text-primary)] outline-none mt-0.5"
                          value={row.price}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRow(b.id, { price: e.target.value })}
                          aria-label={t("priceFor", { branch: b.name })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed px-0.5">
        {t("priceOverrideHint")}
      </p>
    </div>
  );
}

export default function AdminServicesPage() {
  const t = useTranslations("admin.services");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("catalog");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Performance tab state
  const [dateRange, setDateRange] = useState<ProductDateRange>(getDefaultDateRange);
  const [serviceFilter, setServiceFilter] = useState("");

  const { branches, selectedBranches, setSelectedBranches, branchesSelected } = useAdminBranchSelection();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogServiceItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    durationMinutes: "30",
    description: "",
  });
  const [branchPrices, setBranchPrices] = useState<Record<string, BranchPriceDraft>>({});
  const [editorSharedPrice, setEditorSharedPrice] = useState("499");

  // Category create
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", parentCategoryId: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-categories", showInactive],
    queryFn: () => api.getCategories(showInactive),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["catalog-services", showInactive],
    queryFn: () => api.getCatalogServices(showInactive),
  });

  const parents = useMemo(
    () => categories.filter((c) => !c.parentCategoryId && (showInactive || c.active !== false)),
    [categories, showInactive]
  );
  const leaves = useMemo(
    () => categories.filter((c) => c.parentCategoryId && (showInactive || c.active !== false)),
    [categories, showInactive]
  );

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (parentFilter && s.parentCategoryId !== parentFilter && s.categoryId !== parentFilter) {
        return false;
      }
      if (!q) return true;
      const hay = `${s.name} ${s.categoryName ?? ""} ${s.parentCategoryName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [services, search, parentFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      categoryId: leaves[0]?.id || parents[0]?.id || "",
      durationMinutes: "30",
      description: "",
    });
    const draft: Record<string, BranchPriceDraft> = {};
    const shared = sharedListPriceForService(null, branches);
    setEditorSharedPrice(shared);
    for (const b of branches) {
      draft[b.id] = { enabled: true, price: shared };
    }
    setBranchPrices(draft);
    setError("");
    setEditorOpen(true);
  }

  function openEdit(svc: CatalogServiceItem) {
    setEditing(svc);
    setForm({
      name: svc.name,
      categoryId: svc.categoryId,
      durationMinutes: String(svc.durationMinutes ?? 30),
      description: svc.description ?? "",
    });
    const shared = sharedListPriceForService(svc, branches);
    setEditorSharedPrice(shared);
    const draft: Record<string, BranchPriceDraft> = {};
    for (const b of branches) {
      const row = svc.branches.find((x) => x.branchId === b.id && x.active);
      draft[b.id] = {
        enabled: !!row,
        price: row ? String(row.price) : shared,
      };
    }
    setBranchPrices(draft);
    setError("");
    setEditorOpen(true);
  }

  const saveService = useMutation({
    mutationFn: async () => {
      if (!form.name.trim() || !form.categoryId) {
        throw new Error(t("nameCategoryRequired"));
      }
      const assignments = Object.entries(branchPrices)
        .filter(([, v]) => v.enabled)
        .map(([branchId, v]) => {
          const price = Number(v.price);
          if (Number.isNaN(price) || price < 0) {
            throw new Error(t("invalidPrice"));
          }
          return { branchId, price, active: true };
        });
      if (assignments.length === 0) {
        throw new Error(t("branchRequired"));
      }

      let serviceId = editing?.id;
      if (editing) {
        await api.updateCatalogService(editing.id, {
          name: form.name.trim(),
          categoryId: form.categoryId,
          durationMinutes: Number(form.durationMinutes) || 30,
          description: form.description || undefined,
          active: true,
        });
      } else {
        const created = await api.createCatalogService({
          name: form.name.trim(),
          categoryId: form.categoryId,
          durationMinutes: Number(form.durationMinutes) || 30,
          description: form.description || undefined,
        });
        serviceId = created.id;
      }
      if (!serviceId) throw new Error(tCommon("failed"));
      return api.setCatalogServiceBranches(serviceId, assignments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-services"] });
      setEditorOpen(false);
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteService = useMutation({
    mutationFn: (id: string) => api.deleteCatalogService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-services"] });
      setEditorOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const createCategory = useMutation({
    mutationFn: () =>
      api.createCategory({
        name: catForm.name.trim(),
        parentCategoryId: catForm.parentCategoryId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
      setCatOpen(false);
      setCatForm({ name: "", parentCategoryId: "" });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  // Performance queries
  const apiRange = insightPeriodToRange(dateRange);
  const branchFilter =
    selectedBranches.length > 0 && selectedBranches.length < branches.length
      ? selectedBranches
      : undefined;

  const perfInfinite = useInfiniteQuery({
    queryKey: ["service-contribution", selectedBranches, dateRange.preset, dateRange.from, dateRange.to, serviceFilter],
    queryFn: ({ pageParam }) =>
      api.getServiceContribution({
        ...apiRange,
        branchIds: branchFilter,
        serviceName: serviceFilter || undefined,
        page: pageParam as number,
        size: DEFAULT_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
    enabled: tab === "performance" && branchesSelected,
  });

  const data = perfInfinite.data?.pages[0];
  const perfServices = perfInfinite.data?.pages.flatMap((p) => p.services) ?? [];
  const perfTotalElements = data?.totalElements ?? 0;
  const perfHasMore = perfInfinite.hasNextPage ?? false;
  const isLoading = perfInfinite.isLoading;
  const isFetching = perfInfinite.isFetching;
  const isError = perfInfinite.isError;
  const perfError = perfInfinite.error;
  const perfFetchingNext = perfInfinite.isFetchingNextPage;
  const fetchNextPerfPage = perfInfinite.fetchNextPage;
  const heroCount = Math.min(3, perfServices.length ?? 0);

  function categoryLabel(c: CatalogCategory) {
    if (!c.parentCategoryId) return c.name;
    const parent = categories.find((p) => p.id === c.parentCategoryId);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={tab === "catalog" ? t("catalogSubtitle") : t("performanceSubtitle")}
        action={
          tab === "catalog" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="catalog-add-category"
                className={`${btnSecondary} py-2.5 px-3`}
                onClick={() => setCatOpen(true)}
              >
                {t("addCategory")}
              </button>
              <button
                type="button"
                data-testid="catalog-add-service"
                className={`${btnPrimary} py-2.5 px-3`}
                onClick={openCreate}
              >
                <Plus className="w-4 h-4" />
                {t("addService")}
              </button>
            </div>
          ) : (
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
              testId="admin-services-date-range"
            />
          )
        }
      />

      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-muted)] w-fit" data-testid="services-tabs">
        {(["catalog", "performance"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            data-testid={key === "catalog" ? "tab-catalog" : "tab-performance"}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              tab === key
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {key === "catalog" ? t("tabCatalog") : t("tabPerformance")}
          </button>
        ))}
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {tab === "catalog" && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              className={`${inputClass} flex-1`}
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={`${selectClass} sm:w-48`}
              value={parentFilter}
              onChange={(e) => setParentFilter(e.target.value)}
            >
              <option value="">{t("allCategories")}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] whitespace-nowrap">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              {t("showInactive")}
            </label>
          </div>

          <Card padding={false}>
            {servicesLoading ? (
              <p className="p-4 text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
            ) : filteredServices.length === 0 ? (
              <EmptyState title={t("emptyCatalogTitle")} description={t("emptyCatalogDesc")} />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredServices.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    data-testid="catalog-service-row"
                    onClick={() => openEdit(s)}
                    className="w-full text-left px-4 py-3 hover:bg-[var(--surface-muted)] transition flex gap-3 items-start"
                  >
                    <div className="mt-0.5 rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)] p-2">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold truncate ${s.active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] line-through"}`}>
                          {s.name}
                        </p>
                        <span className="text-xs text-[var(--text-secondary)] shrink-0">
                          {t("branchesCount", { count: s.branches.filter((b) => b.active).length })}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {[s.parentCategoryName, s.categoryName].filter(Boolean).join(" › ")}
                        {s.durationMinutes ? ` · ${s.durationMinutes}m` : ""}
                      </p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                        {s.listPrice != null ? `${t("sharedListPrice")}: ${formatCurrency(s.listPrice)} · ` : ""}
                        {s.branches
                          .filter((b) => b.active)
                          .map((b) => `${b.branchName} ${formatCurrency(b.price)}`)
                          .join(" · ") || t("noBranches")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "performance" && (
        <>
          <BranchMultiSelect branches={branches} selected={selectedBranches} onChange={setSelectedBranches} />
          {selectedBranches.length === 0 ? (
                <EmptyState title={tAdmin("selectBranch")} description={tAdmin("chooseBranchesServices")} />
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <StatCard label={t("services")} value={perfServices.length} icon={Scissors} accent="brand" />
                    <StatCard label={t("sold")} value={data?.totalServiceCount ?? 0} icon={Hash} accent="violet" />
                    <StatCard
                      label={t("serviceRevenue")}
                      value={data ? formatCurrency(data.serviceRevenue) : "—"}
                      icon={IndianRupee}
                      accent="emerald"
                      className="col-span-2 lg:col-span-1"
                    />
                  </div>
                  {heroCount > 0 && data && (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {t("topServicesHint", {
                        count: heroCount,
                        percent: perfServices
                          .slice(0, heroCount)
                          .reduce((sum, s) => sum + s.revenueSharePct, 0)
                          .toFixed(1),
                      })}
                    </p>
                  )}
                  {isError ? (
                    <EmptyState
                      title={t("loadErrorTitle")}
                      description={perfError instanceof Error ? perfError.message : t("loadErrorDesc")}
                    />
                  ) : (
                    <ServiceContributionPanel
                      data={data ? { ...data, services: perfServices } : undefined}
                      services={perfServices}
                      loading={isLoading || isFetching}
                      serviceFilter={serviceFilter}
                      onServiceFilterChange={setServiceFilter}
                      infiniteScroll={{
                        totalElements: perfTotalElements,
                        loadedCount: perfServices.length,
                        hasMore: perfHasMore,
                        isFetchingNextPage: perfFetchingNext,
                        isLoading,
                        onLoadMore: () => void fetchNextPerfPage(),
                      }}
                    />
                  )}
                </>
              )}
        </>
      )}

      <SideSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? t("editService") : t("addService")}
        subtitle={t("serviceEditorHint")}
        footer={
          <div className="flex flex-col gap-2 w-full">
            {editing && (
              <button
                type="button"
                className={`${btnSecondary} w-full text-rose-700`}
                disabled={deleteService.isPending}
                onClick={() => {
                  if (confirm(t("deleteConfirm"))) deleteService.mutate(editing.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
                {t("deactivateService")}
              </button>
            )}
            <button
              type="button"
              data-testid="catalog-save-service"
              className={`${btnPrimary} w-full`}
              disabled={saveService.isPending}
              onClick={() => saveService.mutate()}
            >
              {saveService.isPending ? tCommon("processing") : tCommon("save")}
            </button>
          </div>
        }
      >
        <div className="p-4 space-y-4">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("serviceName")}
            <input
              data-testid="catalog-service-name"
              className={`${inputClass} mt-1`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("category")}
            <select
              className={`${selectClass} mt-1`}
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">{t("selectCategory")}</option>
              {leaves.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryLabel(c)}
                </option>
              ))}
              {leaves.length === 0 &&
                parents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("duration")}
            <input
              className={`${inputClass} mt-1`}
              type="number"
              min={5}
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("description")}
            <textarea
              className={`${inputClass} mt-1 min-h-[72px]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <BranchCoverageEditor
            branches={branches}
            value={branchPrices}
            onChange={setBranchPrices}
            sharedListPrice={editorSharedPrice}
            t={t}
          />
        </div>
      </SideSheet>

      <SideSheet
        open={catOpen}
        onClose={() => setCatOpen(false)}
        title={t("addCategory")}
        subtitle={t("categoryHint")}
        footer={
          <button
            type="button"
            className={`${btnPrimary} w-full`}
            disabled={createCategory.isPending || !catForm.name.trim()}
            onClick={() => createCategory.mutate()}
          >
            {createCategory.isPending ? tCommon("processing") : tCommon("save")}
          </button>
        }
      >
        <div className="p-4 space-y-3">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("categoryName")}
            <input
              className={`${inputClass} mt-1`}
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            {t("parentCategory")}
            <select
              className={`${selectClass} mt-1`}
              value={catForm.parentCategoryId}
              onChange={(e) => setCatForm((f) => ({ ...f, parentCategoryId: e.target.value }))}
            >
              <option value="">{t("topLevelCategory")}</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SideSheet>
    </div>
  );
}
