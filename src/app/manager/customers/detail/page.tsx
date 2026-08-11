"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CustomerDetailPanel } from "@/components/customer/CustomerDetailPanel";
import { customersPath } from "@/lib/navigation-scope";
import { btnPrimary } from "@/components/ui";

export default function ManagerCustomerDetailPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id") ?? "";
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");

  if (!customerId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">{tCommon("failed")}</p>
        <Link href={customersPath("manager")} className={`${btnPrimary} min-h-11 inline-flex`}>
          {t("backToCustomers")}
        </Link>
      </div>
    );
  }

  return <CustomerDetailPanel scope="manager" customerId={customerId} />;
}
