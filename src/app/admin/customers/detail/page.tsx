"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CustomerDetailPanel } from "@/components/customer/CustomerDetailPanel";
import { customersPath } from "@/lib/navigation-scope";
import { useUrlQueryParam } from "@/lib/use-url-query-param";
import { btnPrimary } from "@/components/ui";

export default function AdminCustomerDetailPage() {
  const customerParam = useUrlQueryParam("id");
  const customerId = customerParam.value ?? "";
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");

  if (!customerId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">{tCommon("failed")}</p>
        <Link href={customersPath("admin")} className={`${btnPrimary} min-h-11 inline-flex`}>
          {t("backToCustomers")}
        </Link>
      </div>
    );
  }

  return <CustomerDetailPanel scope="admin" customerId={customerId} />;
}
