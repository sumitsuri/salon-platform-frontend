"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { api, type IssueScratchCardResponse, type PublicScratchCard } from "@/lib/api";
import { ScratchCardFlow } from "@/components/scratch/ScratchCardFlow";
import { btnPrimary, btnSecondary } from "@/components/ui";
import { cn } from "@/lib/utils";
import { isScratchAttemptFinished } from "./scratch-billing-utils";

type RedeemPhase = "idle" | "applying" | "applied" | "error";

export function BillingScratchModal({
  open,
  onClose,
  branchId,
  bookingId,
  disabled,
  redeemPending,
  scratchRewardApplied,
  bookingScratch,
  bookingScratchLoading,
  redeemError,
  onRedeem,
  onScratchSession,
}: {
  open: boolean;
  onClose: () => void;
  branchId: string;
  bookingId: string;
  disabled?: boolean;
  redeemPending?: boolean;
  scratchRewardApplied?: boolean;
  bookingScratch?: IssueScratchCardResponse | null;
  bookingScratchLoading?: boolean;
  redeemError?: string;
  onRedeem: (payload: { cardId: string; redemptionCode?: string }) => void;
  onScratchSession: (card: IssueScratchCardResponse) => void;
}) {
  const t = useTranslations("manager.walkIn");
  const [token, setToken] = useState("");
  const [cardId, setCardId] = useState("");
  const [redeemPhase, setRedeemPhase] = useState<RedeemPhase>("idle");
  const [claimablePrize, setClaimablePrize] = useState<PublicScratchCard | null>(null);
  const [tryAgainShown, setTryAgainShown] = useState(false);
  const redeemStartedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const issueRequestedRef = useRef(false);
  const syncedCardIdRef = useRef<string | null>(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["scratch-campaigns-active", branchId],
    queryFn: () => api.getActiveScratchCampaigns(branchId),
    enabled: !!branchId && open,
  });

  const issue = useMutation({
    mutationFn: () => {
      const campaign = campaigns[0];
      if (!campaign) throw new Error(t("scratchNoCampaign"));
      return api.issueScratchCard({
        campaignId: campaign.id,
        branchId,
        bookingId: bookingId || undefined,
      });
    },
    onSuccess: (data) => {
      syncedCardIdRef.current = data.cardId;
      setToken(data.publicToken);
      setCardId(data.cardId);
      onScratchSession(data);
      setRedeemPhase("idle");
      redeemStartedRef.current = false;
    },
  });

  useEffect(() => {
    syncedCardIdRef.current = null;
    issueRequestedRef.current = false;
    redeemStartedRef.current = false;
    setToken("");
    setCardId("");
    setRedeemPhase("idle");
    setClaimablePrize(null);
    setTryAgainShown(false);
  }, [bookingId]);

  useEffect(() => {
    if (!open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setClaimablePrize(null);
      setTryAgainShown(false);
      return;
    }
    issueRequestedRef.current = false;
    redeemStartedRef.current = false;
    setRedeemPhase("idle");
    setClaimablePrize(null);
    setTryAgainShown(false);
  }, [open]);

  useEffect(() => {
    if (!open || bookingScratchLoading) return;

    if (bookingScratch?.publicToken && bookingScratch.cardId) {
      if (syncedCardIdRef.current !== bookingScratch.cardId) {
        syncedCardIdRef.current = bookingScratch.cardId;
        setToken(bookingScratch.publicToken);
        setCardId(bookingScratch.cardId);
      }
      return;
    }

    if (disabled || scratchRewardApplied || campaigns.length === 0) return;
    if (issueRequestedRef.current || issue.isPending || syncedCardIdRef.current) return;
    issueRequestedRef.current = true;
    issue.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issue.mutate is stable; avoid re-firing on token state
  }, [
    open,
    bookingId,
    bookingScratch?.cardId,
    bookingScratch?.publicToken,
    bookingScratchLoading,
    disabled,
    scratchRewardApplied,
    campaigns.length,
    issue.isPending,
  ]);

  useEffect(() => {
    if (redeemPhase !== "applied") return;
    closeTimerRef.current = window.setTimeout(() => onClose(), 700);
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, [redeemPhase, onClose]);

  useEffect(() => {
    if (!redeemPending && redeemPhase === "applying" && redeemStartedRef.current) {
      setRedeemPhase(redeemError ? "error" : "applied");
      if (redeemError) redeemStartedRef.current = false;
    }
  }, [redeemPending, redeemPhase, redeemError]);

  const handlePrizeClaimable = useCallback((card: PublicScratchCard) => {
    if (card.prizeKind === "TRY_AGAIN") {
      setTryAgainShown(true);
      setClaimablePrize(null);
      return;
    }
    if (card.redeemable && card.redemptionCode) {
      setClaimablePrize(card);
    }
  }, []);

  const handleClaim = useCallback(() => {
    if (!cardId || !claimablePrize || redeemStartedRef.current || scratchRewardApplied) return;
    redeemStartedRef.current = true;
    setRedeemPhase("applying");
    onRedeem({
      cardId,
      redemptionCode: claimablePrize.redemptionCode,
    });
  }, [cardId, claimablePrize, onRedeem, scratchRewardApplied]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && redeemPhase !== "applying") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, redeemPhase]);

  if (!open) return null;

  const busy = issue.isPending || redeemPending || redeemPhase === "applying";
  const attemptFinished = isScratchAttemptFinished(bookingScratch?.status);
  const showFlow =
    token && !scratchRewardApplied && !(attemptFinished && bookingScratch?.status === "SCRATCHED");

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col scratch-billing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-scratch-title"
    >
      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <h2 id="billing-scratch-title" className="text-sm font-bold text-violet-950/90">
          {t("scratchModalTitleShort")}
        </h2>
        <button
          type="button"
          className="rounded-full bg-white/70 p-2.5 text-violet-900 shadow-sm backdrop-blur-sm disabled:opacity-40"
          disabled={busy}
          onClick={onClose}
          aria-label={t("scratchModalClose")}
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-h-0 overflow-y-auto">
        {scratchRewardApplied && (
          <div className="flex flex-col items-center gap-3 text-center scratch-prize-reveal">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 scratch-sparkle-pop" />
            <p className="text-lg font-bold text-[var(--text-primary)]">{t("scratchDiscountApplied")}</p>
          </div>
        )}

        {attemptFinished && !scratchRewardApplied && bookingScratch?.status === "SCRATCHED" && (
          <p className="text-sm font-semibold text-center text-[var(--text-primary)] max-w-xs">
            {t("scratchOnePerBillUsed")}
          </p>
        )}

        {issue.isError && (
          <div className="mb-4 max-w-sm rounded-xl border border-red-200 bg-white/90 px-3 py-2 text-sm text-red-700">
            {issue.error instanceof Error ? issue.error.message : t("scratchIssueFailed")}
          </div>
        )}

        {(issue.isPending || bookingScratchLoading) && !token && (
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        )}

        {showFlow ? (
          <ScratchCardFlow
            key={`${token}-${open}`}
            token={token}
            variant="billing"
            showRedemptionCode={false}
            billingClaimHint={
              redeemPhase === "applying"
                ? t("scratchApplyingDiscount")
                : claimablePrize
                  ? t("scratchClaimHint")
                  : undefined
            }
            canvasClassName="min-h-[200px]"
            onPrizeClaimable={handlePrizeClaimable}
          />
        ) : null}

        {redeemError && redeemPhase === "error" && (
          <p className="mt-4 max-w-sm text-center text-sm text-red-600">{redeemError}</p>
        )}
      </div>

      {claimablePrize && redeemPhase !== "applied" && !scratchRewardApplied && (
        <div className="shrink-0 px-4 pb-2 space-y-2">
          <button
            type="button"
            className={cn(btnPrimary, "w-full min-h-12 text-base font-bold")}
            disabled={busy}
            onClick={handleClaim}
          >
            {redeemPending || redeemPhase === "applying" ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("scratchApplyingDiscount")}
              </span>
            ) : (
              t("scratchClaimCta")
            )}
          </button>
        </div>
      )}

      {(tryAgainShown || (redeemPhase === "applied" && !claimablePrize)) && !scratchRewardApplied && (
        <div className="shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button type="button" className={cn(btnPrimary, "w-full min-h-12")} onClick={onClose}>
            {t("done")}
          </button>
        </div>
      )}

      {!claimablePrize && !tryAgainShown && !scratchRewardApplied && redeemPhase !== "applied" && (
        <div className="shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className={cn(btnSecondary, "w-full min-h-11 bg-white/80 backdrop-blur-sm")}
            disabled={busy}
            onClick={onClose}
          >
            {t("scratchModalClose")}
          </button>
        </div>
      )}
    </div>
  );
}
