"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { api, type CreateMembershipPlanRequest, type MembershipCadence } from "@/lib/api";
import { SideSheet, inputClass, selectClass, btnPrimary } from "@/components/ui";

const defaultForm = {
  name: "Member Card",
  cadence: "MONTHS_6" as MembershipCadence,
  feeAmount: "2999",
  benefitPercent: "10",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function MembershipCreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.promotions");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  const reset = () => {
    setForm(defaultForm);
    setError("");
  };

  const close = () => {
    if (createPlan.isPending) return;
    reset();
    onClose();
  };

  const createPlan = useMutation({
    mutationFn: (data: CreateMembershipPlanRequest) => api.createMembershipPlan(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["membership-plans"] });
      reset();
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit() {
    if (!form.name || !form.feeAmount) {
      setError(t("fillRequired"));
      return;
    }
    setError("");
    createPlan.mutate({
      name: form.name.trim(),
      cadence: form.cadence,
      feeAmount: Number(form.feeAmount),
      benefitPercent: Number(form.benefitPercent),
    });
  }

  return (
    <SideSheet
      open={open}
      onClose={close}
      title={t("newPlan")}
      subtitle={t("newPlanSubtitle")}
      footer={
        <button type="button" onClick={submit} disabled={createPlan.isPending} className={`${btnPrimary} w-full`}>
          {createPlan.isPending ? tCommon("saving") : t("createPlan")}
        </button>
      }
    >
      <div className="space-y-4">
        <Field label={t("name")}>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={t("cadenceLabel")}>
          <select
            value={form.cadence}
            onChange={(e) => setForm({ ...form, cadence: e.target.value as MembershipCadence })}
            className={selectClass}
          >
            <option value="MONTHS_6">{t("months6")}</option>
            <option value="MONTHS_12">{t("months12")}</option>
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("fee")}>
            <input
              type="number"
              min={0}
              value={form.feeAmount}
              onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label={t("benefitPercent")}>
            <input
              type="number"
              min={0}
              max={100}
              value={form.benefitPercent}
              onChange={(e) => setForm({ ...form, benefitPercent: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </SideSheet>
  );
}
