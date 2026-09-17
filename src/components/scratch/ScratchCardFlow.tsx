"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { api, type PublicScratchCard } from "@/lib/api";
import { ScratchRevealCanvas } from "@/components/scratch/ScratchRevealCanvas";
import { ScratchCelebration } from "@/components/scratch/ScratchCelebration";
import { ScratchGiftCardFrame } from "@/components/scratch/ScratchGiftCardFrame";
import { cn } from "@/lib/utils";

export function ScratchCardFlow({
  token,
  className,
  canvasClassName,
  variant = "standalone",
  showRedemptionCode = true,
  billingAutoApplyMessage,
  billingClaimHint,
  autoRedeemOnUnlock = false,
  onBillableUnlock,
  onPrizeClaimable,
}: {
  token: string;
  className?: string;
  canvasClassName?: string;
  variant?: "standalone" | "billing";
  showRedemptionCode?: boolean;
  billingAutoApplyMessage?: string;
  /** Shown under prize in billing flow before guest taps Claim */
  billingClaimHint?: string;
  /** Guest link / legacy: redeem as soon as prize unlocks */
  autoRedeemOnUnlock?: boolean;
  onBillableUnlock?: (card: PublicScratchCard) => void;
  onPrizeClaimable?: (card: PublicScratchCard) => void;
}) {
  const t = useTranslations("scratch");
  const tWalkIn = useTranslations("manager.walkIn");
  const queryClient = useQueryClient();
  const scratchTriggeredRef = useRef(false);
  const unlockNotifiedRef = useRef(false);
  const [foilExiting, setFoilExiting] = useState(false);
  const [showPrizeAnim, setShowPrizeAnim] = useState(false);
  const compact = variant === "billing";

  useEffect(() => {
    scratchTriggeredRef.current = false;
    unlockNotifiedRef.current = false;
    setFoilExiting(false);
    setShowPrizeAnim(false);
  }, [token]);

  const { data: card, isLoading, isError } = useQuery({
    queryKey: ["public-scratch", token],
    queryFn: () => api.getPublicScratchCard(token),
    enabled: !!token,
  });

  const scratch = useMutation({
    mutationFn: () => api.scratchPublicCard(token),
    onSuccess: (data) => {
      queryClient.setQueryData(["public-scratch", token], data);
    },
    onError: () => {
      scratchTriggeredRef.current = false;
      setFoilExiting(false);
    },
  });

  const onRevealThreshold = useCallback(() => {
    if (scratchTriggeredRef.current || !token) return;
    const current = queryClient.getQueryData<PublicScratchCard>(["public-scratch", token]);
    if (current?.scratched) return;
    scratchTriggeredRef.current = true;
    scratch.mutate();
  }, [queryClient, scratch, token]);

  const liveCard = scratch.data ?? card;
  const prizeRevealed = !!liveCard?.scratched;

  useEffect(() => {
    if (!prizeRevealed) return;
    setFoilExiting(true);
    const revealTimer = window.setTimeout(() => setShowPrizeAnim(true), 280);
    return () => window.clearTimeout(revealTimer);
  }, [prizeRevealed]);

  useEffect(() => {
    if (card?.scratched) {
      setShowPrizeAnim(true);
      setFoilExiting(true);
    }
  }, [card?.scratched]);

  useEffect(() => {
    if (!liveCard || !prizeRevealed || unlockNotifiedRef.current) return;
    if (liveCard.status === "REDEEMED") return;
    if (liveCard.prizeKind === "TRY_AGAIN") return;
    if (!liveCard.redeemable || !liveCard.redemptionCode) return;
    unlockNotifiedRef.current = true;
    if (autoRedeemOnUnlock) {
      onBillableUnlock?.(liveCard);
    } else {
      onPrizeClaimable?.(liveCard);
    }
  }, [autoRedeemOnUnlock, liveCard, onBillableUnlock, onPrizeClaimable, prizeRevealed]);

  if (!token) {
    return <p className="text-sm text-red-600">{t("invalidLink")}</p>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (isError || !card || !liveCard) {
    return <p className="text-sm text-red-600">{t("notFound")}</p>;
  }

  const accent = liveCard.primaryColor || "#7c3aed";
  const prizeLabel = liveCard.prizeHeadline || liveCard.prizeLabel || t("mysteryReward");
  const isTryAgain = liveCard.prizeKind === "TRY_AGAIN";
  const showCode = showRedemptionCode && !!liveCard.redemptionCode && liveCard.redeemable;
  const showFoil = !prizeRevealed || foilExiting;
  const celebrate = showPrizeAnim && prizeRevealed && !isTryAgain;

  const scratchCanvas = (
    <>
      {showFoil && (
        <div className="relative w-full max-w-full">
          <ScratchRevealCanvas
            key={token}
            revealed={false}
            exiting={foilExiting}
            onRevealThreshold={onRevealThreshold}
            accentColor={accent}
            foilLabel={compact ? tWalkIn("scratchFoilLabel") : undefined}
            className={cn("border-0 shadow-inner", canvasClassName)}
          />
          {scratch.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-violet-700" />
            </div>
          )}
        </div>
      )}
      {scratch.isError && (
        <p className="text-xs text-red-600 text-center mt-2">
          {scratch.error instanceof Error ? scratch.error.message : t("revealFailed")}
        </p>
      )}
    </>
  );

  const prizeBlock = prizeRevealed && showPrizeAnim && (
    <div
      className={cn(
        "w-full max-w-full space-y-2 py-1 scratch-prize-reveal scratch-prize-burst",
        compact && "py-2"
      )}
    >
      <div className="flex w-full items-center justify-center gap-1.5 text-violet-700 dark:text-violet-300">
        <Sparkles className="h-4 w-4 shrink-0 scratch-sparkle-pop" />
        <span className="text-xs font-bold uppercase tracking-wide text-center">
          {isTryAgain ? t("tryAgainTitle") : t("youWon")}
        </span>
      </div>
      <p
        className={cn(
          "mx-auto w-full font-bold text-center text-[var(--text-primary)] leading-snug",
          compact ? "text-xl sm:text-2xl px-1" : "text-2xl"
        )}
      >
        {prizeLabel}
      </p>
      {isTryAgain ? (
        <p className="mx-auto max-w-[16rem] text-xs text-center text-[var(--text-secondary)] leading-snug">
          {compact ? tWalkIn("scratchTryAgainShort") : t("tryAgainHint")}
        </p>
      ) : billingAutoApplyMessage ? (
        <p className="mx-auto max-w-[18rem] text-xs font-medium text-center text-emerald-700 dark:text-emerald-300">
          {billingAutoApplyMessage}
        </p>
      ) : compact && !isTryAgain && billingClaimHint ? (
        <p className="mx-auto max-w-[18rem] text-xs font-medium text-center text-violet-800/90 dark:text-violet-200/90">
          {billingClaimHint}
        </p>
      ) : null}
      {showCode && (
        <div className="mt-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-3 scratch-prize-reveal-delay">
          <p className="font-mono text-3xl font-bold tracking-[0.2em] text-emerald-900 dark:text-emerald-50">
            {liveCard.redemptionCode}
          </p>
        </div>
      )}
    </div>
  );

  if (compact) {
    const showPrizeOnly = prizeRevealed && showPrizeAnim && !showFoil;
    return (
      <div className={cn("relative w-full flex flex-col items-center", className)} style={{ ["--brand" as string]: accent }}>
        <ScratchCelebration active={celebrate} />
        <ScratchGiftCardFrame accentColor={accent} title={liveCard.campaignName} floating={showFoil && !showPrizeOnly}>
          {showPrizeOnly ? prizeBlock : (
            <>
              {prizeBlock}
              {scratchCanvas}
            </>
          )}
        </ScratchGiftCardFrame>
        {showFoil && !showPrizeOnly && (
          <p className="mt-3 w-full text-center text-[11px] font-semibold text-violet-800/90 dark:text-violet-200/90">
            {tWalkIn("scratchFoilHint")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} style={{ ["--brand" as string]: accent }}>
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {liveCard.tenantName}
              {liveCard.branchName ? ` · ${liveCard.branchName}` : ""}
            </p>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{liveCard.campaignName}</h2>
            {liveCard.campaignDescription ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{liveCard.campaignDescription}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative space-y-2">
        {prizeBlock}
        {showFoil && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">{t("scratchIntro")}</p>
            {scratchCanvas}
          </>
        )}
      </div>
    </div>
  );
}
