"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Hourglass, Plus, Sparkles } from "lucide-react";
import { SalesLead } from "@/modules/sales/api/salesApi";
import { StagePill } from "@/modules/sales/components/SalesLeadsTable";
import {
  UrgencyReasonKey,
  URGENCY_REASON_LABELS,
  buildMyDayQueue,
  countByReason,
} from "@/modules/sales/lib/lead-urgency";
import { salesLeadDetailHref } from "@/modules/sales/lib/lead-routes";
import { btnPrimarySm, Card, EmptyState, ListRow } from "@/components/ui";
import { cn } from "@/lib/utils";

const REASON_ICONS: Record<UrgencyReasonKey, typeof CalendarClock> = {
  followUpDue: CalendarClock,
  claimExpiring: Hourglass,
  stalled: AlertTriangle,
};

interface SalesMyDayViewProps {
  leads: SalesLead[];
  isLoading?: boolean;
  onAddLead?: () => void;
}

export function SalesMyDayView({ leads, isLoading, onAddLead }: SalesMyDayViewProps) {
  const router = useRouter();
  const [reasonFilter, setReasonFilter] = useState<UrgencyReasonKey | "all">("all");

  const queue = useMemo(() => buildMyDayQueue(leads), [leads]);
  const counts = useMemo(() => countByReason(queue), [queue]);
  const visibleQueue = useMemo(
    () => (reasonFilter === "all" ? queue : queue.filter((q) => q.reasonKey === reasonFilter)),
    [queue, reasonFilter]
  );

  const chips: { id: UrgencyReasonKey | "all"; label: string }[] = [
    { id: "all", label: `All (${queue.length})` },
    { id: "followUpDue", label: `${URGENCY_REASON_LABELS.followUpDue} (${counts.followUpDue})` },
    { id: "claimExpiring", label: `${URGENCY_REASON_LABELS.claimExpiring} (${counts.claimExpiring})` },
    { id: "stalled", label: `${URGENCY_REASON_LABELS.stalled} (${counts.stalled})` },
  ];

  return (
    <div className="space-y-3" data-testid="sales-my-day-view">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Today&apos;s queue</h2>
          {onAddLead && (
            <button type="button" className={cn(btnPrimarySm, "shrink-0")} onClick={onAddLead}>
              <Plus className="h-3.5 w-3.5" />
              Add lead
            </button>
          )}
        </div>

        <div className="mb-2 flex gap-1.5 overflow-x-auto overscroll-x-contain no-scrollbar pb-1 sm:flex-wrap sm:overflow-visible">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setReasonFilter(chip.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-xs font-semibold border touch-manipulation min-h-[40px]",
                reasonFilter === chip.id
                  ? "bg-[var(--brand)] text-[var(--brand-on-brand)] border-[var(--brand)]"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading your queue…</Card>
        ) : visibleQueue.length === 0 ? (
          <Card padding={false}>
            <EmptyState
              icon={Sparkles}
              title={queue.length === 0 ? "Nothing urgent right now" : "Nothing in this filter"}
              description={queue.length === 0 ? "Find your next lead above." : "Try another filter."}
            />
          </Card>
        ) : (
          <Card padding={false} className="divide-y divide-[var(--border)]">
            {visibleQueue.map(({ lead, reasonLabel, reasonKey }) => {
              const Icon = REASON_ICONS[reasonKey];
              return (
                <ListRow
                  key={lead.id}
                  onClick={() => router.push(salesLeadDetailHref(lead.id))}
                  title={lead.businessName}
                  subtitle={`${lead.contactName} · ${lead.phone}`}
                  meta={
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        reasonKey === "followUpDue" && "bg-[var(--brand-light)] text-[var(--brand-text)]",
                        reasonKey === "claimExpiring" && "bg-amber-100 text-amber-700",
                        reasonKey === "stalled" && "bg-red-100 text-red-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  }
                  trailing={
                    <div className="space-y-1">
                      <StagePill stage={lead.stage} />
                      <p className="text-[11px] font-medium text-[var(--text-secondary)]">{reasonLabel}</p>
                    </div>
                  }
                />
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
