"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  api,
  type Customer,
  type ScalpCaptureZone,
  type ScalpLightMode,
  type ScalpScanSession,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { ScalpScanCapturePanel } from "@/components/manager/scalp-scan/ScalpScanCapturePanel";
import {
  MIN_CAPTURES,
  SCALP_CAPTURE_ZONES,
  SCALP_LIGHT_MODES,
  STAFF_CONCERN_OPTIONS,
} from "@/app/manager/scalp-scan/scalp-scan-constants";
import { AntrahqLoading } from "@/components/brand/AntrahqLoading";
import { AlertBanner, btnPrimary, btnSecondary, inputClass, PageHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

type Step = "customer" | "capture" | "confirm";

function NewScalpScanContent() {
  const t = useTranslations("manager.scalpScan");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const branchId = useAuthStore((s) => s.user?.branchId) || "";

  const existingSessionId = searchParams.get("sessionId");
  const prefillCustomerId = searchParams.get("customerId");

  const [step, setStep] = useState<Step>(existingSessionId ? "capture" : "customer");
  const [session, setSession] = useState<ScalpScanSession | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [zone, setZone] = useState<ScalpCaptureZone>("CROWN");
  const [lightMode, setLightMode] = useState<ScalpLightMode>("WHITE");
  const [confirmedConcerns, setConfirmedConcerns] = useState<Set<string>>(new Set());
  const [staffNotes, setStaffNotes] = useState("");
  const [error, setError] = useState("");

  const { data: resumedSession } = useQuery({
    queryKey: ["scalp-scan-resume", existingSessionId],
    queryFn: () => api.getScalpScan(existingSessionId!),
    enabled: !!existingSessionId && !session,
  });

  useEffect(() => {
    if (resumedSession && !session) {
      setSession(resumedSession);
      setStep("capture");
    }
  }, [resumedSession, session]);

  const { data: prefilledCustomer } = useQuery({
    queryKey: ["scalp-scan-prefill-customer", prefillCustomerId],
    queryFn: () => api.getCustomer(prefillCustomerId!),
    enabled: !!prefillCustomerId && !selectedCustomer && !existingSessionId,
  });

  useEffect(() => {
    if (prefilledCustomer && !selectedCustomer) {
      setSelectedCustomer(prefilledCustomer);
    }
  }, [prefilledCustomer, selectedCustomer]);

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["customer-search-scalp", customerQuery, branchId],
    queryFn: () => api.searchCustomers(customerQuery.trim(), branchId),
    enabled: step === "customer" && customerQuery.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: (customerId: string) => api.createScalpScan(customerId),
    onSuccess: (s) => {
      setSession(s);
      setStep("capture");
      void queryClient.invalidateQueries({ queryKey: ["scalp-scans", branchId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api.analyzeScalpScan(session!.id, {
        staffConfirmedConcerns: [...confirmedConcerns].join(","),
        staffNotes: staffNotes.trim() || undefined,
      }),
    onSuccess: (s) => {
      void queryClient.invalidateQueries({ queryKey: ["scalp-scans", branchId] });
      router.push(`/manager/scalp-scan/report?id=${s.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  const captureCount = session?.captureCount ?? session?.captures?.length ?? 0;

  const refreshSession = useCallback(async () => {
    if (!session?.id) return;
    const s = await api.getScalpScan(session.id);
    setSession(s);
  }, [session?.id]);

  const onCaptured = useCallback(
    async (blob: Blob) => {
      if (!session?.id) return;
      await api.addScalpScanCapture(session.id, { zone, lightMode, photo: blob });
      await refreshSession();
    },
    [session?.id, zone, lightMode, refreshSession],
  );

  const canAnalyze = captureCount >= MIN_CAPTURES;

  const stepLabel = useMemo(() => {
    if (step === "customer") return t("steps.customer");
    if (step === "capture") return t("steps.capture");
    return t("steps.confirm");
  }, [step, t]);

  return (
    <div className="dashboard-page-flow max-w-2xl">
      <PageHeader title={t("newTitle")} subtitle={stepLabel} />

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {step === "customer" && (
        <div className="space-y-4">
          <label className="block">
            <span className="section-label mb-1.5 block">{t("pickCustomer")}</span>
            <input
              className={inputClass}
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              autoComplete="off"
            />
          </label>
          {searching && <p className="text-xs text-[var(--text-secondary)]">{tCommon("loading")}</p>}
          <ul className="space-y-1">
            {searchResults.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    selectedCustomer?.id === c.id
                      ? "border-[var(--brand)] bg-[var(--brand-light)]/30"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]/30",
                  )}
                  onClick={() => setSelectedCustomer(c)}
                >
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.phone || c.visitPassId}</p>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={btnPrimary}
            disabled={!selectedCustomer || createMutation.isPending}
            onClick={() => selectedCustomer && createMutation.mutate(selectedCustomer.id)}
          >
            {t("startSession")}
          </button>
        </div>
      )}

      {step === "capture" && session && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("captureProgress", { count: captureCount, min: MIN_CAPTURES })}
          </p>

          <div className="flex flex-wrap gap-2">
            {SCALP_LIGHT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                  lightMode === mode
                    ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]",
                )}
                onClick={() => setLightMode(mode)}
              >
                {t(`lights.${mode}`)}
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">{t(`lightHints.${lightMode}`)}</p>

          <div className="flex flex-wrap gap-2">
            {SCALP_CAPTURE_ZONES.map((z) => (
              <button
                key={z}
                type="button"
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium border transition",
                  zone === z
                    ? "border-[var(--brand)] bg-[var(--surface)]"
                    : "border-[var(--border)] text-[var(--text-secondary)]",
                )}
                onClick={() => setZone(z)}
              >
                {t(`zones.${z}`)}
              </button>
            ))}
          </div>

          <ScalpScanCapturePanel zone={zone} lightMode={lightMode} onCaptured={onCaptured} />

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={!canAnalyze}
              onClick={() => setStep("confirm")}
            >
              {t("continueToConfirm")}
            </button>
            <Link href="/manager/scalp-scan" className={btnSecondary}>
              {t("saveForLater")}
            </Link>
          </div>
        </div>
      )}

      {step === "confirm" && session && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{t("confirmHint")}</p>
          <div className="flex flex-wrap gap-2">
            {STAFF_CONCERN_OPTIONS.map((code) => {
              const on = confirmedConcerns.has(code);
              return (
                <button
                  key={code}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                    on
                      ? "border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand-text)]"
                      : "border-[var(--border)] text-[var(--text-secondary)]",
                  )}
                  onClick={() => {
                    setConfirmedConcerns((prev) => {
                      const next = new Set(prev);
                      if (next.has(code)) next.delete(code);
                      else next.add(code);
                      return next;
                    });
                  }}
                >
                  {t(`concerns.${code}`)}
                </button>
              );
            })}
          </div>
          <textarea
            className={cn(inputClass, "min-h-[5rem]")}
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder={t("staffNotesPlaceholder")}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={analyzeMutation.isPending}
              onClick={() => analyzeMutation.mutate()}
            >
              {analyzeMutation.isPending ? t("analyzing") : t("runAnalysis")}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setStep("capture")}>
              {t("backToCapture")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewScalpScanPage() {
  return (
    <Suspense fallback={<AntrahqLoading label="Loading..." />}>
      <NewScalpScanContent />
    </Suspense>
  );
}
