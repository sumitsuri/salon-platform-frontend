"use client";

import { useTranslations } from "next-intl";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PanelShell, LabeledProgressBar } from "@/components/enterprise-ui";

interface PaymentMixTeaserProps {
  paymentMix?: { cash: number; upi: number; card: number };
  loading?: boolean;
}

export function PaymentMixTeaser({ paymentMix, loading }: PaymentMixTeaserProps) {
  const t = useTranslations("admin.dashboard");
  const tCommon = useTranslations("common");

  const mix = paymentMix ?? { cash: 0, upi: 0, card: 0 };
  const total = mix.cash + mix.upi + mix.card;

  return (
    <PanelShell
      title={t("paymentMix")}
      subtitle={loading ? tCommon("loading") : total > 0 ? formatCurrency(total) : undefined}
      icon={Wallet}
      accent="emerald"
    >
      {loading ? (
        <p className="text-sm text-[var(--text-secondary)]">{tCommon("loading")}</p>
      ) : (
        <div className="space-y-4">
          {[
            { label: tCommon("cash"), value: mix.cash, color: "bg-emerald-500" },
            { label: tCommon("upi"), value: mix.upi, color: "bg-[var(--brand)]" },
            { label: tCommon("card"), value: mix.card, color: "bg-[var(--brand)]" },
          ].map((p) => (
            <LabeledProgressBar
              key={p.label}
              label={p.label}
              value={p.value}
              total={total || 1}
              color={p.color}
              formatValue={formatCurrency}
            />
          ))}
        </div>
      )}
    </PanelShell>
  );
}
