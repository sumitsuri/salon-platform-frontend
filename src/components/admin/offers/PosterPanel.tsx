"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Loader2, RefreshCw, Send, Sparkles, Trash2 } from "lucide-react";
import { api, fetchOfferPosterBlob, type FestiveOffer, type OfferStudioInfo } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AlertBanner, ConfirmDialog, btnPrimary, btnSecondary, btnSecondarySm } from "@/components/ui";
import { copyText, downloadPoster, sharePosterToWhatsApp } from "./share-poster";

/** Loads a poster through the authenticated API and exposes it as an object URL for <img>. */
export function usePosterImage(posterId: string | undefined) {
  const query = useQuery({
    queryKey: ["offer-poster-blob", posterId],
    queryFn: () => fetchOfferPosterBlob(posterId!),
    enabled: !!posterId,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: 1,
  });
  const url = useMemo(() => (query.data ? URL.createObjectURL(query.data) : null), [query.data]);
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);
  return { blob: query.data, url, isLoading: query.isLoading, isError: query.isError };
}

function Thumb({ posterId, active, onClick }: { posterId: string; active: boolean; onClick: () => void }) {
  const { url } = usePosterImage(posterId);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--surface-muted)] transition touch-manipulation",
        active ? "border-[var(--brand)]" : "border-transparent opacity-80 hover:opacity-100"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
    </button>
  );
}

