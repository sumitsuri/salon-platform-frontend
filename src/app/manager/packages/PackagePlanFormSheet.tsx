"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  discountPercentFromPrice,
  packageListTotal,
  priceFromDiscountPercent,
} from "@/lib/package-pricing";
import { formatCurrency, cn } from "@/lib/utils";
import { SideSheet, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { PackageServiceCatalogPicker } from "./PackageServiceCatalogPicker";
import type { PackagePlanType } from "@/lib/api";
import type { PackagePlanItemDraft } from "./package-plan-types";

export type PackagePlanFormValues = {
  name: string;
  planType: PackagePlanType;
  creditValue: number;
  validityDays: number;
  singleVisit: boolean;
  discountPercent: number;
  packagePrice: number;
  items: PackagePlanItemDraft[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: string;
  title: string;
  initial: PackagePlanFormValues;
  saving?: boolean;
  onSubmit: (values: PackagePlanFormValues) => void;
};

export function PackagePlanFormSheet({
  open,
  onClose,
  branchId,
  title,
  initial,
  saving,
  onSubmit,
}: Props) {
  const t = useTranslations("manager.packages");
  const tCommon = useTranslations("common");
  const [name, setName] = useState(initial.name);
  const [planType, setPlanType] = useState<PackagePlanType>(initial.planType);
  const [creditValue, setCreditValue] = useState(String(initial.creditValue));
  const [validityDays, setValidityDays] = useState(String(initial.validityDays));
  const [singleVisit, setSingleVisit] = useState(initial.singleVisit);
  const [discountPercent, setDiscountPercent] = useState(String(initial.discountPercent));
  const [packagePrice, setPackagePrice] = useState(String(initial.packagePrice));
  const [items, setItems] = useState<PackagePlanItemDraft[]>(initial.items);
  const [priceTouched, setPriceTouched] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name);
    setPlanType(initial.planType);
    setCreditValue(String(initial.creditValue));
    setValidityDays(String(initial.validityDays));
    setSingleVisit(initial.singleVisit);
    setDiscountPercent(String(initial.discountPercent));
    setPackagePrice(String(initial.packagePrice));
    setItems(initial.items);
    setPriceTouched(false);
    setFormError("");
  }, [open, initial]);

  const { data: branchServices = [] } = useQuery({
    queryKey: ["branch-services", branchId],
    queryFn: () => api.getBranchServices(branchId),
    enabled: open && !!branchId,
  });

  const priceByServiceId = useMemo(() => {
    const map = new Map<string, number>();
    branchServices.forEach((s) => map.set(s.serviceId, s.price));
    return map;
  }, [branchServices]);

  const isValueCredit = planType === "VALUE_CREDIT";

  const listTotal = useMemo(() => {
    if (isValueCredit) {
      const credit = Number(creditValue);
      return Number.isFinite(credit) && credit > 0 ? credit : 0;
    }
    return packageListTotal(items, priceByServiceId);
  }, [isValueCredit, creditValue, items, priceByServiceId]);

  useEffect(() => {
    if (priceTouched || listTotal <= 0) return;
    const pct = Number(discountPercent);
    if (!Number.isFinite(pct)) return;
    setPackagePrice(String(priceFromDiscountPercent(listTotal, pct)));
  }, [discountPercent, listTotal, priceTouched]);

  function onDiscountChange(raw: string) {
    setDiscountPercent(raw);
    setPriceTouched(false);
  }

  function onPriceChange(raw: string) {
    setPackagePrice(raw);
    setPriceTouched(true);
    const price = Number(raw);
    if (Number.isFinite(price) && listTotal > 0) {
      setDiscountPercent(String(discountPercentFromPrice(listTotal, price)));
    }
  }

  function handleSubmit() {
    const days = Number(validityDays);
    const price = Number(packagePrice);
    const discount = Number(discountPercent);
    if (!name.trim()) {
      setFormError(t("planNameRequired"));
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      setFormError(t("validityDaysInvalid"));
      return;
    }
    if (!isValueCredit && items.length === 0) {
      setFormError(t("itemsRequired"));
      return;
    }
    if (isValueCredit) {
      const credit = Number(creditValue);
      if (!Number.isFinite(credit) || credit <= 0) {
        setFormError(t("creditValueInvalid"));
        return;
      }
      if (price > credit) {
        setFormError(t("salePriceExceedsCredit"));
        return;
      }
    } else if (listTotal <= 0) {
      setFormError(t("itemsPricingLoading"));
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError(t("planPriceInvalid"));
      return;
    }
    setFormError("");
    onSubmit({
      name: name.trim(),
      planType,
      creditValue: isValueCredit ? Number(creditValue) : 0,
      validityDays: days,
      singleVisit: isValueCredit ? false : singleVisit,
      discountPercent: Number.isFinite(discount) ? discount : 0,
      packagePrice: price,
      items: isValueCredit ? [] : items,
    });
  }

  const canSave =
    !!name.trim() &&
    listTotal > 0 &&
    Number(packagePrice) > 0 &&
    Number(validityDays) >= 1 &&
    (isValueCredit || items.length > 0);

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            {tCommon("cancel")}
          </button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={saving || !canSave}>
            {saving ? tCommon("processing") : tCommon("save")}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pb-4">
        {formError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3 cursor-pointer touch-manipulation",
              planType === "SERVICE_BUNDLE"
                ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
                : "border-[var(--border)]"
            )}
          >
            <input
              type="radio"
              name="pkg-type"
              className="sr-only"
              checked={planType === "SERVICE_BUNDLE"}
              onChange={() => setPlanType("SERVICE_BUNDLE")}
              disabled={saving}
            />
            <span className="text-sm font-medium">{t("planTypeBundle")}</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{t("planTypeBundleHint")}</span>
          </label>
          <label
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-3 cursor-pointer touch-manipulation",
              planType === "VALUE_CREDIT"
                ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
                : "border-[var(--border)]"
            )}
          >
            <input
              type="radio"
              name="pkg-type"
              className="sr-only"
              checked={planType === "VALUE_CREDIT"}
              onChange={() => {
                setPlanType("VALUE_CREDIT");
                setSingleVisit(false);
              }}
              disabled={saving}
            />
            <span className="text-sm font-medium">{t("planTypeValueCredit")}</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{t("planTypeValueCreditHint")}</span>
          </label>
        </div>

        <div>
          <label className="ui-field-label block mb-1" htmlFor="pkg-name">
            {t("planName")}
          </label>
          <input
            id="pkg-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className={cn("grid gap-3", !isValueCredit && "sm:grid-cols-2")}>
          <div>
            <label className="ui-field-label block mb-1" htmlFor="pkg-validity">
              {t("validityDaysLabel")}
            </label>
            <input
              id="pkg-validity"
              className={inputClass}
              inputMode="numeric"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              disabled={saving}
            />
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{t("validityDaysHint")}</p>
          </div>
          {!isValueCredit ? (
            <label
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 cursor-pointer touch-manipulation transition-colors",
                !singleVisit
                  ? "border-[var(--brand)] bg-[var(--brand-light)]/40"
                  : "border-[var(--border)] bg-[var(--surface)]"
              )}
            >
              <input
                id="pkg-multi-visit"
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                checked={!singleVisit}
                onChange={(e) => setSingleVisit(!e.target.checked)}
                disabled={saving}
              />
              <span className="text-sm">
                <span className="font-medium text-[var(--text-primary)]">{t("multiVisitCheckbox")}</span>
                <span className="block text-[11px] text-[var(--text-tertiary)] mt-0.5">{t("multiVisitHint")}</span>
              </span>
            </label>
          ) : null}
        </div>

        {isValueCredit ? (
          <div>
            <label className="ui-field-label block mb-1" htmlFor="pkg-credit">
              {t("creditValueLabel")}
            </label>
            <input
              id="pkg-credit"
              className={inputClass}
              inputMode="decimal"
              value={creditValue}
              onChange={(e) => {
                setCreditValue(e.target.value);
                setPriceTouched(false);
              }}
              disabled={saving}
            />
            <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{t("creditValueHint")}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-3 space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            {isValueCredit
              ? t("creditListValue", { amount: formatCurrency(listTotal) })
              : t("servicesListValue", { amount: formatCurrency(listTotal) })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="ui-field-label block mb-1" htmlFor="pkg-discount">
                {t("discountPercentLabel")}
              </label>
              <input
                id="pkg-discount"
                className={inputClass}
                inputMode="decimal"
                value={discountPercent}
                onChange={(e) => onDiscountChange(e.target.value)}
                disabled={saving || listTotal <= 0}
              />
            </div>
            <div>
              <label className="ui-field-label block mb-1" htmlFor="pkg-price">
                {t("planPrice")}
              </label>
              <input
                id="pkg-price"
                className={inputClass}
                inputMode="decimal"
                value={packagePrice}
                onChange={(e) => onPriceChange(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {!isValueCredit ? (
          <div>
            <p className="ui-field-label block mb-2">{t("pickServicesTitle")}</p>
            <PackageServiceCatalogPicker
              branchId={branchId}
              items={items}
              onChange={setItems}
              disabled={saving}
            />
          </div>
        ) : null}
      </div>
    </SideSheet>
  );
}
