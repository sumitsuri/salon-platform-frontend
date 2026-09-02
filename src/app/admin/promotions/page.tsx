"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard, Percent, Plus, Sparkles, Ticket } from "lucide-react";
import { api, type Coupon, type Offer } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import { CompactStatsStrip } from "@/components/CompactStatsStrip";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { DiscountCreateSheet } from "@/components/promotions/DiscountCreateSheet";
import { MembershipCreateSheet } from "@/components/promotions/MembershipCreateSheet";
import {
  PageHeader,
  EmptyState,
  PageLoader,
  btnPrimary,
  btnPrimarySm,
  btnSecondarySm,
  SegmentedControl,
  StatusBadge,
} from "@/components/ui";

type Tab = "discounts" | "memberships";
type StatusFilter = "ALL" | "ACTIVE" | "PAUSED";

type DiscountRow =
  | { kind: "COUPON"; item: Coupon }
  | { kind: "OFFER"; item: Offer };

function formatDiscount(value: number, type: Coupon["discountType"]) {
  return type === "PERCENT" ? `${value}%` : formatCurrency(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function KindBadge({ kind }: { kind: DiscountRow["kind"] }) {
  const t = useTranslations("admin.promotions");
  const isCode = kind === "COUPON";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold shrink-0",
        isCode
          ? "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
          : "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
      )}
    >
      {isCode ? <Ticket className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
      {isCode ? t("badgeCode") : t("badgeAuto")}
    </span>
  );
}

