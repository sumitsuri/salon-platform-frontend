"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { MessageSquareHeart, Star, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { BranchMultiSelect } from "@/components/BranchMultiSelect";
import { PageHeader, StatCard, PageLoader } from "@/components/ui";
import { DashboardHero } from "@/components/enterprise-ui";

const CATEGORY_LABELS: Record<string, string> = {
  SERVICE: "Service quality",
  AMBIENCE: "Ambience",
  STAFF: "Staff attitude",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value for money",
};

const TAG_LABELS: Record<string, string> = {
  WAIT_TIME: "Wait time",
  STAFF_ATTITUDE: "Staff attitude",
  SERVICE_QUALITY: "Service quality",
  CLEANLINESS: "Cleanliness",
  VALUE_FOR_MONEY: "Value for money",
  OTHER: "Other",
};

function last30DaysRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function AdminGuestVoicePage() {
  const t = useTranslations("admin.guestVoice");
  const tCommon = useTranslations("common");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const range = useMemo(() => last30DaysRange(), []);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => api.getBranches(),
  });

  useEffect(() => {
    if (branches.length > 0 && !initialized) {
      setSelectedBranches(branches.map((b) => b.id));
      setInitialized(true);
    }
  }, [branches, initialized]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["guest-voice", selectedBranches, range.from, range.to],
    queryFn: () =>
      api.getGuestVoiceSummary({
        from: range.from,
        to: range.to,
        branchIds:
          selectedBranches.length > 0 && selectedBranches.length < branches.length
            ? selectedBranches
            : undefined,
      }),
    enabled: initialized && selectedBranches.length > 0,
  });

  if (!initialized) {
    return <PageLoader label={tCommon("loading")} />;
  }

  const topTags = Object.entries(data?.improvementTagCounts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const categoryAverages = Object.entries(data?.categoryAverageRatings ?? {})
    .filter(([, avg]) => avg > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <DashboardHero title={t("heroTitle")} subtitle={t("heroDescription")} />

      <BranchMultiSelect
        branches={branches}
        selected={selectedBranches}
        onChange={setSelectedBranches}
      />

      {(isLoading || isFetching) && !data ? (
        <PageLoader label={tCommon("loading")} />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("avgRating")}
              value={data.totalReviews > 0 ? data.averageRating.toFixed(1) : "—"}
              icon={Star}
            />
            <StatCard label={t("totalReviews")} value={String(data.totalReviews)} icon={MessageSquareHeart} />
            <StatCard label={t("promoters")} value={String(data.promotersCount)} icon={Star} />
            <StatCard label={t("needsAttention")} value={String(data.openRecoveries.length)} icon={AlertTriangle} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("ratingMix")}</h2>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = data.ratingDistribution[stars] ?? 0;
                  const pct = data.totalReviews > 0 ? Math.round((count / data.totalReviews) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-sm">
                      <span className="w-8">{stars}★</span>
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-10 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("improvementAreas")}</h2>
              {topTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTagsYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {topTags.map(([tag, count]) => (
                    <li key={tag} className="flex items-center justify-between text-sm">
                      <span>{TAG_LABELS[tag] ?? tag}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {categoryAverages.length > 0 && (
            <section className="rounded-2xl border bg-card p-4 space-y-3">
              <h2 className="font-semibold">{t("categoryBreakdown")}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryAverages.map(([category, avg]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span>{CATEGORY_LABELS[category] ?? category}</span>
                    <span className="font-semibold">{avg.toFixed(1)}★</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.openRecoveries.length > 0 && (
            <section className="rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {t("openRecoveries")}
              </h2>
              <ul className="space-y-2">
                {data.openRecoveries.slice(0, 8).map((item) => (
                  <li key={item.recoveryId} className="text-sm flex items-center justify-between gap-3">
                    <span>
                      Visit {item.visitId.slice(0, 8)}… · Branch {item.branchId.slice(0, 8)}…
                    </span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">{item.overallRating}/5</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
