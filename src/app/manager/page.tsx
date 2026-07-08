"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ManagerHomePage() {
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
        <p className="hero-muted text-sm font-medium">{greeting()}</p>
        <h1 className="text-xl font-bold mt-0.5">{user?.name?.split(" ")[0] || "Manager"}</h1>
        <p className="hero-subtitle text-sm mt-1">{user?.branchName}</p>
        <Link href="/manager/walk-in" className="hero-cta mt-4 w-full sm:w-auto">
          <UserPlus className="w-4 h-4" />
          New Walk-in
        </Link>
      </HeroBanner>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Today's Revenue" value={formatCurrency(todayRevenue)} icon={TrendingUp} accent="emerald" />
        <StatCard label="Completed" value={completed.length} icon={Users} accent="brand" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} accent="amber" className="col-span-2 sm:col-span-1" />
      </div>

      <div>
        <SectionLabel>Quick actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <QuickAction href="/manager/walk-in" icon={UserPlus} label="Walk-in" description="New customer" color="brand" />
          <QuickAction href="/manager/attendance" icon={Fingerprint} label="Attendance" description="Staff check-in" color="violet" />
          <QuickAction href="/manager/bookings" icon={ClipboardList} label="Bookings" description="All visits" color="emerald" />
          <QuickAction href="/manager/insights" icon={Sparkles} label="Insights" description="AI tips" color="amber" />
          <QuickAction href="/manager/services" icon={Scissors} label="Services" description="Sales mix" color="violet" />
        </div>
      </div>

      <InsightsTeaser data={recommendations} loading={recommendationsLoading} href="/manager/insights" />

      <ServiceContributionTeaser data={serviceContribution} loading={servicesLoading} href="/manager/services" />

      <Card padding={false}>
        <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)] text-sm">Recent visits</h2>
          <Link href="/manager/bookings" className="link-brand text-xs">
            View all
          </Link>
        </div>
        {isLoading ? (
          <p className="p-4 text-[var(--text-secondary)] text-sm">Loading...</p>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No visits yet today"
            description="Start your first walk-in to see activity here"
            action={
              <Link href="/manager/walk-in" className={btnPrimary}>
                <UserPlus className="w-4 h-4" />
                New Walk-in
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