export default function AdminPromotionsPage() {
  const t = useTranslations("admin.promotions");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("discounts");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");
  const [discountSheetOpen, setDiscountSheetOpen] = useState(false);
  const [membershipSheetOpen, setMembershipSheetOpen] = useState(false);

  const { data: coupons = [], isLoading: couponsLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => api.getCoupons(),
  });
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: () => api.getOffers(),
  });
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: () => api.getMembershipPlans(),
  });

  const pauseCoupon = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "PAUSED" }) =>
      api.updateCouponStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });
  const pauseOffer = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "PAUSED" }) =>
      api.updateOfferStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["offers"] }),
  });
  const pausePlan = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "PAUSED" }) =>
      api.updateMembershipPlanStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["membership-plans"] }),
  });

  const discounts = useMemo<DiscountRow[]>(() => {
    const rows: DiscountRow[] = [
      ...coupons.map((item) => ({ kind: "COUPON" as const, item })),
      ...offers.map((item) => ({ kind: "OFFER" as const, item })),
    ];
    rows.sort(
      (a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime()
    );
    return rows;
  }, [coupons, offers]);

  const filteredDiscounts = useMemo(() => {
    if (statusFilter === "ALL") return discounts;
    return discounts.filter((d) => d.item.status === statusFilter);
  }, [discounts, statusFilter]);

  const filteredPlans = useMemo(() => {
    if (statusFilter === "ALL") return plans;
    return plans.filter((p) => p.status === statusFilter);
  }, [plans, statusFilter]);

  const stats = useMemo(() => {
    const activeDiscounts = discounts.filter((d) => d.item.status === "ACTIVE").length;
    const activePlans = plans.filter((p) => p.status === "ACTIVE").length;
    const redemptions = discounts.reduce((sum, d) => sum + (d.item.redemptionCount ?? 0), 0);
    return { activeDiscounts, activePlans, redemptions, totalPlans: plans.length };
  }, [discounts, plans]);

  const tabs = useMemo(
    () => [
      { id: "discounts" as Tab, label: t("tabDiscounts"), icon: Percent },
      { id: "memberships" as Tab, label: t("tabMemberships"), icon: CreditCard },
    ],
    [t]
  );

  const statusFilters = useMemo(
    () => [
      { id: "ACTIVE" as StatusFilter, label: t("filterActive") },
      { id: "ALL" as StatusFilter, label: t("filterAll") },
      { id: "PAUSED" as StatusFilter, label: t("filterPaused") },
    ],
    [t]
  );

  const listLoading =
    tab === "discounts" ? couponsLoading || offersLoading : plansLoading;

  const listCount = tab === "discounts" ? filteredDiscounts.length : filteredPlans.length;
  const filterLabel = statusFilters.find((f) => f.id === statusFilter)?.label ?? "";
  const addLabel = tab === "discounts" ? t("addDiscount") : t("addPlan");

  const statItems =
    tab === "discounts"
      ? [
          {
            id: "active-discounts",
            label: t("statActiveDiscounts"),
            value: String(stats.activeDiscounts),
            icon: Percent,
            accent: "violet" as const,
            featured: true,
          },
          {
            id: "redemptions",
            label: t("statRedemptions"),
            value: String(stats.redemptions),
            icon: Ticket,
            accent: "sky" as const,
          },
        ]
      : [
          {
            id: "active-plans",
            label: t("statActivePlans"),
            value: String(stats.activePlans),
            icon: CreditCard,
            accent: "emerald" as const,
            featured: true,
          },
          {
            id: "total-plans",
            label: t("statTotalPlans"),
            value: String(stats.totalPlans),
            icon: Percent,
            accent: "violet" as const,
          },
        ];

  const openCreate = () => {
    if (tab === "discounts") setDiscountSheetOpen(true);
    else setMembershipSheetOpen(true);
  };

  return (
    <div className="dashboard-page-flow dashboard-page-flow--tight pb-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <DashboardOverviewShell>
        <div className="promotions-hub">
          <div className="promotions-hub-tabs">
            <SegmentedControl
              options={tabs}
              value={tab}
              onChange={(next) => {
                setTab(next);
                setStatusFilter("ACTIVE");
              }}
            />
          </div>

          <CompactStatsStrip loading={listLoading} items={statItems} />

          <div className="promotions-list-controls">
            <div className="promotions-list-controls-main">
              <div className="promotions-list-heading min-w-0">
                <h2 className="promotions-list-title">
                  {tab === "discounts" ? t("tabDiscounts") : t("tabMemberships")}
                </h2>
                <p className="promotions-list-hint">
                  {listLoading ? t("loading") : t("listShowing", { count: listCount, filter: filterLabel })}
                </p>
              </div>

              <div className="promotions-list-filters" role="tablist" aria-label={t("filterLabel")}>
                {statusFilters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={cn(
                      "promotions-filter-pill touch-manipulation",
                      statusFilter === f.id && "promotions-filter-pill--active"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className={cn(btnPrimarySm, "promotions-add-btn shrink-0")}
              aria-label={addLabel}
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{addLabel}</span>
            </button>
          </div>

          <div className="promotions-list-body">
            {listLoading ? (
              <PageLoader label={t("loading")} />
            ) : tab === "discounts" ? (
              filteredDiscounts.length === 0 ? (
                <EmptyState
                  title={t("noDiscounts")}
                  description={t("noDiscountsDesc")}
                  action={
                    <button type="button" onClick={openCreate} className={btnPrimary}>
                      <Plus className="w-4 h-4" />
                      {t("addDiscount")}
                    </button>
                  }
                />
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {filteredDiscounts.map((row) => {
                    const { item } = row;
                    const title =
                      row.kind === "COUPON" ? `${row.item.code} · ${row.item.name}` : item.name;

                    return (
                      <div key={`${row.kind}-${item.id}`} className="promo-list-row">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm text-[var(--text-primary)] leading-snug break-words">
                              {title}
                            </p>
                            <StatusBadge status={item.status} className="shrink-0" />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <KindBadge kind={row.kind} />
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatDiscount(item.discountValue, item.discountType)}
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {t("validUntil", { date: formatDate(item.endsAt) })}
                            </span>
                            {row.kind === "COUPON" ? (
                              <>
                                <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {t("usedCount", { count: item.redemptionCount ?? 0 })}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={btnSecondarySm}
                          disabled={pauseCoupon.isPending || pauseOffer.isPending}
                          onClick={() => {
                            const next = item.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
                            if (row.kind === "COUPON") {
                              pauseCoupon.mutate({ id: item.id, status: next });
                            } else {
                              pauseOffer.mutate({ id: item.id, status: next });
                            }
                          }}
                        >
                          {item.status === "ACTIVE" ? t("pause") : t("activate")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredPlans.length === 0 ? (
              <EmptyState
                title={t("noPlans")}
                description={t("noPlansDesc")}
                action={
                  <button type="button" onClick={openCreate} className={btnPrimary}>
                    <Plus className="w-4 h-4" />
                    {t("addPlan")}
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredPlans.map((p) => (
                  <div key={p.id} className="promo-list-row">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-[var(--text-primary)] leading-snug break-words">
                          {p.name}
                        </p>
                        <StatusBadge status={p.status} className="shrink-0" />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {p.cadence === "MONTHS_12" ? t("months12") : t("months6")} ·{" "}
                        {formatCurrency(p.feeAmount)} · {p.benefitPercent}% {t("benefitOff")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={btnSecondarySm}
                      disabled={pausePlan.isPending}
                      onClick={() =>
                        pausePlan.mutate({
                          id: p.id,
                          status: p.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                    >
                      {p.status === "ACTIVE" ? t("pause") : t("activate")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardOverviewShell>

      <DiscountCreateSheet open={discountSheetOpen} onClose={() => setDiscountSheetOpen(false)} />
      <MembershipCreateSheet open={membershipSheetOpen} onClose={() => setMembershipSheetOpen(false)} />
    </div>
  );
}
