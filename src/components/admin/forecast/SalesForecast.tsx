"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CalendarDays, LineChart as LineChartIcon, Sparkles } from "lucide-react";
import { api, type ForecastConfidence, type ForecastScope, type SalesForecast as SalesForecastData } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { AlertBanner, EmptyState, PageLoader, SegmentedControl } from "@/components/ui";
import { DashboardOverviewShell } from "@/components/enterprise-ui";
import { setPrefill } from "@/components/admin/assistant/conversations";
import { ForecastChart } from "./ForecastChart";
import { StockReadiness } from "./StockReadiness";
import { chartPoints, changeFrom, percent, shortDate, signedPercent, sumLast, weekday, weeklyTotals } from "./forecast-model";

const HORIZONS = ["7", "30", "60", "90"] as const;
type Horizon = (typeof HORIZONS)[number];

const CONFIDENCE_STYLE: Record<ForecastConfidence, string> = {
  HIGH: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  MEDIUM: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  LOW: "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  INSUFFICIENT: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
};

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5", className)}>
      {title && <h2 className="mb-3 text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>}
      {children}
    </section>
  );
}

function ConfidenceChip({ value }: { value: ForecastConfidence }) {
  const t = useTranslations("admin.forecast");
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", CONFIDENCE_STYLE[value])}>{t(`confidence.${value}`)}</span>;
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <p className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
      {sub && (
        <p className={cn("mt-1 text-[12px]", tone === "up" ? "text-emerald-700 dark:text-emerald-400" : tone === "down" ? "text-red-700 dark:text-red-400" : "text-[var(--text-secondary)]")}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function SalesForecast() {
  const t = useTranslations("admin.forecast");
  const [horizon, setHorizon] = useState<Horizon>("30");
  const [scopeId, setScopeId] = useState<string>("brand");
  const [tableView, setTableView] = useState<"weeks" | "days">("weeks");
  const days = Number(horizon);
  const router = useRouter();
  // Same cache entry as the admin shell, so this costs no extra request. Only brands with Ask Antra switched on see the button.
  const tenant = useQuery({ queryKey: ["tenant"], queryFn: () => api.getTenant(), staleTime: 300_000 });
  const canAsk = tenant.data?.assistantEnabled === true;

  const query = useQuery({
    queryKey: ["sales-forecast", days],
    queryFn: () => api.getSalesForecast(days),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
  });
  const data = query.data;

  // A branch manager gets one scope that is both "the brand" and their branch; show it once, under the branch's name.
  const singleBranch = !!data && data.branches.length === 1 && data.brand?.id === data.branches[0].id;
  const scopes = useMemo<ForecastScope[]>(
    () => (data ? (singleBranch ? data.branches : [...(data.brand ? [data.brand] : []), ...data.branches]) : []),
    [data, singleBranch],
  );
  const scope = useMemo(() => {
    if (!data) return null;
    if (singleBranch) return data.branches[0];
    if (scopeId === "brand" && data.brand) return data.brand;
    return data.branches.find((b) => b.id === scopeId) ?? data.brand ?? data.branches[0] ?? null;
  }, [data, scopeId, singleBranch]);

  if (query.isLoading && !data) return <PageLoader />;
  if (query.isError && !data) return <AlertBanner variant="error">{t("loadFailed")}</AlertBanner>;
  if (!data || !scope) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <EmptyState icon={LineChartIcon} title={t("emptyTitle")} description={t("emptyBody")} />
      </div>
    );
  }

  const isBrand = !singleBranch && data.brand !== null && scope.id === data.brand.id;
  return (
    <DashboardOverviewShell>
      <div className={cn("space-y-4 transition-opacity", query.isFetching && "opacity-60")} data-testid="sales-forecast">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-auto sm:min-w-[20rem]">
            <SegmentedControl value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ id: h, label: t("horizon", { days: h }) }))} />
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{t("trainedOn", { date: shortDate(data.trainedThrough) })}</p>
          {canAsk && (
            <button
              type="button"
              onClick={() => {
                // Opens the chat with the question ready in the box; the owner chooses whether to send it.
                setPrefill(isBrand ? t("askAntraBrand", { days }) : t("askAntraBranch", { branch: scope.name, days }));
                router.push("/admin/assistant");
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--brand-on-brand)] transition-opacity hover:opacity-90 sm:ml-auto"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {t("askAntra")}
            </button>
          )}
        </div>

        {scopes.length > 1 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label={t("scope")}>
            {scopes.map((s) => {
              const brandChip = !singleBranch && data.brand !== null && s.id === data.brand.id;
              const active = s.id === scope.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScopeId(brandChip ? "brand" : s.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                  )}
                >
                  {brandChip ? t("allBranches") : s.name}
                </button>
              );
            })}
          </div>
        )}

        {data.stale && <AlertBanner variant="warning">{t("stale", { date: shortDate(data.trainedThrough) })}</AlertBanner>}

        {!scope.forecastable || !scope.totals ? (
          <AlertBanner variant="info">{scope.note ?? t("notEnough")}</AlertBanner>
        ) : (
          <ScopeView data={data} scope={scope} isBrand={isBrand} days={days} tableView={tableView} setTableView={setTableView} onPick={setScopeId} />
        )}
      </div>
    </DashboardOverviewShell>
  );
}

