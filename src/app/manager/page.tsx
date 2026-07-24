"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  UserPlus,
  TrendingUp,
  Users,
  Clock,
  Fingerprint,
  ClipboardList,
  Sparkles,
  Scissors,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { formatCurrency } from "@/lib/utils";
import { InsightsTeaser } from "@/components/InsightsTeaser";
import { ServiceContributionTeaser } from "@/components/ServiceContributionTeaser";
import { insightPeriodToRange } from "@/lib/insights-utils";
import {
  StatCard,
  QuickAction,
  Card,
  StatusBadge,
  ListRow,
  btnPrimary,
  EmptyState,
  HeroBanner,
  SectionLabel,
} from "@/components/ui";

function useGreeting() {
  const t = useTranslations("manager.home");
  const h = new Date().getHours();
  if (h < 12) return t("goodMorning");
  if (h < 17) return t("goodAfternoon");
  return t("goodEvening");
}

export default function ManagerHomePage() {
  const t = useTranslations("manager.home");
  const tNav = useTranslations("manager.nav");
  const tCommon = useTranslations("common");
  const greeting = useGreeting();
  const user = useAuthStore((s) => s.user);
  const branchId = user?.branchId || "";
  const dateRange = insightPeriodToRange("days60");

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", branchId],
    queryFn: () => api.getBookings({ branchId, page: 0, size: 20 }),
    enabled: !!branchId,
  });
  const bookings = data?.content ?? [];

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", branchId, "days60"],
    queryFn: () => api.getRecommendations(dateRange),
    enabled: !!branchId,
  });

  const { data: serviceContribution, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-contribution", branchId, "days60"],
    queryFn: () => api.getServiceContribution(dateRange),
    enabled: !!branchId,
  });

  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const todayRevenue = completed.reduce((s, b) => s + (b.billPreview?.grandTotal || 0), 0);
  const inProgress = bookings.filter((b) => b.status !== "COMPLETED" && b.status !== "CANCELLED").length;

  return (
    <div className="space-y-5">
      <HeroBanner>
        <p className="hero-muted text-sm font-medium">{greeting}</p>
        <h1 className="text-xl font-bold mt-0.5">{user?.name?.split(" ")[0] || t("manager")}</h1>
        <p className="hero-subtitle text-sm mt-1">{user?.branchName}</p>
        <Link href="/manager/walk-in" className="hero-cta mt-4 w-full sm:w-auto">
          <UserPlus className="w-4 h-4" />
          {t("newWalkIn")}
        </Link>
      </HeroBanner>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={t("todayRevenue")} value={formatCurrency(todayRevenue)} icon={TrendingUp} accent="emerald" />
        <StatCard label={t("completed")} value={completed.length} icon={Users} accent="brand" />
        <StatCard label={t("inProgress")} value={inProgress} icon={Clock} accent="amber" className="col-span-2 sm:col-span-1" />
      </div>

      <div>
        <SectionLabel>{t("quickActions")}</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/manager/walk-in" icon={UserPlus} label={t("newWalkIn")} description={t("walkInDesc")} color="brand" />
          <QuickAction href="/manager/attendance" icon={Fingerprint} label={t("attendance")} description={t("attendanceDesc")} color="violet" />
          <QuickAction href="/manager/bookings" icon={ClipboardList} label={tNav("bookings")} description={t("bookingsDesc")} color="emerald" />
          <QuickAction href="/manager/insights" icon={Sparkles} label={tNav("insights")} description={t("insightsDesc")} color="amber" />
          <QuickAction href="/manager/services" icon={Scissors} label={tNav("services")} description={t("servicesDesc")} color="violet" />
        </div>
      </div>

      <InsightsTeaser data={recommendations} loading={recommendationsLoading} href="/manager/insights" />

      <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/manager/services" />

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">{t("recentVisits")}</h2>
          <Link href="/manager/bookings" className="link-brand text-xs">
            {tCommon("viewAll")}
          </Link>
        </div>
        {isLoading ? (
          <p className="p-4 text-[var(--text-secondary)] text-sm">{tCommon("loading")}</p>
        ) : bookings.length === 0 ? (
          <EmptyState
            title={t("noVisitsTitle")}
            description={t("noVisitsDesc")}
            action={
              <Link href="/manager/walk-in" className={btnPrimary}>
                <UserPlus className="w-4 h-4" />
                {t("newWalkIn")}
              </Link>
            }
          />
        ) : (
          <div>
            {bookings.slice(0, 6).map((b) => (
              <ListRow
                key={b.id}
                title={b.customerName}
                subtitle={`${b.customerPhone} · ${b.lines?.map((l) => l.serviceName).join(", ")}`}
                trailing={
                  <div className="text-right">
                    {b.billPreview && (
                      <p className="text-sm font-bold text-[var(--text-primary)]">{formatCurrency(b.billPreview.grandTotal)}</p>
                    )}
                    <StatusBadge status={b.status} />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
