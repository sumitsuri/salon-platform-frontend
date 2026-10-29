"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Copy, ImageIcon, Plus, Trash2, Wand2 } from "lucide-react";
import { api, type FestiveOffer } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  AlertBanner,
  ConfirmDialog,
  EmptyState,
  PageLoader,
  btnPrimary,
  btnSecondarySm,
} from "@/components/ui";
import { OfferEditor } from "./OfferEditor";
import { usePosterImage } from "./PosterPanel";
import { draftFromOffer, duplicateDraft, emptyDraft, type OfferDraft } from "./offer-form";

type View = { mode: "list" } | { mode: "edit"; offer: FestiveOffer | null; draft: OfferDraft; nonce: number };

function OfferThumb({ offer }: { offer: FestiveOffer }) {
  const posterId = offer.latestPoster?.status === "READY" ? offer.latestPoster.id : undefined;
  const { url } = usePosterImage(posterId);
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--text-tertiary)]">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

export function OfferStudio() {
  const t = useTranslations("admin.offerStudio");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.user?.tenantName) ?? "";
  const [view, setView] = useState<View>({ mode: "list" });
  const [toDelete, setToDelete] = useState<FestiveOffer | null>(null);

  const studio = useQuery({ queryKey: ["offer-studio"], queryFn: () => api.getOfferStudio() });
  const offers = useQuery({ queryKey: ["festive-offers"], queryFn: () => api.listFestiveOffers() });
  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: () => api.getBranches() });
  const branches = (branchesQuery.data ?? []).filter((b) => b.status !== "INACTIVE");

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteFestiveOffer(id),
    onSuccess: () => {
      setToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["festive-offers"] });
    },
  });

  const startNew = (occasion?: string) =>
    setView({
      mode: "edit",
      offer: null,
      nonce: Date.now(),
      draft: emptyDraft({ info: studio.data, branches, brandName: tenantName, occasion }),
    });

  if (view.mode === "edit") {
    return (
      <OfferEditor
        key={view.nonce}
        initialOffer={view.offer}
        initialDraft={view.draft}
        studio={studio.data}
        branches={branches}
        onBack={() => {
          void queryClient.invalidateQueries({ queryKey: ["festive-offers"] });
          setView({ mode: "list" });
        }}
      />
    );
  }

  if (studio.isLoading || offers.isLoading || branchesQuery.isLoading) return <PageLoader />;
  if (offers.isError) return <AlertBanner variant="error">{t("loadFailed")}</AlertBanner>;

  const list = offers.data ?? [];
  const provider = studio.data?.provider ?? "none";

  return (
    <div className="space-y-4" data-testid="offer-studio">
      {provider === "none" && (
        <AlertBanner variant="warning">
          <p className="font-semibold">{t("providerNoneTitle")}</p>
          <p className="mt-0.5 text-[var(--text-secondary)]">{t("providerNoneBody")}</p>
        </AlertBanner>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <EmptyState
            icon={Wand2}
            title={t("emptyTitle")}
            description={t("emptyBody")}
            action={
              <button type="button" className={btnPrimary} onClick={() => startNew()} data-testid="offer-create">
                <Plus className="h-4 w-4" />
                {t("createOffer")}
              </button>
            }
          />
          {(studio.data?.occasions.length ?? 0) > 0 && (
            <div className="border-t border-[var(--border)] px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{t("startWith")}</p>
              <div className="flex flex-wrap gap-2">
                {studio.data?.occasions.slice(0, 8).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => startNew(o.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] min-h-10 touch-manipulation"
                  >
                    <span aria-hidden>{o.emoji}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[var(--text-secondary)]">
              {studio.data && studio.data.dailyLimit > 0 && provider !== "none"
                ? t("usedToday", { used: studio.data.usedToday, limit: studio.data.dailyLimit })
                : ""}
            </p>
            <button type="button" className={btnPrimary} onClick={() => startNew()} data-testid="offer-create">
              <Plus className="h-4 w-4" />
              {t("createOffer")}
            </button>
          </div>
          <div className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2 hub:grid-cols-3 min-[1280px]:grid-cols-4">
            {list.map((o) => (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm" data-testid="offer-card">
                <button
                  type="button"
                  className="text-left touch-manipulation"
                  onClick={() => setView({ mode: "edit", offer: o, draft: draftFromOffer(o), nonce: Date.now() })}
                  aria-label={`${t("open")} ${o.headline}`}
                >
                  <OfferThumb offer={o} />
                </button>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 break-words">{o.headline}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {o.occasionLabel}
                    {o.branchName ? ` · ${o.branchName}` : ""}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {t("posters", { count: o.posterCount })}
                    {o.validUntil
                      ? ` · ${t("validTill", { date: new Date(`${o.validUntil}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }) })}`
                      : ""}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    className={cn(btnSecondarySm, "flex-1")}
                    onClick={() => setView({ mode: "edit", offer: o, draft: draftFromOffer(o), nonce: Date.now() })}
                  >
                    {t("open")}
                  </button>
                  <button
                    type="button"
                    className={btnSecondarySm}
                    title={t("duplicate")}
                    aria-label={`${t("duplicate")} ${o.headline}`}
                    onClick={() => setView({ mode: "edit", offer: null, draft: duplicateDraft(o), nonce: Date.now() })}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={btnSecondarySm}
                    title={t("delete")}
                    aria-label={`${t("delete")} ${o.headline}`}
                    onClick={() => setToDelete(o)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        title={t("delete")}
        description={toDelete ? t("confirmDeleteOffer", { name: toDelete.headline }) : ""}
        confirmLabel={t("delete")}
        cancelLabel={tCommon("cancel")}
        confirmPending={remove.isPending}
      />
    </div>
  );
}
