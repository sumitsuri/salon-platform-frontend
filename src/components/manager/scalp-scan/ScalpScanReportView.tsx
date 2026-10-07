"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Droplets, Sparkles, Stethoscope, Sun } from "lucide-react";
import { fetchScalpScanCaptureBlob, type ScalpScanSession } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ScanAnalysisMetaBanner } from "@/components/manager/scan/ScanAnalysisMetaBanner";

function MetricBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className={cn("h-full rounded-full transition-all", accent)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function CaptureThumb({ captureId }: { captureId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    fetchScalpScanCaptureBlob(captureId)
      .then((url) => {
        revoked = url;
        setSrc(url);
      })
      .catch(() => setSrc(null));
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [captureId]);
  if (!src) {
    return <div className="aspect-square rounded-lg bg-[var(--surface-muted)] animate-pulse" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="aspect-square w-full rounded-lg object-cover ring-1 ring-[var(--border)]" />
  );
}

export function ScalpScanReportView({ session }: { session: ScalpScanSession }) {
  const t = useTranslations("manager.scalpScan");
  const report = session.report;
  const metrics = report?.metrics;
  const concerns = report?.concerns ?? [];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-[var(--brand)]/20 bg-gradient-to-br from-[var(--brand-light)]/40 to-[var(--surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-text)]">{t("report.healthScore")}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-[var(--text-primary)]">
              {metrics?.scalpHealthScore ?? session.scalpHealthScore ?? "—"}
              <span className="text-lg font-medium text-[var(--text-secondary)]">/100</span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {session.customerName}
              {session.primaryConcernCode ? ` · ${t(`concerns.${session.primaryConcernCode}`, { defaultValue: session.primaryConcernCode })}` : ""}
            </p>
          </div>
          <Sparkles className="h-8 w-8 shrink-0 text-[var(--brand-text)] opacity-80" aria-hidden />
        </div>
      </Card>

      <ScanAnalysisMetaBanner meta={report?.analysisMeta} />

      {metrics && report?.analysisMeta?.confidence !== "LOW" && (
        <Card className="p-4 space-y-3">
          <h3 className="ui-card-title">{t("report.metricsTitle")}</h3>
          <MetricBar label={t("report.oiliness")} value={metrics.oilinessIndex} accent="bg-amber-500" />
          <MetricBar label={t("report.hydration")} value={metrics.hydrationIndex} accent="bg-sky-500" />
          <MetricBar label={t("report.density")} value={metrics.densityIndex} accent="bg-violet-500" />
          <MetricBar label={t("report.irritation")} value={metrics.irritationIndex} accent="bg-rose-500" />
        </Card>
      )}

      {concerns.length > 0 && (
        <Card className="p-4">
          <h3 className="ui-card-title mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-[var(--brand-text)]" aria-hidden />
            {t("report.concernsTitle")}
          </h3>
          <ul className="space-y-2">
            {concerns.map((c) => (
              <li
                key={c.code}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      c.severity === "HIGH" && "bg-rose-100 text-rose-800",
                      c.severity === "MEDIUM" && "bg-amber-100 text-amber-900",
                      c.severity === "LOW" && "bg-emerald-100 text-emerald-900",
                    )}
                  >
                    {c.severity}
                  </span>
                </div>
                {c.insight && <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{c.insight}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(report?.inSalonServices?.length ?? 0) > 0 && (
        <Card className="p-4">
          <h3 className="ui-card-title mb-3 flex items-center gap-2">
            <Sun className="h-4 w-4 text-[var(--brand-text)]" aria-hidden />
            {t("report.inSalonTitle")}
          </h3>
          <ul className="space-y-2">
            {report!.inSalonServices!.map((svc) => (
              <li key={svc.name} className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{svc.name}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{svc.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(report?.routineSteps?.length ?? 0) > 0 && (
        <Card className="p-4">
          <h3 className="ui-card-title mb-3 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-[var(--brand-text)]" aria-hidden />
            {t("report.routineTitle")}
          </h3>
          <ol className="space-y-3">
            {report!.routineSteps!.map((step) => (
              <li key={step.step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-xs font-bold text-[var(--brand-text)]">
                  {step.step}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{step.phase}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{step.title}</p>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {session.captures && session.captures.length > 0 && (
        <Card className="p-4">
          <h3 className="ui-card-title mb-3">{t("report.capturesTitle")}</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {session.captures.map((c) => (
              <div key={c.id} className="min-w-0">
                <CaptureThumb captureId={c.id} />
                <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">
                  {t(`zones.${c.zone}`)} · {t(`lights.${c.lightMode}`)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {report?.disclaimer && (
        <p className="flex gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {report.disclaimer}
        </p>
      )}
    </div>
  );
}
