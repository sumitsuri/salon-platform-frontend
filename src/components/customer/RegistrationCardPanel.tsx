"use client";

import { useRef } from "react";
import { Download, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CustomerRegistrationCard } from "@/lib/api";
import { btnPrimary, btnSecondary } from "@/components/ui";

interface RegistrationCardPanelProps {
  card: CustomerRegistrationCard;
  onContinue?: () => void;
  continueLabel?: string;
}

function formatPhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

function formatIssued(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildPassSvg(card: CustomerRegistrationCard) {
  const color = card.primaryColor && /^#[0-9a-fA-F]{6}$/.test(card.primaryColor) ? card.primaryColor : "#6366f1";
  const lines = [
    card.tenantName ?? "Visit Pass",
    card.branchName ?? "",
    card.visitPassId,
    card.customerName,
    card.phone ? formatPhone(card.phone) ?? "" : "",
  ].map(escapeXml);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
  <rect width="400" height="520" fill="#ffffff"/>
  <rect width="400" height="96" fill="${color}"/>
  <text x="24" y="40" fill="#ffffff" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${lines[0]}</text>
  <text x="24" y="64" fill="#ffffff" font-family="system-ui,sans-serif" font-size="12" opacity="0.9">${lines[1]}</text>
  <text x="200" y="150" fill="#78716c" font-family="system-ui,sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="2">VISIT PASS</text>
  <text x="200" y="210" fill="#1c1917" font-family="ui-monospace,monospace" font-size="28" font-weight="700" text-anchor="middle">${lines[2]}</text>
  <text x="200" y="260" fill="#1c1917" font-family="system-ui,sans-serif" font-size="18" font-weight="600" text-anchor="middle">${lines[3]}</text>
  <text x="200" y="290" fill="#57534e" font-family="system-ui,sans-serif" font-size="14" text-anchor="middle">${lines[4]}</text>
</svg>`;
}

export function RegistrationCardPanel({ card, onContinue, continueLabel }: RegistrationCardPanelProps) {
  const t = useTranslations("manager.walkIn");
  const cardRef = useRef<HTMLDivElement>(null);
  const brandColor = card.primaryColor || "var(--brand)";

  const shareText = [
    card.tenantName,
    card.branchName,
    `${t("visitPassLabel")}: ${card.visitPassId}`,
    card.customerName,
    card.phone ? formatPhone(card.phone) : null,
    card.publicPassUrl,
  ]
    .filter(Boolean)
    .join("\n");

  async function downloadCard() {
    const svg = buildPassSvg(card);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const link = document.createElement("a");
    link.download = `visit-pass-${card.visitPassId.replace(/[^a-zA-Z0-9-]/g, "")}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function shareCard() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${card.tenantName ?? "Visit Pass"} — ${card.visitPassId}`,
          text: shareText,
          url: card.publicPassUrl,
        });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm bg-white text-stone-900"
      >
        <div
          className="px-5 py-4 text-white"
          style={{ background: `linear-gradient(135deg, ${brandColor}, color-mix(in srgb, ${brandColor} 72%, black))` }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">{card.tenantName}</p>
          {card.branchName && <p className="text-sm opacity-90 mt-0.5">{card.branchName}</p>}
        </div>
        <div className="px-5 py-6 space-y-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-500">{t("visitPassTitle")}</p>
          <p className="text-3xl font-bold font-mono tracking-wide text-stone-900">{card.visitPassId}</p>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-stone-800">{card.customerName}</p>
            {card.phone && (
              <p className="text-sm text-stone-600">{formatPhone(card.phone)}</p>
            )}
          </div>
          {card.branchAddress && (
            <p className="text-xs text-stone-500 leading-relaxed">{card.branchAddress}</p>
          )}
          <p className="text-xs text-stone-500 leading-relaxed px-2">{t("visitPassHint")}</p>
          {formatIssued(card.issuedAt) && (
            <p className="text-[11px] text-stone-400">{t("visitPassIssued", { date: formatIssued(card.issuedAt) })}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" className={`${btnSecondary} flex-1 touch-manipulation`} onClick={() => void shareCard()}>
          <Share2 className="w-4 h-4" />
          {t("shareVisitPass")}
        </button>
        <button type="button" className={`${btnSecondary} flex-1 touch-manipulation`} onClick={() => void downloadCard()}>
          <Download className="w-4 h-4" />
          {t("downloadVisitPass")}
        </button>
      </div>

      {onContinue && (
        <button type="button" className={`${btnPrimary} w-full touch-manipulation`} onClick={onContinue}>
          {continueLabel ?? t("continueToServices")}
        </button>
      )}
    </div>
  );
}