function ScopeView({
  data,
  scope,
  isBrand,
  days,
  tableView,
  setTableView,
  onPick,
}: {
  data: SalesForecastData;
  scope: ForecastScope;
  isBrand: boolean;
  days: number;
  tableView: "weeks" | "days";
  setTableView: (v: "weeks" | "days") => void;
  onPick: (id: string) => void;
}) {
  const t = useTranslations("admin.forecast");
  const totals = scope.totals!;
  const q = scope.quality;
  const last30 = sumLast(scope.history, 30);
  const vsLast30 = changeFrom(totals.next30, last30);
  const pacing = scope.pacing;
  const monthVsTarget = pacing?.expectedVsTarget ?? null;
  const points = useMemo(() => chartPoints(scope, days <= 30 ? 30 : 45), [scope, days]);
  const weeks = useMemo(() => weeklyTotals(scope.days), [scope.days]);
  const tested = q.backtests > 0 && q.monthError >= 0;

  return (
    <>
      {scope.note && <AlertBanner variant="info">{scope.note}</AlertBanner>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("next7")}
          value={formatCurrency(totals.next7)}
          sub={t("likelyRange", { low: formatCurrency(totals.next7Low), high: formatCurrency(totals.next7High) })}
        />
        <Stat
          label={t("next30")}
          value={formatCurrency(totals.next30)}
          tone={vsLast30 === null ? undefined : vsLast30 >= 0 ? "up" : "down"}
          sub={vsLast30 === null ? t("likelyRange", { low: formatCurrency(totals.next30Low), high: formatCurrency(totals.next30High) }) : t("vsLast30", { change: signedPercent(vsLast30) })}
        />
        <Stat
          label={t("thisMonth")}
          value={pacing ? formatCurrency(pacing.expectedMonthEnd) : "—"}
          tone={monthVsTarget === null ? undefined : monthVsTarget >= 0 ? "up" : "down"}
          sub={
            pacing
              ? monthVsTarget === null
                ? t("soFar", { amount: formatCurrency(pacing.monthToDate) })
                : t(monthVsTarget >= 0 ? "aboveTarget" : "belowTarget", { change: percent(Math.abs(monthVsTarget)), target: formatCurrency(pacing.target ?? 0) })
              : undefined
          }
        />
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <p className="text-[12px] font-medium text-[var(--text-secondary)]">{t("confidenceLabel")}</p>
          <p className="mt-1.5">
            <ConfidenceChip value={q.confidence} />
          </p>
          <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
            {tested ? t("typicalError", { error: percent(q.monthError), tests: q.backtests }) : t("notTested")}
          </p>
        </div>
      </div>

      <Card title={t("chartTitle", { days })}>
        <ForecastChart points={points} label={t("chartLabel", { name: isBrand ? t("allBranches") : scope.name })} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title={tableView === "weeks" ? t("weekByWeek") : t("dayByDay")} className="xl:col-span-3">
          <div className="mb-3 w-full sm:w-64">
            <SegmentedControl
              value={tableView}
              onChange={setTableView}
              options={[
                { id: "weeks", label: t("weeks") },
                { id: "days", label: t("daysView") },
              ]}
            />
          </div>
          <div className="max-h-[26rem] overflow-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[26rem] text-left text-[13px]">
              <thead className="sticky top-0 bg-[var(--surface-muted)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("period")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("expected")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("range")}</th>
                  <th className="px-3 py-2 font-semibold">{t("occasion")}</th>
                </tr>
              </thead>
              <tbody>
                {(tableView === "weeks"
                  ? weeks.map((w) => ({ key: w.start, label: w.start === w.end ? shortDate(w.start) : `${shortDate(w.start)} – ${shortDate(w.end)}`, expected: w.expected, low: w.low, high: w.high, events: w.events }))
                  : scope.days.map((d) => ({ key: d.date, label: `${weekday(d.date)}, ${shortDate(d.date)}`, expected: d.expected, low: d.low, high: d.high, events: d.events }))
                ).map((r) => (
                  <tr key={r.key} className="border-t border-[var(--border)]">
                    <td className="whitespace-nowrap px-3 py-2 text-[var(--text-primary)]">{r.label}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-[var(--text-primary)]">{r.expected > 0 ? formatCurrency(r.expected) : t("closed")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--text-tertiary)]">
                      {r.expected > 0 ? `${formatCurrency(r.low)} – ${formatCurrency(r.high)}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-[var(--brand-text)]">{r.events.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={t("festivalsTitle")} className="xl:col-span-2">
          {data.festivals.length === 0 ? (
            <p className="text-[13px] text-[var(--text-secondary)]">{t("noFestivals")}</p>
          ) : (
            <ul className="space-y-3">
              {data.festivals.map((f) => (
                <li key={`${f.id}-${f.date}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-text)]" aria-hidden>
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[var(--text-primary)]">
                      {f.name} <span className="font-normal text-[var(--text-secondary)]">· {shortDate(f.date)}</span>
                    </p>
                    <p className={cn("text-[13px] tabular-nums", f.impact >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                      {f.impact >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(f.impact))} ({signedPercent(f.percent)})
                    </p>
                    <p className="text-[12px] text-[var(--text-tertiary)]">{f.learned ? t("learnedFromYou", { times: f.timesSeen }) : t("assumption")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">{t("festivalsNote", { weight: percent(data.festivalAssumptionWeight) })}</p>
        </Card>
      </div>

      {isBrand && data.branches.length > 1 && (
        <Card title={t("byBranch")}>
          <div className="overflow-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[40rem] text-left text-[13px]">
              <thead className="bg-[var(--surface-muted)] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("branch")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("next7")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("next30")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("vsLast30Short")}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t("monthVsTarget")}</th>
                  <th className="px-3 py-2 font-semibold">{t("confidenceLabel")}</th>
                </tr>
              </thead>
              <tbody>
                {data.branches.map((b) => {
                  const c = b.totals ? changeFrom(b.totals.next30, sumLast(b.history, 30)) : null;
                  const mv = b.pacing?.expectedVsTarget ?? null;
                  return (
                    <tr key={b.id} className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-muted)]" onClick={() => onPick(b.id)}>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{b.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.totals ? formatCurrency(b.totals.next7) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.totals ? formatCurrency(b.totals.next30) : "—"}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", c === null ? "" : c >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                        {c === null ? "—" : signedPercent(c)}
                      </td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", mv === null ? "" : mv >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400")}>
                        {mv === null ? "—" : signedPercent(mv)}
                      </td>
                      <td className="px-3 py-2">
                        <ConfidenceChip value={b.quality.confidence} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <StockReadiness branchId={isBrand ? null : scope.id} />

      <Card title={t("howTitle")}>
        <ul className="space-y-1.5 text-[13px] leading-6 text-[var(--text-secondary)]">
          <li>{t("howTrained", { days: q.trainingDays, date: shortDate(data.trainedThrough) })}</li>
          <li>{t(`model.${q.model}`)}</li>
          {tested && <li>{t("howAccuracy", { month: percent(q.monthError), week: percent(q.weekError), day: percent(q.dailyError), tests: q.backtests })}</li>}
          <li>{t("howFestivals", { weight: percent(data.festivalAssumptionWeight), until: shortDate(data.calendarEnds) })}</li>
          <li>{t("howRefresh")}</li>
        </ul>
      </Card>
    </>
  );
}
