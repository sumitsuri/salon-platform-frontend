"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/lib/use-scroll-lock";
import type { MobileMoreNavSection } from "@/components/app-nav";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  sections: MobileMoreNavSection[];
  brandName?: string;
  brandSubtitle?: string;
};

export function MobileMoreMenuSheet({ open, onClose, title, sections, brandName, brandSubtitle }: Props) {
  const tCommon = useTranslations("common");
  useScrollLock(open);

  return (
    <>
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[140] bg-black/40 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-[150] flex max-h-[min(85dvh,560px)] flex-col rounded-t-2xl border-t border-[var(--border-brand)] bg-[var(--surface)] shadow-2xl transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full pointer-events-none",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        data-testid="mobile-more-menu"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
            {brandName ? (
              <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                {brandName}
                {brandSubtitle ? ` · ${brandSubtitle}` : ""}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] touch-manipulation shrink-0"
            aria-label={tCommon("closeMenu")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-4">
          {sections.map((section) => (
            <div key={section.id}>
              <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {section.label}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      onClick={onClose}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3 min-h-[5.25rem] touch-manipulation transition hover:border-[var(--brand)]/35 hover:bg-[var(--brand-light)]/25 active:scale-[0.98]"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border-brand)] text-[var(--brand-text)] shadow-sm">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-bold text-[var(--text-primary)] leading-snug">{link.label}</span>
                      {link.description ? (
                        <span className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-snug -mt-1">
                          {link.description}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
