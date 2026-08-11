"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard, Filter, Users } from "lucide-react";
import { useAuthStore, useAuthHydrated } from "@/lib/auth-store";
import { api, MembershipSubscription } from "@/lib/api";
import { useInfinitePagedList } from "@/lib/use-infinite-paged-list";
import { getTenantLocaleKit } from "@/lib/tenant-locale";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { SellMembershipPanel } from "@/components/memberships/SellMembershipPanel";
import { NavigationScopeBanner } from "@/components/NavigationScopeBanner";
import { managerMembershipsPath } from "@/lib/navigation-scope";
import { useCustomerScopeNavigation } from "@/lib/use-customer-scope-navigation";
import {
  PageHeader,
  AlertBanner,
  btnPrimary,
  btnSecondarySm,
  Card,
  FilterableTable,
  InfiniteScrollFooter,
  MobileFilterPanel,
  StatCard,
  SideSheet,
  AvatarInitial,
  ResponsiveTableShell,
  DEFAULT_PAGE_SIZE,
} from "@/components/ui";

type Filters = {
  customer: string;
  phone: string;
  planId: string;
  card: string;
  validUntil: string;
};

const emptyFilters: Filters = {
  customer: "",
  phone: "",
  planId: "",
  card: "",
  validUntil: "",
};

function formatMembershipDate(isoDate: string, locale: string, timeZone: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  });
}

function filtersActive(filters: Filters) {
  return Object.values(filters).some((v) => v !== "");
}

