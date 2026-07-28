"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CreditCard, Percent, Tag, Ticket } from "lucide-react";
import {
  api,
  type CreateCouponRequest,
  type CreateMembershipPlanRequest,
  type CreateOfferRequest,
  type DiscountType,
  type MembershipCadence,
  type ServiceScopeType,
} from "@/lib/api";
import {
  PageHeader,
  Card,
  ListRow,
  EmptyState,
  btnPrimary,
  btnSecondary,
  inputClass,
  selectClass,
} from "@/components/ui";
import { MissionStrip } from "@/components/brand/MissionStrip";
import { formatCurrency } from "@/lib/utils";

type Tab = "coupons" | "offers" | "memberships";

function toIsoStart(date: string) {
  return new Date(`${date}T00:00:00+05:30`).toISOString();
}
function toIsoEnd(date: string) {
  return new Date(`${date}T23:59:59+05:30`).toISOString();
}

export default function AdminPromotionsPage() {
  const t = useTranslations("admin.promotions");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("coupons");
  const [error, setError] = useState("");

  const { data: coupons = [] } = useQuery({ queryKey: ["coupons"], queryFn: () => api.getCoupons() });
  const { data: offers = [] } = useQuery({ queryKey: ["offers"], queryFn: () => api.getOffers() });
  const { data: plans = [] } = useQuery({
    queryKey: ["membership-plans"],
    queryFn: () => api.getMembershipPlans(),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });

  const [couponForm, setCouponForm] = useState({
    name: "",
    code: "",
    discountType: "PERCENT" as DiscountType,
    discountValue: "10",
    startDate: "",
    endDate: "",
    serviceScope: "ALL" as ServiceScopeType,
    categoryId: "",
  });

  const [offerForm, setOfferForm] = useState({
    name: "",
    discountType: "PERCENT" as DiscountType,
    discountValue: "20",
    startDate: "",
    endDate: "",
    serviceScope: "ALL" as ServiceScopeType,
    categoryId: "",
  });

  const [planForm, setPlanForm] = useState({
    name: "Member Card",
    cadence: "MONTHS_6" as MembershipCadence,
    feeAmount: "2999",
    benefitPercent: "10",
  });

  const createCoupon = useMutation({
    mutationFn: (data: CreateCouponRequest) => api.createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setCouponForm({
        name: "",
        code: "",
        discountType: "PERCENT",
        discountValue: "10",
        startDate: "",
        endDate: "",
        serviceScope: "ALL",
        categoryId: "",
      });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const createOffer = useMutation({
    mutationFn: (data: CreateOfferRequest) => api.createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setOfferForm({
        name: "",
        discountType: "PERCENT",
        discountValue: "20",
        startDate: "",
        endDate: "",
        serviceScope: "ALL",
        categoryId: "",
      });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
  });

  const createPlan = useMutation({
    mutationFn: (data: CreateMembershipPlanRequest) => api.createMembershipPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      setPlanForm({ name: "Member Card", cadence: "MONTHS_6", feeAmount: "2999", benefitPercent: "10" });
      setError("");
    },
    onError: (e: Error) => setError(e.message),
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

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name })),
    [categories]
  );

  function submitCoupon() {
    if (!couponForm.name || !couponForm.code || !couponForm.startDate || !couponForm.endDate) {
      setError(t("fillRequired"));
      return;
    }
    createCoupon.mutate({
      name: couponForm.name,
      code: couponForm.code,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      startsAt: toIsoStart(couponForm.startDate),
      endsAt: toIsoEnd(couponForm.endDate),
      serviceScope: couponForm.serviceScope,
      scopeIds:
        couponForm.serviceScope === "CATEGORY" && couponForm.categoryId
          ? [couponForm.categoryId]
          : undefined,
    });
  }

  function submitOffer() {
    if (!offerForm.name || !offerForm.startDate || !offerForm.endDate) {
      setError(t("fillRequired"));
      return;
    }
    if (offerForm.serviceScope === "CATEGORY" && !offerForm.categoryId) {
      setError(t("pickCategory"));
      return;
    }
    createOffer.mutate({
      name: offerForm.name,
      discountType: offerForm.discountType,
      discountValue: Number(offerForm.discountValue),
      startsAt: toIsoStart(offerForm.startDate),
      endsAt: toIsoEnd(offerForm.endDate),
      serviceScope: offerForm.serviceScope,
      scopeIds:
        offerForm.serviceScope === "CATEGORY" && offerForm.categoryId
          ? [offerForm.categoryId]
          : undefined,
    });
  }

  function submitPlan() {
    if (!planForm.name || !planForm.feeAmount) {
      setError(t("fillRequired"));
      return;
    }
    createPlan.mutate({
      name: planForm.name,
      cadence: planForm.cadence,
      feeAmount: Number(planForm.feeAmount),
      benefitPercent: Number(planForm.benefitPercent),
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <MissionStrip />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["coupons", t("tabCoupons"), Ticket],
            ["offers", t("tabOffers"), Tag],
            ["memberships", t("tabMemberships"), CreditCard],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
            }}
            className={`${tab === id ? btnPrimary : btnSecondary} inline-flex items-center gap-2`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === "coupons" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Percent className="w-4 h-4 text-[var(--brand)]" />
              {t("newCoupon")}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder={t("name")} value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} className={inputClass} />
              <input placeholder={t("code")} value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} className={inputClass} />
              <select value={couponForm.discountType} onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as DiscountType })} className={selectClass}>
                <option value="PERCENT">{t("percent")}</option>
                <option value="FLAT">{t("flat")}</option>
              </select>
              <input type="number" min={0} placeholder={t("value")} value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })} className={inputClass} />
              <input type="date" value={couponForm.startDate} onChange={(e) => setCouponForm({ ...couponForm, startDate: e.target.value })} className={inputClass} />
              <input type="date" value={couponForm.endDate} onChange={(e) => setCouponForm({ ...couponForm, endDate: e.target.value })} className={inputClass} />
              <select value={couponForm.serviceScope} onChange={(e) => setCouponForm({ ...couponForm, serviceScope: e.target.value as ServiceScopeType })} className={selectClass}>
                <option value="ALL">{t("scopeAll")}</option>
                <option value="CATEGORY">{t("scopeCategory")}</option>
              </select>
              {couponForm.serviceScope === "CATEGORY" && (
                <select value={couponForm.categoryId} onChange={(e) => setCouponForm({ ...couponForm, categoryId: e.target.value })} className={selectClass}>
                  <option value="">{t("pickCategory")}</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
            <button onClick={submitCoupon} disabled={createCoupon.isPending} className={btnPrimary}>
              {createCoupon.isPending ? tCommon("saving") : t("createCoupon")}
            </button>
          </Card>

          <Card padding={false}>
            {coupons.length === 0 ? (
              <EmptyState title={t("noCoupons")} description={t("noCouponsDesc")} />
            ) : (
              coupons.map((c) => (
                <ListRow
                  key={c.id}
                  title={`${c.code} · ${c.name}`}
                  subtitle={`${c.discountType === "PERCENT" ? `${c.discountValue}%` : formatCurrency(c.discountValue)} · ${c.status} · used ${c.redemptionCount ?? 0}`}
                  trailing={
                    <button
                      className={btnSecondary}
                      onClick={() =>
                        pauseCoupon.mutate({
                          id: c.id,
                          status: c.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                    >
                      {c.status === "ACTIVE" ? t("pause") : t("activate")}
                    </button>
                  }
                />
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "offers" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("newOffer")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder={t("name")} value={offerForm.name} onChange={(e) => setOfferForm({ ...offerForm, name: e.target.value })} className={inputClass} />
              <select value={offerForm.discountType} onChange={(e) => setOfferForm({ ...offerForm, discountType: e.target.value as DiscountType })} className={selectClass}>
                <option value="PERCENT">{t("percent")}</option>
                <option value="FLAT">{t("flat")}</option>
              </select>
              <input type="number" min={0} value={offerForm.discountValue} onChange={(e) => setOfferForm({ ...offerForm, discountValue: e.target.value })} className={inputClass} />
              <select value={offerForm.serviceScope} onChange={(e) => setOfferForm({ ...offerForm, serviceScope: e.target.value as ServiceScopeType })} className={selectClass}>
                <option value="ALL">{t("scopeAll")}</option>
                <option value="CATEGORY">{t("scopeCategory")}</option>
              </select>
              {offerForm.serviceScope === "CATEGORY" && (
                <select value={offerForm.categoryId} onChange={(e) => setOfferForm({ ...offerForm, categoryId: e.target.value })} className={selectClass}>
                  <option value="">{t("pickCategory")}</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <input type="date" value={offerForm.startDate} onChange={(e) => setOfferForm({ ...offerForm, startDate: e.target.value })} className={inputClass} />
              <input type="date" value={offerForm.endDate} onChange={(e) => setOfferForm({ ...offerForm, endDate: e.target.value })} className={inputClass} />
            </div>
            <button onClick={submitOffer} disabled={createOffer.isPending} className={btnPrimary}>
              {createOffer.isPending ? tCommon("saving") : t("createOffer")}
            </button>
          </Card>

          <Card padding={false}>
            {offers.length === 0 ? (
              <EmptyState title={t("noOffers")} description={t("noOffersDesc")} />
            ) : (
              offers.map((o) => (
                <ListRow
                  key={o.id}
                  title={o.name}
                  subtitle={`${o.discountType === "PERCENT" ? `${o.discountValue}%` : formatCurrency(o.discountValue)} · ${o.status}`}
                  trailing={
                    <button
                      className={btnSecondary}
                      onClick={() =>
                        pauseOffer.mutate({
                          id: o.id,
                          status: o.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                    >
                      {o.status === "ACTIVE" ? t("pause") : t("activate")}
                    </button>
                  }
                />
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "memberships" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("newPlan")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input placeholder={t("name")} value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className={inputClass} />
              <select value={planForm.cadence} onChange={(e) => setPlanForm({ ...planForm, cadence: e.target.value as MembershipCadence })} className={selectClass}>
                <option value="MONTHS_6">{t("months6")}</option>
                <option value="MONTHS_12">{t("months12")}</option>
              </select>
              <input type="number" min={0} placeholder={t("fee")} value={planForm.feeAmount} onChange={(e) => setPlanForm({ ...planForm, feeAmount: e.target.value })} className={inputClass} />
              <input type="number" min={0} max={100} placeholder={t("benefitPercent")} value={planForm.benefitPercent} onChange={(e) => setPlanForm({ ...planForm, benefitPercent: e.target.value })} className={inputClass} />
            </div>
            <button onClick={submitPlan} disabled={createPlan.isPending} className={btnPrimary}>
              {createPlan.isPending ? tCommon("saving") : t("createPlan")}
            </button>
          </Card>

          <Card padding={false}>
            {plans.length === 0 ? (
              <EmptyState title={t("noPlans")} description={t("noPlansDesc")} />
            ) : (
              plans.map((p) => (
                <ListRow
                  key={p.id}
                  title={p.name}
                  subtitle={`${p.cadence === "MONTHS_12" ? "12 mo" : "6 mo"} · ${formatCurrency(p.feeAmount)} · ${p.benefitPercent}% off · ${p.status}`}
                  trailing={
                    <button
                      className={btnSecondary}
                      onClick={() =>
                        pausePlan.mutate({
                          id: p.id,
                          status: p.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                        })
                      }
                    >
                      {p.status === "ACTIVE" ? t("pause") : t("activate")}
                    </button>
                  }
                />
              ))
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
