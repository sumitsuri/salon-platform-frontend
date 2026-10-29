"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { BranchDemand } from "@/lib/api";
import { SegmentedControl } from "@/components/ui";
import { ColumnChart, type ColumnItem } from "./ColumnChart";
import { DonutChart } from "./DonutChart";
import { DAY_SHORT, dayparts, daySeries, hourShort, openWeekdays, rangeLong, whole, type HourPoint } from "./busy-model";

type View = "bars" | "pie" | "table";

/** Contiguous hours sharing a verdict, as "5-8 pm". */
function ranges(points: HourPoint[], state: "STRETCHED" | "IDLE"): string[] {
  const out: string[] = [];
  let start: number | null = null;
  for (let i = 0; i <= points.length; i++) {
    const hit = points[i] && points[i].inHours && points[i].state === state;
    if (hit && start === null) start = points[i].hour;
    if (!hit && start !== null) {
      out.push(rangeLong(start, points[i - 1].hour + 1));
      start = null;
    }
  }
  return out;
}

/**
 * The first-level read of a branch: how many customers arrive in each hour (bars), or split by part of the day
 * (pie, next to where the team's hours go), with the team's comfortable capacity as a line and a staffing chip per hour.
 */
export function CustomersByHour({ branch }: { branch: BranchDemand }) {
  const t = useTranslations("admin.busyHours");
  const open = useMemo(() => openWeekdays(branch), [branch]);
  const [view, setView] = useState<View>("bars");
  const [sel, setSel] = useState("all");

  const days = useMemo(() => {
    if (sel === "weekdays") return open.filter((d) => d <= 5);
    if (sel === "weekends") return open.filter((d) => d >= 6);
    if (/^[1-7]$/.test(sel)) return open.filter((d) => d === Number(sel));
    return open;
  }, [sel, open]);
  const allHours = useMemo(() => daySeries(branch, days.length > 0 ? days : open), [branch, days, open]);
  // First-level view = opening hours only; the few visits logged outside them are noted underneath.
  const series = useMemo(() => allHours.filter((p) => p.inHours), [allHours]);
  const outsideCustomers = allHours.filter((p) => !p.inHours).reduce((a, p) => a + p.visitsTotal, 0);

  const hasStaff = branch.staffDataAvailable && !!branch.customersPerStaffHour;
  const perStaff = branch.customersPerStaffHour ?? 0;
  const stateText = (s: HourPoint["state"]) =>
    s === "STRETCHED" ? t("stateStretched") : s === "IDLE" ? t("stateSpare") : s === "OK" ? t("stateRight") : "";

  const items: ColumnItem[] = useMemo(
    () =>
      series.map((p) => ({
        key: String(p.hour),
        label: hourShort(p.hour),
        value: p.visitsTotal,
        marker: hasStaff ? p.staff * perStaff * p.occurrences : null,
        state: hasStaff ? p.state : null,
        faded: !p.inHours,
        tip: {
          title: rangeLong(p.hour, p.hour + 1),
          lines: [
            t("tipCustomers", { n: whole(p.visitsTotal), perDay: whole(p.visits) }),
            ...(hasStaff ? [`${whole(p.staff)} ${t("staffOnFloor")}${p.busy != null ? ` · ${t("busyFor", { pct: p.busy })}` : ""}`, stateText(p.state)].filter(Boolean) : []),
          ],
        },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, hasStaff, perStaff]
  );

  const parts = useMemo(() => dayparts(series, { morning: t("dpMorning"), afternoon: t("dpAfternoon"), evening: t("dpEvening") }), [series, t]);
  const ramp = ["var(--bv-seq-2)", "var(--bv-seq-4)", "var(--bv-seq-6)"];
  const totalCustomers = series.reduce((a, p) => a + p.visitsTotal, 0);
  const totalStaffHours = series.reduce((a, p) => a + p.staffHours, 0);

  const peak = series.length ? series.reduce((b, p) => (p.visitsTotal > b.visitsTotal ? p : b), series[0]) : null;
  const stretched = hasStaff ? ranges(series, "STRETCHED") : [];
  const spare = hasStaff ? ranges(series, "IDLE") : [];

  const viewOptions = [
    { id: "bars" as const, label: t("viewBars") },
    { id: "pie" as const, label: t("viewPie") },
    { id: "table" as const, label: t("viewTable") },
  ];
  const dayOptions = [
    { id: "all", label: t("daysAll") },
    ...(open.some((d) => d <= 5) && open.some((d) => d >= 6)
      ? [{ id: "weekdays", label: t("daysWeekdays") }, { id: "weekends", label: t("daysWeekends") }]
      : []),
    ...open.map((d) => ({ id: String(d), label: DAY_SHORT[d - 1] as string })),
  ];

  return (
    <div className="space-y-3 busy-viz" data-testid="customers-by-hour">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 max-w-full overflow-x-auto">
          <SegmentedControl value={sel} onChange={setSel} options={dayOptions} />
        </div>
        <div className="w-full sm:w-56">
          <SegmentedControl value={view} onChange={setView} options={viewOptions} />
        </div>
      </div>

      {series.length === 0 || !peak ? (
        <p className="text-sm text-[var(--text-secondary)]">{t("noData")}</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-[var(--text-primary)]" data-testid="customers-by-hour-summary">
            <strong>{rangeLong(peak.hour, peak.hour + 1)}</strong> {t("busiestHourSentence", { n: whole(peak.visitsTotal) })}
            {stretched.length > 0 && <> {t("shortOnPeople")} <strong>{stretched.join(", ")}</strong>.</>}
            {spare.length > 0 && <> {t("sparePeople")} <strong>{spare.join(", ")}</strong>.</>}
          </p>

          {view === "bars" && (
            <ColumnChart
              items={items}
              label={t("legendCustomersCount")}
              ribbon={hasStaff}
              markerLabel={hasStaff ? t("legendCapacity") : undefined}
              statusLabels={{ stretched: t("glyphStretched"), right: t("glyphRight"), spare: t("glyphSpare") }}
            />
          )}

          {view === "pie" && (
            <div className="grid gap-5 sm:grid-cols-2" data-testid="pie-view">
              <DonutChart
                title={t("pieCustomers")}
                centre={whole(totalCustomers)}
                unit={t("pieCustomersUnit")}
                slices={parts.map((p, i) => ({ key: p.key, label: `${p.label} · ${rangeLong(p.from, p.to)}`, value: p.customers, colour: ramp[i] ?? ramp[2] }))}
              />
              {hasStaff && (
                <DonutChart
                  title={t("pieTeam")}
                  centre={whole(totalStaffHours)}
                  unit={t("pieTeamUnit")}
                  slices={parts.map((p, i) => ({ key: p.key, label: `${p.label} · ${rangeLong(p.from, p.to)}`, value: p.staffHours, colour: ramp[i] ?? ramp[2] }))}
                />
              )}
              {!hasStaff && <p className="text-xs text-[var(--text-secondary)] self-center">{t("noAttendanceNote")}</p>}
            </div>
          )}

          {view === "table" && (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <caption className="sr-only">{t("dayTableCaption")}</caption>
                <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">{t("hour")}</th>
                    <th className="px-2 py-1.5 text-right font-semibold">{t("colCustomers")}</th>
                    <th className="px-2 py-1.5 text-right font-semibold">{t("colPerDay")}</th>
                    {hasStaff && <th className="px-2 py-1.5 text-right font-semibold">{t("colStaff")}</th>}
                    {hasStaff && <th className="px-2 py-1.5 text-right font-semibold">{t("colBusy")}</th>}
                    {hasStaff && <th className="px-2 py-1.5 text-left font-semibold">{t("colStatus")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {series.map((p) => (
                    <tr key={p.hour} className="border-t border-[var(--border)]">
                      <th scope="row" className="px-2 py-1 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap">{rangeLong(p.hour, p.hour + 1)}</th>
                      <td className="px-2 py-1 text-right tabular-nums font-semibold">{whole(p.visitsTotal)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{whole(p.visits)}</td>
                      {hasStaff && <td className="px-2 py-1 text-right tabular-nums">{whole(p.staff)}</td>}
                      {hasStaff && <td className="px-2 py-1 text-right tabular-nums">{p.busy != null ? `${p.busy}%` : "—"}</td>}
                      {hasStaff && <td className="px-2 py-1">{stateText(p.state)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!hasStaff && view === "bars" && <p className="text-xs text-[var(--text-secondary)]">{t("noAttendanceNote")}</p>}
          {outsideCustomers >= 1 && <p className="text-[11px] text-[var(--text-secondary)]">{t("outsideNote", { n: whole(outsideCustomers) })}</p>}
        </>
      )}
    </div>
  );
}