export default function ManagerMembershipsPage() {
  const router = useRouter();
  const t = useTranslations("manager.memberships");
  const tAdmin = useTranslations("admin.common");
  const tCommon = useTranslations("common");
  const tSchedule = useTranslations("manager.schedule");
  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthHydrated();
  const branchId = user?.branchId || "";
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const localeKit = getTenantLocaleKit();

  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [debounced, setDebounced] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sellOpen, setSellOpen] = useState(false);
  const filtersReady = useRef(false);

  const initialPhone = params.get("phone") || "";
  const initialCustomerId = params.get("customerId") || "";
  const initialName = params.get("name") || "";

  const { customer, customersHref, customersLabel, isScoped } = useCustomerScopeNavigation({
    customerId: initialCustomerId || undefined,
    scope: "manager",
    currentPageLabel: t("title"),
    enabled: !!initialCustomerId,
  });

  function clearCustomerScope() {
    router.replace(managerMembershipsPath());
    setSellOpen(false);
  }

  const hasActiveFilters = filtersActive(filters);
  const hasDebouncedFilters = filtersActive(debounced);

  useEffect(() => {
    if (initialPhone || initialCustomerId) {
      setSellOpen(true);
    }
  }, [initialPhone, initialCustomerId]);

  useEffect(() => {
    if (!filtersReady.current) {
      filtersReady.current = true;
      setDebounced(filters);
      return;
    }
    const timer = setTimeout(() => setDebounced(filters), 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const { data: plans = [] } = useQuery({
    queryKey: ["active-membership-plans"],
    queryFn: () => api.getActiveMembershipPlans(),
  });

  const customerQ = debounced.customer.trim() || undefined;
  const phoneQ = debounced.phone.trim() || undefined;
  const cardQ = debounced.card.trim() || undefined;
  const dateFilter = debounced.validUntil || undefined;

  const {
    items: members,
    totalElements,
    hasMore,
    isLoading,
    isFetching,
    isError,
    error: listError,
    refetch,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfinitePagedList({
    queryKey: [
      "active-memberships",
      branchId,
      debounced.customer,
      debounced.phone,
      debounced.planId,
      debounced.card,
      debounced.validUntil,
    ],
    queryFn: (page) =>
      api.listActiveMemberships({
        branchId,
        q: customerQ,
        phone: phoneQ,
        card: cardQ,
        planId: debounced.planId || undefined,
        endsBefore: dateFilter,
        endsAfter: dateFilter,
        page,
        size: DEFAULT_PAGE_SIZE,
      }),
    enabled: authHydrated && !!branchId,
    staleTime: 30_000,
  });

  const planOptions = useMemo(
    () => [{ value: "", label: t("filters.allPlans") }, ...plans.map((p) => ({ value: p.id, label: p.name }))],
    [plans, t]
  );

  const expiringSoon = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 30);
    return members.filter((m) => new Date(`${m.endsOn}T12:00:00`) <= cutoff).length;
  }, [members]);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setDebounced(emptyFilters);
  }

  function onMembershipSold(sub: MembershipSubscription) {
    setSuccess(
      t("soldSuccess", {
        card: sub.cardNumber,
        plan: sub.planName || "",
        until: sub.endsOn,
      })
    );
    setError("");
    setSellOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["active-memberships"] });
  }

  const sellButton = (
    <button type="button" onClick={() => setSellOpen(true)} className={`${btnPrimary} py-2.5 px-4 min-h-11`}>
      <CreditCard className="w-4 h-4" />
      {t("sellCard")}
    </button>
  );

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        className={`${btnSecondarySm} md:hidden`}
        aria-pressed={showFilters}
        aria-label={t("filters.toggle")}
      >
        <Filter className="w-4 h-4" />
        {t("filters.toggle")}
      </button>
      {sellButton}
    </div>
  );

  const columns = [
    {
      label: t("columns.customer"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.name"),
        value: filters.customer,
        onChange: (v: string) => updateFilter("customer", v),
      },
    },
    {
      label: t("columns.phone"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.phone"),
        value: filters.phone,
        onChange: (v: string) => updateFilter("phone", v),
      },
    },
    {
      label: t("columns.plan"),
      filter: {
        type: "select" as const,
        value: filters.planId,
        onChange: (v: string) => updateFilter("planId", v),
        options: planOptions,
      },
    },
    {
      label: t("columns.card"),
      filter: {
        type: "text" as const,
        placeholder: t("filters.card"),
        value: filters.card,
        onChange: (v: string) => updateFilter("card", v),
      },
    },
    {
      label: t("columns.validUntil"),
      filter: {
        type: "date" as const,
        value: filters.validUntil,
        onChange: (v: string) => updateFilter("validUntil", v),
      },
    },
    {
      label: t("columns.discount"),
    },
  ];

  const showInitialLoading = (isLoading || !authHydrated) && members.length === 0;
  const showFilteredEmpty = !showInitialLoading && !isError && members.length === 0 && hasDebouncedFilters;
  const emptyMessage = showFilteredEmpty ? t("noFilterMatches") : t("noMembersTitle");
  const emptyDescription = showFilteredEmpty ? t("noFilterMatchesDesc") : t("noMembersDesc");

  return (
    <div className="space-y-4 w-full max-w-6xl mx-auto min-w-0">
      <PageHeader
        title={t("title")}
        subtitle={
          showInitialLoading
            ? tCommon("loading")
            : `${t("subtitle", { count: totalElements, loaded: members.length })}${
                isFetching && !isLoading ? tAdmin("updatingSuffix") : ""
              }`
        }
        action={headerActions}
      />
      <MissionStrip />
      {isScoped && (
        <NavigationScopeBanner
          backHref={customersHref}
          backLabel={tCommon("backTo", { page: customersLabel })}
          title={customer?.name ?? initialName ?? tCommon("loading")}
          subtitle={customer ? tCommon("showingFor", { name: customer.name }) : undefined}
          onClear={clearCustomerScope}
        />
      )}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      <MobileFilterPanel columns={columns} open={showFilters} />

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[var(--brand-text)]">
          {tAdmin("clearFilters")}
        </button>
      )}

      <div className="mobile-stat-grid gap-3">
        <StatCard label={t("stats.active")} value={totalElements} icon={Users} accent="brand" />
        <StatCard label={t("stats.expiringSoon")} value={expiringSoon} icon={CreditCard} accent="amber" />
      </div>

      <Card padding={false}>
        {showInitialLoading && (
          <p className="p-4 text-[var(--text-secondary)] text-sm">{tCommon("loading")}</p>
        )}
        {isError && (
          <div className="p-4 space-y-3">
            <AlertBanner variant="error">
              {listError instanceof Error ? listError.message : tCommon("failed")}
            </AlertBanner>
            <button type="button" onClick={() => void refetch()} className={`${btnPrimary} min-h-11`}>
              {tSchedule("refresh")}
            </button>
          </div>
        )}
        {!isError && !showInitialLoading && (
          <ResponsiveTableShell
            mobile={
              <div className="divide-y divide-[var(--border)]">
                {members.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                    <p className="font-semibold text-[var(--text-primary)]">{emptyMessage}</p>
                    <p className="mt-1">{emptyDescription}</p>
                    {showFilteredEmpty ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-sm font-semibold text-[var(--brand-text)]"
                      >
                        {tAdmin("clearFilters")}
                      </button>
                    ) : (
                      <div className="mt-4 flex justify-center">{sellButton}</div>
                    )}
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.id} className="px-4 py-3">
                      <div className="flex gap-3">
                        <AvatarInitial name={m.customerName || "?"} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-[var(--text-primary)] truncate">
                              {m.customerName || "—"}
                            </p>
                            <p className="text-xs font-semibold text-[var(--brand-text)] shrink-0">
                              {m.benefitPercent != null ? `${m.benefitPercent}% off` : ""}
                            </p>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                            {m.customerPhone || "—"} · {m.planName || "—"}
                          </p>
                          <p className="text-xs text-[var(--text-tertiary)] font-mono truncate">{m.cardNumber}</p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {t("columns.validUntil")}:{" "}
                            {formatMembershipDate(m.endsOn, localeKit.locale, localeKit.timeZone)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            }
          >
            <FilterableTable columns={columns}>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarInitial name={m.customerName || "?"} />
                      <p className="font-semibold text-[var(--text-primary)] truncate">{m.customerName || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-sm whitespace-nowrap">
                    {m.customerPhone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[var(--brand-light)] text-[var(--brand-text)]">
                      {m.planName || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[var(--text-primary)]">{m.cardNumber}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] text-sm whitespace-nowrap">
                    {formatMembershipDate(m.endsOn, localeKit.locale, localeKit.timeZone)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                    {m.benefitPercent != null ? `${m.benefitPercent}%` : "—"}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                    <p className="font-semibold text-[var(--text-primary)]">{emptyMessage}</p>
                    <p className="mt-1">{emptyDescription}</p>
                    {showFilteredEmpty ? (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-3 text-sm font-semibold text-[var(--brand-text)]"
                      >
                        {tAdmin("clearFilters")}
                      </button>
                    ) : (
                      <div className="mt-4 flex justify-center">{sellButton}</div>
                    )}
                  </td>
                </tr>
              )}
            </FilterableTable>
          </ResponsiveTableShell>
        )}

        {!isError && !showInitialLoading && (
          <InfiniteScrollFooter
            totalElements={totalElements}
            loadedCount={members.length}
            hasMore={hasMore}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            onLoadMore={() => void fetchNextPage()}
          />
        )}
      </Card>

      <SideSheet open={sellOpen} onClose={() => setSellOpen(false)} title={t("sellTitle")}>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{t("standaloneHint")}</p>
        <SellMembershipPanel
          branchId={branchId}
          customerId={initialCustomerId}
          customerName={initialName}
          phone={initialPhone}
          variant="standalone"
          onError={setError}
          onActivated={onMembershipSold}
        />
      </SideSheet>
    </div>
  );
}
