"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  LucideIcon,
  ScanSearch,
  Star,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui";
import { EnterpriseTableShell, PulseStatCard, enterpriseTableHead } from "@/components/enterprise-ui";
import {
  LocalSpotlightBranchRow,
  LocalSpotlightPlaybookItem,
  LocalSpotlightRivalRow,
  LocalSpotlightSearchRankRow,
} from "@/lib/api";

export function lvsScoreColor(score: number, linked: boolean) {
  if (!linked) return "text-[var(--text-tertiary)]";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-sky-600 dark:text-sky-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function lvsBarColor(score: number, linked: boolean) {
  if (!linked) return "bg-[var(--border-strong)]";
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-sky-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function scoreLabelText(label: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    EXCELLENT: t("scoreExcellent"),
    GOOD: t("scoreGood"),
    NEEDS_ATTENTION: t("scoreNeedsAttention"),
    CRITICAL: t("scoreCritical"),
    NOT_LINKED: t("scoreNotLinked"),
  };
  return map[label] ?? label;
}

function rivalThreatScore(rival: {
  googleRating?: number | null;
  googleReviewCount?: number | null;
  googleLowRatingReviewCount?: number | null;
  gbpPhotoCount?: number | null;
}) {
  const rating = rival.googleRating ?? 0;
  const reviews = rival.googleReviewCount ?? 0;
  const lowRatings = rival.googleLowRatingReviewCount ?? 0;
  const photos = rival.gbpPhotoCount ?? 0;
  return rating * 1000 + Math.min(reviews, 9999) + photos * 5 - lowRatings * 75;
}

type RivalSortKey = "strength" | "rating" | "reviews" | "lowRatingsDesc" | "lowRatingsAsc" | "photos";

function sortRivals(rivals: LocalSpotlightRivalRow[], sortKey: RivalSortKey) {
  const sorted = [...rivals];
  switch (sortKey) {
    case "rating":
      sorted.sort((a, b) => (b.googleRating ?? 0) - (a.googleRating ?? 0));
      break;
    case "reviews":
      sorted.sort((a, b) => (b.googleReviewCount ?? 0) - (a.googleReviewCount ?? 0));
      break;
    case "lowRatingsDesc":
      sorted.sort((a, b) => (b.googleLowRatingReviewCount ?? 0) - (a.googleLowRatingReviewCount ?? 0));
      break;
    case "lowRatingsAsc":
      sorted.sort((a, b) => (a.googleLowRatingReviewCount ?? 0) - (b.googleLowRatingReviewCount ?? 0));
      break;
    case "photos":
      sorted.sort((a, b) => (b.gbpPhotoCount ?? 0) - (a.gbpPhotoCount ?? 0));
      break;
    default:
      sorted.sort((a, b) => rivalThreatScore(b) - rivalThreatScore(a));
  }
  return sorted;
}

function LowRatingCell({
  count,
  sampleSize,
  t,
}: {
  count?: number | null;
  sampleSize?: number | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (count == null) return <span className="text-[var(--text-tertiary)]">—</span>;
  const severity =
    count === 0 ? "text-emerald-600" : count <= 2 ? "text-amber-600" : "text-rose-600";
  return (
    <div>
      <span className={cn("font-semibold tabular-nums", severity)}>{count}</span>
      {sampleSize != null && sampleSize > 0 && (
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {t("lowRatingSample", { sample: sampleSize })}
        </div>
      )}
    </div>
  );
}

function StrengthBadge({
  rival,
  you,
  t,
}: {
  rival: LocalSpotlightRivalRow;
  you?: LocalSpotlightBranchRow;
  t: (key: string) => string;
}) {
  const rivalScore = rivalThreatScore(rival);
  const yourScore = you ? rivalThreatScore(you) : 0;
  if (!you) return null;
  if (rivalScore > yourScore + 200) {
    return (
      <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
        {t("rivalStronger")}
      </span>
    );
  }
  if (rivalScore < yourScore - 200) {
    return (
      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        {t("rivalWeaker")}
      </span>
    );
  }
  return (
    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      {t("rivalComparable")}
    </span>
  );
}

export function LocalSpotlightHero({
  score,
  scoreLabel,
  branchesLinked,
  branchesTotal,
  dataSourceNote,
  lastRefreshedAt,
  t,
}: {
  score: number;
  scoreLabel: string;
  branchesLinked: number;
  branchesTotal: number;
  dataSourceNote: string;
  lastRefreshedAt?: string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const linked = branchesLinked > 0;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {t("lvsTitle")}
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className={cn("text-4xl font-black tabular-nums", lvsScoreColor(score, linked))}>
              {linked ? score : "—"}
            </span>
            {linked && <span className="text-lg text-[var(--text-tertiary)]">/100</span>}
          </div>
          <p className={cn("mt-1 text-sm font-semibold", lvsScoreColor(score, linked))}>
            {scoreLabelText(scoreLabel, t)}
          </p>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            {t("branchesLinked", { linked: branchesLinked, total: branchesTotal })}
          </p>
        </div>
        <div className="w-full md:max-w-xs">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className={cn("h-full rounded-full transition-all", lvsBarColor(score, linked))}
              style={{ width: linked ? `${Math.max(score, 4)}%` : "8%" }}
            />
          </div>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-[var(--text-tertiary)]">{dataSourceNote}</p>
      {lastRefreshedAt && (
        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
          {t("lastSynced")}: {new Date(lastRefreshedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export function BranchSpotlightTable({
  rows,
  t,
  onSelectBranch,
}: {
  rows: LocalSpotlightBranchRow[];
  t: (key: string) => string;
  onSelectBranch?: (id: string) => void;
}) {
  return (
    <div className="responsive-table-wrap rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <th className="px-3 py-2">{t("branch")}</th>
            <th className="px-3 py-2">{t("lvs")}</th>
            <th className="px-3 py-2">{t("searchRank")}</th>
            <th className="px-3 py-2">{t("googleRating")}</th>
            <th className="px-3 py-2">{t("gbpHealth")}</th>
            <th className="px-3 py-2">{t("rivals")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.branchId}
              className="border-b border-[var(--border)]/60 hover:bg-[var(--surface-muted)]/50 cursor-pointer"
              onClick={() => onSelectBranch?.(row.branchId)}
            >
              <td className="px-3 py-3">
                <div className="font-semibold text-[var(--text-primary)]">{row.branchName}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{row.localityLabel}</div>
                {row.googleFormattedAddress && (
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">{row.googleFormattedAddress}</div>
                )}
                {row.googleMapsUrl && (
                  <a
                    href={row.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-text)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t("viewGoogleListing")} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </td>
              <td className={cn("px-3 py-3 font-bold tabular-nums", lvsScoreColor(row.localVisibilityScore, row.listingLinked))}>
                {row.listingLinked ? row.localVisibilityScore : "—"}
              </td>
              <td className="px-3 py-3">
                {row.estimatedSearchRank != null ? (
                  <span className={cn("font-semibold", row.inTop3 ? "text-emerald-600" : "text-amber-600")}>
                    #{row.estimatedSearchRank}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3">
                {row.googleRating != null ? (
                  <>
                    ★ {row.googleRating.toFixed(1)}
                    {row.googleReviewCount != null && (
                      <span className="text-[var(--text-tertiary)]"> ({row.googleReviewCount})</span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3">{row.listingLinked ? `${row.gbpCompletenessPercent}%` : t("notLinked")}</td>
              <td className="px-3 py-3">{row.trackedRivalCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BranchGbpChecklist({
  row,
  t,
}: {
  row: LocalSpotlightBranchRow;
  t: (key: string) => string;
}) {
  const items = [
    { ok: row.listingLinked, label: t("checkListingLinked") },
    { ok: row.gbpHasPhone, label: t("checkPhone") },
    { ok: row.gbpHasWebsite, label: t("checkWebsite") },
    { ok: row.gbpHasHours, label: t("checkHours") },
    { ok: row.gbpHasBookButton, label: t("checkBookButton") },
    { ok: (row.gbpPhotoCount ?? 0) >= 10, label: t("checkPhotos") },
    { ok: (row.gbpVideoCount ?? 0) >= 1, label: t("checkVideos") },
    { ok: (row.gbpServicesListedCount ?? 0) >= 5, label: t("checkServices") },
  ];

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className={cn("font-bold", item.ok ? "text-emerald-600" : "text-rose-500")}>
            {item.ok ? "✓" : "✗"}
          </span>
          <span className={item.ok ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)] font-medium"}>
            {item.label}
          </span>
        </div>
      ))}
      {(row.googleMapsUrl || row.googleReviewUrl) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {row.googleFormattedAddress && (
            <p className="w-full text-xs text-[var(--text-secondary)]">{row.googleFormattedAddress}</p>
          )}
          {row.googleMapsUrl && (
            <a
              href={row.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]"
            >
              {t("viewGoogleListing")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {row.googleReviewUrl && (
            <a
              href={row.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]"
            >
              {t("viewGoogleReviews")} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function RivalsComparisonTable({
  branches,
  rivals,
  t,
}: {
  branches: LocalSpotlightBranchRow[];
  rivals: LocalSpotlightRivalRow[];
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const [sortKey, setSortKey] = useState<RivalSortKey>("strength");
  const you = branches.find((b) => b.googleSynced) ?? branches[0];
  const sortedRivals = useMemo(() => sortRivals(rivals, sortKey), [rivals, sortKey]);

  if (rivals.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">{t("rivalsEmpty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--text-secondary)]">{t("rivalsSortHint")}</p>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="font-semibold uppercase tracking-wide">{t("rivalSort")}</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as RivalSortKey)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
          >
            <option value="strength">{t("sortStrength")}</option>
            <option value="rating">{t("sortRating")}</option>
            <option value="reviews">{t("sortReviews")}</option>
            <option value="lowRatingsDesc">{t("sortLowRatingsDesc")}</option>
            <option value="lowRatingsAsc">{t("sortLowRatingsAsc")}</option>
            <option value="photos">{t("sortPhotos")}</option>
          </select>
        </label>
      </div>
      <div className="responsive-table-wrap rounded-xl border border-[var(--border)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-3 py-2">{t("salon")}</th>
              <th className="px-3 py-2">{t("googleListing")}</th>
              <th className="px-3 py-2">{t("googleRating")}</th>
              <th className="px-3 py-2">{t("reviews")}</th>
              <th className="px-3 py-2">{t("lowRatingReviews")}</th>
              <th className="px-3 py-2">{t("photos")}</th>
              <th className="px-3 py-2">{t("phone")}</th>
            </tr>
          </thead>
          <tbody>
            {you && (
              <tr className="border-b border-[var(--border)]/60 bg-[var(--brand-muted)]/30">
                <td className="px-3 py-3">
                  <div className="font-semibold">
                    {you.branchName} ({t("you")})
                  </div>
                  {you.googleFormattedAddress && (
                    <div className="text-xs text-[var(--text-tertiary)]">{you.googleFormattedAddress}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {you.googleMapsUrl ? (
                    <a
                      href={you.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]"
                    >
                      {t("openListing")} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">{you.googleRating?.toFixed(1) ?? "—"}</td>
                <td className="px-3 py-3">{you.googleReviewCount ?? "—"}</td>
                <td className="px-3 py-3">
                  <LowRatingCell
                    count={you.googleLowRatingReviewCount}
                    sampleSize={you.googleReviewsSampleSize}
                    t={t}
                  />
                </td>
                <td className="px-3 py-3">{you.gbpPhotoCount ?? "—"}</td>
                <td className="px-3 py-3">{you.gbpHasPhone ? "✓" : "✗"}</td>
              </tr>
            )}
            {sortedRivals.map((rival) => (
              <tr key={rival.id} className="border-b border-[var(--border)]/60">
                <td className="px-3 py-3">
                  <div className="font-medium">{rival.name}</div>
                  {rival.address && <div className="text-xs text-[var(--text-tertiary)]">{rival.address}</div>}
                  <StrengthBadge rival={rival} you={you} t={t} />
                </td>
                <td className="px-3 py-3">
                  {rival.googleMapsUrl ? (
                    <a
                      href={rival.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]"
                    >
                      {t("openListing")} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      you?.googleRating != null && rival.googleRating != null && rival.googleRating > you.googleRating
                        ? "font-semibold text-rose-600"
                        : you?.googleRating != null &&
                            rival.googleRating != null &&
                            rival.googleRating < you.googleRating
                          ? "text-emerald-600"
                          : ""
                    )}
                  >
                    {rival.googleRating?.toFixed(1) ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      you?.googleReviewCount != null &&
                        rival.googleReviewCount != null &&
                        rival.googleReviewCount > you.googleReviewCount
                        ? "font-semibold text-rose-600"
                        : ""
                    )}
                  >
                    {rival.googleReviewCount ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <LowRatingCell
                    count={rival.googleLowRatingReviewCount}
                    sampleSize={rival.googleReviewsSampleSize}
                    t={t}
                  />
                </td>
                <td className="px-3 py-3">{rival.gbpPhotoCount ?? "—"}</td>
                <td className="px-3 py-3">{rival.gbpHasPhone ? "✓" : "✗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">{t("lowRatingFootnote")}</p>
    </div>
  );
}

export function SearchRankTable({
  rows,
  t,
}: {
  rows: LocalSpotlightSearchRankRow[];
  t: (key: string) => string;
}) {
  return (
    <div className="responsive-table-wrap rounded-xl border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <th className="px-3 py-2">{t("branch")}</th>
            <th className="px-3 py-2">{t("keyword")}</th>
            <th className="px-3 py-2">{t("yourRank")}</th>
            <th className="px-3 py-2">{t("topThree")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.branchId}-${row.keyword}-${i}`} className="border-b border-[var(--border)]/60">
              <td className="px-3 py-3">{row.branchName}</td>
              <td className="px-3 py-3 font-medium">{row.keyword}</td>
              <td className="px-3 py-3">
                {row.yourRank != null ? (
                  <span className={cn("font-semibold", row.inTop3 ? "text-emerald-600" : "text-amber-600")}>
                    #{row.yourRank}
                  </span>
                ) : row.yourRankBeyondTop20 ? (
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t("notInTop20")}</span>
                ) : (
                  row.yourRankLabel ?? "—"
                )}
              </td>
              <td className="px-3 py-3">
                {row.topThreeRivals && row.topThreeRivals.length > 0 ? (
                  <ol className="list-decimal space-y-1 pl-4 text-xs">
                    {row.topThreeRivals.map((rival) => (
                      <li key={`${rival.rank}-${rival.name}`} className="text-[var(--text-secondary)]">
                        {rival.googleMapsUrl ? (
                          <a
                            href={rival.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[var(--brand-text)] hover:underline"
                          >
                            {rival.name}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          rival.name
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">{row.topThreeSummary || "—"}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PLAYBOOK_SECTION_ORDER = ["GOAL", "KEYWORDS", "PROFILE", "REVIEWS", "CONTENT", "REPUTATION"] as const;

const PLAYBOOK_SECTION_META: Record<
  string,
  { icon: LucideIcon; accent: "brand" | "amber" | "violet" | "emerald" }
> = {
  GOAL: { icon: Target, accent: "brand" },
  KEYWORDS: { icon: ScanSearch, accent: "amber" },
  PROFILE: { icon: Building2, accent: "violet" },
  REVIEWS: { icon: Star, accent: "emerald" },
  CONTENT: { icon: FileText, accent: "brand" },
  REPUTATION: { icon: AlertTriangle, accent: "amber" },
};

function itemKeywords(item: LocalSpotlightPlaybookItem): string[] {
  if (item.keywords?.length) return item.keywords;
  if (item.keyword) return [item.keyword];
  return [];
}

function parseRemediationSteps(message: string): string[] {
  if (!message?.trim()) return [];

  if (message.includes("\n")) {
    const lines = message
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[\u2022•\-]\s*/, "").replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    if (lines.length > 1) return lines;
  }

  const fixMatch = message.match(/^Fix:\s*(.+)/i);
  if (fixMatch) {
    return fixMatch[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `Complete ${part} on your Google Business Profile`);
  }

  if (message.includes("→")) {
    return message
      .split("→")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/^Work through sections below in order:\s*/i, ""));
  }

  const sentences = message
    .split(/(?<=[.!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12);
  if (sentences.length > 1) return sentences;

  return [message.trim()];
}

function parseSnapshotMetrics(reasoning: string): string[] {
  if (!reasoning?.includes("·")) return [];
  return reasoning
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseKeywordEvidence(reasoning: string): Array<{ keyword: string; rank: string; leaders?: string }> {
  if (!reasoning?.includes("•")) return [];
  const rows: Array<{ keyword: string; rank: string; leaders?: string }> = [];
  const pattern = /•\s*"([^"]+)"\s*[—–-]\s*([^·]+?)(?:\s*·\s*(?:leads:\s*)?(.+?))?(?=\s*•|$)/g;
  let match = pattern.exec(reasoning);
  while (match) {
    rows.push({
      keyword: match[1],
      rank: match[2].trim(),
      leaders: match[3]?.trim().replace(/\.$/, ""),
    });
    match = pattern.exec(reasoning);
  }
  return rows;
}

function parseEvidenceSummaryTail(reasoning: string): string[] {
  const tail = reasoning.replace(/•\s*"[^"]+"\s*[—–-][^•]+/g, "").trim();
  if (!tail) return [];
  return tail
    .split(/(?<=[.!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 5);
}

function parseEvidenceBullets(reasoning: string): string[] {
  if (!reasoning?.trim()) return [];

  const keywordRows = parseKeywordEvidence(reasoning);
  if (keywordRows.length > 0) {
    const bullets = keywordRows.map((row) => {
      const leaders = row.leaders ? ` · ${row.leaders}` : "";
      return `"${row.keyword}" — ${row.rank}${leaders}`;
    });
    bullets.push(...parseEvidenceSummaryTail(reasoning));
    return bullets;
  }

  if (reasoning.includes("•")) {
    return reasoning
      .split(/\s*•\s*/)
      .map((part) => part.trim().replace(/\s+/g, " "))
      .filter(Boolean);
  }

  if (reasoning.includes("·") && !reasoning.includes("LVS")) {
    return reasoning
      .split("·")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return reasoning
    .split(/(?<=[.!])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 8);
}

function buildKeywordEvidenceRows(
  keywords: string[],
  searchRanks: LocalSpotlightSearchRankRow[] | undefined,
  reasoning: string,
  t: (key: string) => string
): Array<{ keyword: string; rank: string; leaders?: string }> {
  if (searchRanks?.length && keywords.length > 0) {
    const fromRanks = keywords
      .map((keyword) => {
        const row = searchRanks.find((rankRow) => rankRow.keyword === keyword);
        if (!row) return null;
        const leaderText = row.topThreeRivals?.map((rival) => rival.name).slice(0, 3).join(", ");
        return {
          keyword,
          rank:
            row.yourRank != null
              ? `#${row.yourRank}`
              : row.yourRankBeyondTop20
                ? t("notInTop20")
                : row.yourRankLabel ?? "—",
          ...(leaderText ? { leaders: leaderText } : {}),
        };
      })
      .filter((row): row is { keyword: string; rank: string; leaders?: string } => row != null);
    if (fromRanks.length > 0) return fromRanks;
  }
  return parseKeywordEvidence(reasoning);
}

function buildEvidenceBullets(
  item: LocalSpotlightPlaybookItem,
  reasoning: string | null | undefined,
  keywordEvidence: Array<{ keyword: string; rank: string; leaders?: string }>
): string[] {
  if (item.metricKey === "GOAL" && reasoning) {
    return parseSnapshotMetrics(reasoning);
  }

  if (keywordEvidence.length > 0) {
    const bullets = keywordEvidence.map((row) => {
      const leaders = row.leaders ? ` · ${row.leaders}` : "";
      return `"${row.keyword}" — ${row.rank}${leaders}`;
    });
    if (reasoning) {
      bullets.push(...parseEvidenceSummaryTail(reasoning));
    }
    return bullets;
  }

  if (reasoning) {
    return parseEvidenceBullets(reasoning);
  }

  return [];
}

function EvidenceBulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {items.map((entry, index) => (
        <li key={`${index}-${entry.slice(0, 24)}`} className="flex gap-2 text-xs leading-snug text-[var(--text-secondary)]">
          <span
            className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
            aria-hidden
          />
          <span>{entry}</span>
        </li>
      ))}
    </ul>
  );
}

function resolveActionTarget(item: LocalSpotlightPlaybookItem): string {
  return item.actionTarget ?? inferActionTarget(item);
}

function SpotlightActionCta({
  item,
  branch,
  onAction,
  compact,
}: {
  item: LocalSpotlightPlaybookItem;
  branch?: LocalSpotlightBranchRow | null;
  onAction: () => void;
  compact?: boolean;
}) {
  const target = resolveActionTarget(item);
  const buttonClass = compact
    ? "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--brand)] text-[var(--brand-on-brand)] text-xs font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap"
    : "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-[var(--brand-on-brand)] text-sm font-bold shadow-sm hover:opacity-90 active:scale-[0.98] transition";

  if (target.startsWith("route:")) {
    return (
      <Link href={target.slice(6)} className={buttonClass}>
        {item.actionLabel}
        <ArrowRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </Link>
    );
  }

  if (target === "external:googleMaps" && branch?.googleMapsUrl) {
    return (
      <a href={branch.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        {item.actionLabel}
        <ExternalLink className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    );
  }

  if (target === "external:googleReviews" && branch?.googleReviewUrl) {
    return (
      <a href={branch.googleReviewUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
        {item.actionLabel}
        <ExternalLink className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </a>
    );
  }

  const Icon = target.startsWith("external:") ? ExternalLink : ArrowRight;

  return (
    <button type="button" onClick={onAction} className={buttonClass}>
      {item.actionLabel}
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

function KeywordRankChips({
  keywords,
  searchRanks,
  t,
}: {
  keywords: string[];
  searchRanks?: LocalSpotlightSearchRankRow[];
  t: (key: string) => string;
}) {
  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((keyword) => {
        const rankRow = searchRanks?.find((row) => row.keyword === keyword);
        const rankLabel =
          rankRow?.yourRank != null
            ? `#${rankRow.yourRank}`
            : rankRow?.yourRankBeyondTop20
              ? t("notInTop20")
              : null;
        const rankTone =
          rankRow?.yourRank != null && rankRow.yourRank <= 2
            ? "text-emerald-700 dark:text-emerald-400"
            : rankRow?.yourRank != null
              ? "text-amber-700 dark:text-amber-400"
              : "text-[var(--text-tertiary)]";

        return (
          <span
            key={keyword}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)]/70 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
          >
            <span className="truncate font-medium text-[var(--text-primary)]">{keyword}</span>
            {rankLabel && <span className={cn("shrink-0 font-bold tabular-nums", rankTone)}>{rankLabel}</span>}
          </span>
        );
      })}
    </div>
  );
}

function KeywordEvidenceTable({
  rows,
  t,
}: {
  rows: Array<{ keyword: string; rank: string; leaders?: string }>;
  t: (key: string) => string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="responsive-table-wrap rounded-lg border border-[var(--border)]">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]/50 text-left text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
            <th className="px-2.5 py-2">{t("keyword")}</th>
            <th className="px-2.5 py-2">{t("yourRank")}</th>
            <th className="px-2.5 py-2">{t("topThree")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.keyword} className="border-b border-[var(--border)]/60 last:border-0">
              <td className="px-2.5 py-2 font-medium text-[var(--text-primary)]">{row.keyword}</td>
              <td className="px-2.5 py-2 text-[var(--text-secondary)]">{row.rank}</td>
              <td className="px-2.5 py-2 text-[var(--text-secondary)]">{row.leaders || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function severityStripeColor(severity: string) {
  if (severity === "HIGH") return "bg-amber-500";
  if (severity === "LOW") return "bg-sky-400";
  return "bg-violet-500";
}

function SpotlightActionRow({
  item,
  t,
  branch,
  searchRanks,
  onAction,
}: {
  item: LocalSpotlightPlaybookItem;
  t: (key: string, values?: Record<string, string | number>) => string;
  branch?: LocalSpotlightBranchRow | null;
  searchRanks?: LocalSpotlightSearchRankRow[];
  onAction: () => void;
}) {
  const keywords = itemKeywords(item);
  const steps = parseRemediationSteps(item.message);
  const reasoning = item.reasoning ?? "";
  const keywordEvidence = buildKeywordEvidenceRows(keywords, searchRanks, reasoning, t);
  const evidenceBullets = buildEvidenceBullets(item, reasoning, keywordEvidence);
  const showScorecardTable = item.metricKey === "SCORECARD" && keywordEvidence.length > 0;
  const columnEvidenceBullets = showScorecardTable ? parseEvidenceSummaryTail(reasoning) : evidenceBullets;

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <div className="grid grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-12 lg:items-start lg:gap-x-3 hover:bg-[var(--surface-muted)]/25">
        <div className="flex min-w-0 gap-2 lg:col-span-2">
          <div className={cn("w-1 shrink-0 self-stretch rounded-full", severityStripeColor(item.severity))} />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {item.subCategory && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {item.subCategory}
                </span>
              )}
              <StatusBadge status={item.severity} className="shrink-0" />
            </div>
            <p className="text-sm font-semibold leading-snug text-[var(--text-primary)]">{item.title}</p>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("playbookSteps")}
          </p>
          {steps.length > 0 ? (
            <ol className="space-y-1">
              {steps.map((step, index) => (
                <li
                  key={`${item.id}-step-${index}`}
                  className="flex gap-1.5 text-xs leading-snug text-[var(--text-secondary)]"
                >
                  <span className="shrink-0 font-bold tabular-nums text-[var(--brand-text)]">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">—</span>
          )}
        </div>

        <div className="min-w-0 lg:col-span-2">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("playbookKeywords")}
          </p>
          {keywords.length > 0 ? (
            <KeywordRankChips keywords={keywords} searchRanks={searchRanks} t={t} />
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">—</span>
          )}
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
            {t("playbookEvidence")}
          </p>
          {columnEvidenceBullets.length > 0 ? (
            <EvidenceBulletList items={columnEvidenceBullets} />
          ) : showScorecardTable ? (
            <p className="text-xs text-[var(--text-tertiary)]">{t("playbookScorecardHint")}</p>
          ) : (
            <span className="text-xs text-[var(--text-tertiary)]">—</span>
          )}
        </div>

        <div className="flex lg:col-span-2 lg:justify-end">
          <SpotlightActionCta item={item} branch={branch} onAction={onAction} compact />
        </div>
      </div>

      {showScorecardTable && (
        <div className="border-t border-[var(--border)]/60 bg-[var(--surface-muted)]/20 px-4 py-2">
          <KeywordEvidenceTable rows={keywordEvidence} t={t} />
        </div>
      )}
    </div>
  );
}

function SpotlightActionPlanHeader({
  t,
}: {
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="hidden border-b border-[var(--border)] bg-[var(--brand-muted)] lg:grid lg:grid-cols-12 lg:gap-x-3 lg:px-4 lg:py-2">
      <div className={cn("lg:col-span-2", enterpriseTableHead)}>{t("playbookTable.action")}</div>
      <div className={cn("lg:col-span-3", enterpriseTableHead)}>{t("playbookSteps")}</div>
      <div className={cn("lg:col-span-2", enterpriseTableHead)}>{t("playbookKeywords")}</div>
      <div className={cn("lg:col-span-3", enterpriseTableHead)}>{t("playbookEvidence")}</div>
      <div className={cn("lg:col-span-2 text-right", enterpriseTableHead)}>{t("playbookTable.go")}</div>
    </div>
  );
}

export function SpotlightActionPlan({
  items,
  t,
  branch,
  searchRanks,
  onTabChange,
  onOpenBranch,
  onSyncGoogle,
  limit,
  title,
}: {
  items: LocalSpotlightPlaybookItem[];
  t: (key: string, values?: Record<string, string | number>) => string;
  branch?: LocalSpotlightBranchRow | null;
  searchRanks?: LocalSpotlightSearchRankRow[];
  onTabChange?: (tab: string) => void;
  onOpenBranch?: () => void;
  onSyncGoogle?: () => void;
  limit?: number;
  title?: string;
}) {
  const visible = limit != null ? items.slice(0, limit) : items;

  const runAction = (item: LocalSpotlightPlaybookItem) => {
    const target = resolveActionTarget(item);
    if (target.startsWith("tab:")) {
      const tab = target.slice(4);
      onTabChange?.(tab);
      if (tab === "branches") onOpenBranch?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target.startsWith("route:")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === "external:googleMaps") {
      if (branch?.googleMapsUrl) {
        window.open(branch.googleMapsUrl, "_blank", "noopener,noreferrer");
      } else {
        onTabChange?.("branches");
        onOpenBranch?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (target === "external:googleReviews") {
      if (branch?.googleReviewUrl) {
        window.open(branch.googleReviewUrl, "_blank", "noopener,noreferrer");
      } else {
        onTabChange?.("branches");
        onOpenBranch?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (target === "action:syncGoogle") {
      onSyncGoogle?.();
    }
  };

  const groupedSections = useMemo(() => {
    const map = new Map<string, LocalSpotlightPlaybookItem[]>();
    for (const item of visible) {
      const section = item.section ?? "CONTENT";
      if (!map.has(section)) map.set(section, []);
      map.get(section)!.push(item);
    }
    return PLAYBOOK_SECTION_ORDER.filter((section) => map.has(section)).map((section) => ({
      section,
      items: map.get(section)!,
      meta: PLAYBOOK_SECTION_META[section] ?? PLAYBOOK_SECTION_META.CONTENT,
    }));
  }, [visible]);

  if (visible.length === 0) {
    return null;
  }

  const goalMetrics = parseSnapshotMetrics(
    visible.find((item) => item.metricKey === "GOAL")?.reasoning ?? ""
  );

  const renderRows = (rows: LocalSpotlightPlaybookItem[]) =>
    rows.map((item) => (
      <SpotlightActionRow
        key={item.id}
        item={item}
        t={t}
        branch={branch}
        searchRanks={searchRanks}
        onAction={() => runAction(item)}
      />
    ));

  return (
    <EnterpriseTableShell
      title={title ?? t("tabs.playbook")}
      subtitle={limit == null ? t("playbookHint") : undefined}
      accent="brand"
    >
      {goalMetrics.length > 0 && limit == null && (
        <div className="flex flex-wrap gap-1.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/35 px-4 py-2.5">
          {goalMetrics.map((metric) => (
            <span
              key={metric}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
            >
              {metric}
            </span>
          ))}
        </div>
      )}

      <SpotlightActionPlanHeader t={t} />

      {limit != null ? (
        renderRows(visible)
      ) : (
        groupedSections.map(({ section, items: sectionItems, meta }) => {
          const SectionIcon = meta.icon;
          return (
            <div key={section}>
              <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)]/50 px-4 py-2">
                <SectionIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-text)]" />
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  {t(`playbookSections.${section}`)}
                </span>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                  {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                </span>
              </div>
              {renderRows(sectionItems)}
            </div>
          );
        })
      )}
    </EnterpriseTableShell>
  );
}

/** @deprecated Use SpotlightActionPlan */
export const SpotlightPlaybookTable = SpotlightActionPlan;

function inferActionTarget(item: LocalSpotlightPlaybookItem): string {
  if (item.actionTarget) {
    return item.actionTarget;
  }
  if (item.actionModule === "/admin/local-spotlight") {
    return "tab:search";
  }
  if (item.actionModule?.startsWith("/admin/")) {
    return `route:${item.actionModule}`;
  }
  if (item.metricKey === "REVIEWS" || item.metricKey === "RATING" || item.metricKey === "RECOVERY") {
    return "route:/admin/guest-voice";
  }
  if (item.metricKey === "COMPLETE" || item.metricKey === "PHOTOS") {
    return "tab:branches";
  }
  return "tab:search";
}

export { PulseStatCard };