export function PosterPanel({
  offer,
  dirty,
  studio,
  headline,
  caption,
  onCaptionChange,
  onResetCaption,
  resettingCaption,
}: {
  offer: FestiveOffer | null;
  dirty: boolean;
  studio: OfferStudioInfo | undefined;
  headline: string;
  caption: string;
  onCaptionChange: (v: string) => void;
  onResetCaption: () => void;
  resettingCaption: boolean;
}) {
  const t = useTranslations("admin.offerStudio");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const offerId = offer?.id;
  const postersQuery = useQuery({
    queryKey: ["offer-posters", offerId],
    queryFn: () => api.listOfferPosters(offerId!),
    enabled: !!offerId,
    refetchInterval: (q) => (q.state.data?.some((p) => p.status === "PENDING") ? 3000 : false),
  });
  const latestPoster = offer?.latestPoster;
  const posters = useMemo(
    () => postersQuery.data ?? (latestPoster ? [latestPoster] : []),
    [postersQuery.data, latestPoster]
  );
  const pending = posters.find((p) => p.status === "PENDING");
  const ready = useMemo(() => posters.filter((p) => p.status === "READY"), [posters]);
  const active = ready.find((p) => p.id === activeId) ?? ready[0];
  const failed = !pending && posters[0]?.status === "FAILED" ? posters[0] : null;
  const image = usePosterImage(active?.id);
  const verified = !!active && verifiedId === active.id;

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["offer-posters", offerId] });
    void queryClient.invalidateQueries({ queryKey: ["festive-offers"] });
    void queryClient.invalidateQueries({ queryKey: ["offer-studio"] });
  };

  const generate = useMutation({
    mutationFn: () => api.generateOfferPoster(offerId!),
    onSuccess: () => {
      setError("");
      setNote("");
      setActiveId(null);
      refreshAll();
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : t("failed"));
      refreshAll();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteOfferPoster(id),
    onSuccess: () => {
      setConfirmDelete(false);
      setActiveId(null);
      refreshAll();
    },
    onError: (e) => {
      setConfirmDelete(false);
      setError(e instanceof Error ? e.message : t("failed"));
    },
  });

  const provider = studio?.provider ?? "none";
  const limitReached = !!studio && studio.dailyLimit > 0 && studio.usedToday >= studio.dailyLimit;
  const canGenerate = !!offer && !dirty && provider !== "none" && !pending && !generate.isPending && !limitReached;

  async function share() {
    if (!image.blob) return;
    setNote("");
    const outcome = await sharePosterToWhatsApp(image.blob, headline, caption);
    if (outcome === "shared") setNote(t("sharedHint"));
    if (outcome === "downloaded") setNote(t("desktopShareHint"));
  }

  async function copy() {
    if (await copyText(caption)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <div className="space-y-4" data-testid="poster-panel">
      {provider === "none" && (
        <AlertBanner variant="warning">
          <p className="font-semibold">{t("providerNoneTitle")}</p>
          <p className="mt-0.5 text-[var(--text-secondary)]">{t("providerNoneBody")}</p>
        </AlertBanner>
      )}
      {provider === "preview" && (
        <AlertBanner variant="info">
          <p className="font-semibold">{t("providerPreviewTitle")}</p>
          <p className="mt-0.5 text-[var(--text-secondary)]">{t("providerPreviewBody")}</p>
        </AlertBanner>
      )}

      {offer && offer.summaryLines.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{t("willState")}</p>
          <ul className="space-y-1 text-sm text-[var(--text-primary)]">
            {offer.summaryLines.map((l) => (
              <li key={l} className="break-words">• {l}</li>
            ))}
            {offer.phone ? <li>• {offer.phone}</li> : null}
            {offer.address ? <li className="break-words">• {offer.address}</li> : null}
          </ul>
        </div>
      )}

      {!offer && <p className="text-sm text-[var(--text-secondary)]">{t("saveFirst")}</p>}
      {offer && dirty && <p className="text-sm text-amber-700 dark:text-amber-400">{t("saveChangesFirst")}</p>}

      {pending ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-brand)] bg-[var(--surface)] px-5 py-10 text-center" role="status">
          <Loader2 className="h-7 w-7 animate-spin text-[var(--brand)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">{t("generating")}</p>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs">{t("generatingHint")}</p>
        </div>
      ) : active ? (
        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] shadow-md">
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt={headline} className="block w-full h-auto" data-testid="poster-image" />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-[var(--text-secondary)]">
                {image.isError ? t("loadFailed") : <Loader2 className="h-6 w-6 animate-spin" />}
              </div>
            )}
            {active.provider === "preview" && (
              <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                {t("providerPreviewTitle")}
              </span>
            )}
          </div>

          {ready.length > 1 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[var(--text-secondary)]">{t("versions")}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {ready.slice(0, 8).map((p) => (
                  <Thumb key={p.id} posterId={p.id} active={p.id === active.id} onClick={() => setActiveId(p.id)} />
                ))}
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50/70 p-3 text-sm text-[var(--text-primary)] dark:border-amber-700/60 dark:bg-amber-950/30">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand)]"
              checked={verified}
              onChange={(e) => setVerifiedId(e.target.checked ? active.id : null)}
              data-testid="poster-verify"
            />
            <span>
              <span className="font-semibold">{t("verify")}</span>
              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{t("verifyHint")}</span>
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnPrimary} disabled={!verified || !image.blob} onClick={() => void share()} data-testid="poster-share">
              <Send className="h-4 w-4" />
              {t("shareWhatsApp")}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={!image.blob}
              onClick={() => image.blob && downloadPoster(image.blob, headline)}
            >
              <Download className="h-4 w-4" />
              {t("download")}
            </button>
          </div>
          {note && <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">{note}</p>}
        </div>
      ) : null}

      {failed && (
        <AlertBanner variant="error">
          <p className="font-semibold">{t("failed")}</p>
          {failed.error ? <p className="mt-0.5 text-[var(--text-secondary)]">{failed.error}</p> : null}
        </AlertBanner>
      )}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={active || failed ? btnSecondary : btnPrimary} disabled={!canGenerate} onClick={() => generate.mutate()} data-testid="poster-generate">
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {failed ? t("retry") : active ? t("regenerate") : t("generate")}
        </button>
        {active && (
          <button type="button" className={btnSecondarySm} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            {t("deletePoster")}
          </button>
        )}
        {studio && studio.dailyLimit > 0 && (
          <span className={cn("text-xs", limitReached ? "text-red-600 font-semibold" : "text-[var(--text-secondary)]")}>
            {limitReached ? t("limitReached") : t("usedToday", { used: studio.usedToday, limit: studio.dailyLimit })}
          </span>
        )}
      </div>

      <div className="space-y-1.5 border-t border-[var(--border)] pt-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="offer-caption" className="text-sm font-semibold text-[var(--text-primary)]">
            {t("caption")}
          </label>
          <div className="flex items-center gap-2">
            <button type="button" className="text-xs font-semibold text-[var(--brand-text)] hover:underline disabled:opacity-40" disabled={!offer || resettingCaption} onClick={onResetCaption}>
              {t("resetCaption")}
            </button>
            <button type="button" className={btnSecondarySm} onClick={() => void copy()} disabled={!caption.trim()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("copied") : t("copyCaption")}
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">{t("captionHint")}</p>
        <textarea
          id="offer-caption"
          rows={9}
          maxLength={2000}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder={offer ? "" : t("saveFirst")}
          className="w-full rounded-xl border border-[var(--border-brand)] bg-[var(--surface)] px-3.5 py-3 text-base sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
        />
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => active && remove.mutate(active.id)}
        title={t("confirmDeletePoster")}
        description={t("deletePoster")}
        confirmLabel={t("delete")}
        cancelLabel={tCommon("cancel")}
        confirmPending={remove.isPending}
      />
    </div>
  );
}
