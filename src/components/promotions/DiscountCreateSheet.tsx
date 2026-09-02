"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  api,
  type CreateCouponRequest,
  type CreateOfferRequest,
  type DiscountType,
  type ServiceScopeType,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { SideSheet, inputClass, selectClass, btnPrimary } from "@/components/ui";

type ApplyMode = "CODE" | "AUTO";

function toIsoStart(date: string) {
  return new Date(`${date}T00:00:00+05:30`).toISOString();
}

function toIsoEnd(date: string) {
  return new Date(`${date}T23:59:59+05:30`).toISOString();
}

const defaultForm = {
  name: "",
  code: "",
  discountType: "PERCENT" as DiscountType,
  discountValue: "10",
  startDate: "",
  endDate: "",
  serviceScope: "ALL" as ServiceScopeType,
  categoryId: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function DiscountCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.promotions");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [applyMode, setApplyMode] = useState<ApplyMode>("CODE");
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
    enabled: open,
  });

  const reset = () => {
    setForm(defaultForm);
    setApplyMode("CODE");
    setError("");
  };

  const close = () => {
    if (createCoupon.isPending || createOffer.isPending) return;
    reset();
    onClose();
  };

  const createCoupon = useMutation({
    mutationFn: (data: CreateCouponRequest) => api.createCoupon(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["coupons"] });
      reset();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const createOffer = useMutation({
    mutationFn: (data: CreateOfferRequest) => api.createOffer(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["offers"] });
      reset();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const pending = createCoupon.isPending || createOffer.isPending;

  function submit() {
    if (!form.name || !form.startDate || !form.endDate) {
      setError(t("fillRequired"));
      return;
    }
    if (applyMode === "CODE" && !form.code.trim()) {
      setError(t("fillRequired"));
      return;
    }
    if (form.serviceScope === "CATEGORY" && !form.categoryId) {
      setError(t("pickCategory"));
      return;
    }

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startsAt: toIsoStart(form.startDate),
      endsAt: toIsoEnd(form.endDate),
      serviceScope: form.serviceScope,
      scopeIds:
        form.serviceScope === "CATEGORY" && form.categoryId ? [form.categoryId] : undefined,
    };

    setError("");
    if (applyMode === "CODE") {
      createCoupon.mutate({ ...payload, code: form.code.trim().toUpperCase() });
    } else {
      createOffer.mutate(payload);
    }
  }

  return (
    <SideSheet
      open={open}
      onClose={close}
      title={t("newDiscount")}
      subtitle={t("newDiscountSubtitle")}
      footer={
        <button type="button" onClick={submit} disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? tCommon("saving") : t("createDiscount")}
        </button>
      }
    >
      <div className="space-y-5">
        <Field label={t("applyModeLabel")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["CODE", t("applyModeCode"), t("applyModeCodeHint")],
                ["AUTO", t("applyModeAuto"), t("applyModeAutoHint")],
              ] as const
            ).map(([mode, label, hint]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setApplyMode(mode)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  applyMode === mode
                    ? "border-[var(--brand)] bg-[var(--gradient-brand-soft)] ring-1 ring-[var(--brand-ring)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-brand)]"
                )}
              >
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{hint}</p>
              </button>
            ))}
          </div>
        </Field>

        <Field label={t("name")}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder={t("namePlaceholder")}
          />
        </Field>

        {applyMode === "CODE" ? (
          <Field label={t("code")}>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className={inputClass}
              placeholder={t("codePlaceholder")}
              autoCapitalize="characters"
            />
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("discountType")}>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })}
              className={selectClass}
            >
              <option value="PERCENT">{t("percent")}</option>
              <option value="FLAT">{t("flat")}</option>
            </select>
          </Field>
          <Field label={t("value")}>
            <input
              type="number"
              min={0}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("startDate")}>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("endDate")}>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t("scopeLabel")}>
          <select
            value={form.serviceScope}
            onChange={(e) => setForm({ ...form, serviceScope: e.target.value as ServiceScopeType })}
            className={selectClass}
          >
            <option value="ALL">{t("scopeAll")}</option>
            <option value="CATEGORY">{t("scopeCategory")}</option>
          </select>
        </Field>

        {form.serviceScope === "CATEGORY" ? (
          <Field label={t("pickCategory")}>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className={selectClass}
            >
              <option value="">{t("pickCategory")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </SideSheet>
  );
}
