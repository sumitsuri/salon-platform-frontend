"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, ChevronDown, ChevronRight, Gift } from "lucide-react";
import { api, type IssueScratchCardResponse } from "@/lib/api";
import { btnSecondarySm, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { BillingScratchModal } from "./BillingScratchModal";
import { canResumeScratchSession, isScratchAttemptFinished } from "./scratch-billing-utils";

export type ScratchRedeemPayload = {
  cardId?: string;
  redemptionCode?: string;
};

export function WalkInScratchBilling({
  branchId,
  bookingId,
  disabled,
  redeemPending,
  scratchRewardApplied,
  redeemError,
  onRedeem,
}: {
  branchId: string;
  bookingId: string;
  disabled?: boolean;
  redeemPending?: boolean;
  scratchRewardApplied?: boolean;
  redeemError?: string;
  onRedeem: (payload: ScratchRedeemPayload) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["scratch-campaigns-active", branchId],
    queryFn: () => api.getActiveScratchCampaigns(branchId),
    enabled: !!branchId,
  });

  const { data: bookingScratch, isLoading: bookingScratchLoading } = useQuery({
    queryKey: ["scratch-card-booking", bookingId],
    queryFn: async () => {
      const card = await api.getScratchCardForBooking(bookingId);
      return card ?? null;
    },
    enabled: !!bookingId,
  });

  const attemptFinished = isScratchAttemptFinished(bookingScratch?.status);
  const canStartOrResume =
    !attemptFinished && (canResumeScratchSession(bookingScratch?.status) || bookingScratch === null);
  const showApplied = scratchRewardApplied || bookingScratch?.status === "REDEEMED";

  const statusLine = showApplied
    ? t("scratchCollapsedApplied")
    : attemptFinished
      ? t("scratchCollapsedUsed")
      : bookingScratch?.status === "ISSUED" || bookingScratch?.status === "UNLOCKED"
        ? t("scratchCollapsedResume")
        : t("scratchCollapsedReady");

  useEffect(() => {
    setModalOpen(false);
    setMoreOpen(false);
  }, [bookingId]);

  const onScratchSession = useCallback(
    (card: IssueScratchCardResponse) => {
      queryClient.setQueryData(["scratch-card-booking", bookingId], card);
    },
    [queryClient, bookingId]
  );

  const openScratch = () => {
    if (disabled || !bookingId || bookingScratchLoading) return;
    setModalOpen(true);
  };

  if (!branchId || campaigns.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 dark:border-violet-900/40 dark:bg-violet-950/20 overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2.5 min-h-11 touch-manipulation text-left"
          disabled={disabled || !bookingId || bookingScratchLoading}
          onClick={openScratch}
        >
          <Gift className="h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{t("scratchIssueTitle")}</p>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">{statusLine}</p>
          </div>
          {showApplied ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          )}
        </button>

        {!showApplied && !attemptFinished && canStartOrResume ? (
          <div className="border-t border-violet-200/60 dark:border-violet-900/30">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-violet-800 dark:text-violet-200"
              onClick={() => setMoreOpen((v) => !v)}
            >
              {t("scratchMoreOptions")}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen ? (
              <div className="px-3 pb-3">
                <WalkInScratchRedeem
                  bookingId={bookingId}
                  disabled={disabled}
                  pending={redeemPending}
                  compact
                  onRedeem={(code) => onRedeem({ redemptionCode: code })}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <BillingScratchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        branchId={branchId}
        bookingId={bookingId}
        disabled={disabled}
        scratchRewardApplied={showApplied}
        bookingScratch={bookingScratch}
        bookingScratchLoading={bookingScratchLoading}
        redeemPending={redeemPending}
        redeemError={redeemError}
        onRedeem={onRedeem}
        onScratchSession={onScratchSession}
      />
    </>
  );
}

export function WalkInScratchRedeem({
  bookingId,
  disabled,
  pending,
  compact,
  onRedeem,
}: {
  bookingId: string;
  disabled?: boolean;
  pending?: boolean;
  compact?: boolean;
  onRedeem: (code: string) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const [code, setCode] = useState("");

  return (
    <label className="block min-w-0 space-y-1">
      {!compact ? (
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{t("scratchRedeemLabel")}</span>
      ) : null}
      <div className="flex gap-2">
        <input
          className={cn(inputClass, "min-h-11 font-mono uppercase tracking-wider flex-1")}
          placeholder={t("scratchRedeemPlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          disabled={disabled || pending || !bookingId}
          autoComplete="off"
        />
        <button
          type="button"
          className={btnSecondarySm}
          disabled={disabled || pending || !bookingId || code.trim().length < 4}
          onClick={() => onRedeem(code.trim())}
        >
          {pending ? "…" : t("scratchRedeemApply")}
        </button>
      </div>
      {!compact ? (
        <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{t("scratchRedeemHint")}</p>
      ) : null}
    </label>
  );
}
