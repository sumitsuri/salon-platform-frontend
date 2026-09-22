import { SalesLead } from "@/modules/sales/api/salesApi";
import { isTerminalStage } from "@/modules/sales/lib/stage-utils";

/** Days with no lead update before it's flagged as stalled. */
const STALLED_DAYS_THRESHOLD = 5;
/** Window before a claim lapses where it's surfaced as urgent. */
const CLAIM_WARNING_HOURS = 48;

export type UrgencyReasonKey = "followUpDue" | "claimExpiring" | "stalled";

export interface UrgentLead {
  lead: SalesLead;
  reasonKey: UrgencyReasonKey;
  reasonLabel: string;
  /** Ascending — lower sorts first (more urgent). */
  score: number;
}

export const URGENCY_REASON_LABELS: Record<UrgencyReasonKey, string> = {
  followUpDue: "Follow-ups due",
  claimExpiring: "Claims expiring",
  stalled: "Stalled",
};

function hoursUntil(iso?: string): number | null {
  if (!iso) return null;
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * One urgency reason per lead (a lead can only need one next action at a time).
 * Priority order: overdue/due-today follow-ups, then lapsing claims, then stalled leads.
 * Score bands are offset so a merged, sorted queue keeps that same priority order.
 */
export function classifyLeadUrgency(lead: SalesLead): UrgentLead | null {
  if (isTerminalStage(lead.stage)) return null;

  const followUpHrs = hoursUntil(lead.nextFollowUpAt);
  if (followUpHrs != null && followUpHrs <= 24) {
    const overdueDays = Math.ceil(-followUpHrs / 24);
    return {
      lead,
      reasonKey: "followUpDue",
      reasonLabel: followUpHrs < 0 ? `Follow-up overdue by ${overdueDays}d` : "Follow-up due today",
      score: followUpHrs,
    };
  }

  const claimHrs = hoursUntil(lead.claimExpiresAt);
  if (claimHrs != null && claimHrs <= CLAIM_WARNING_HOURS && claimHrs > -24) {
    return {
      lead,
      reasonKey: "claimExpiring",
      reasonLabel: claimHrs <= 0 ? "Claim just expired" : `Claim expires in ${Math.max(1, Math.round(claimHrs))}h`,
      score: 1_000 + claimHrs,
    };
  }

  const idleDays = daysSince(lead.updatedAt);
  if (idleDays != null && idleDays >= STALLED_DAYS_THRESHOLD) {
    return {
      lead,
      reasonKey: "stalled",
      reasonLabel: `No update in ${Math.floor(idleDays)}d`,
      score: 3_000 - idleDays,
    };
  }

  return null;
}

export function buildMyDayQueue(leads: SalesLead[]): UrgentLead[] {
  return leads
    .map(classifyLeadUrgency)
    .filter((x): x is UrgentLead => x !== null)
    .sort((a, b) => a.score - b.score);
}

export function countByReason(queue: UrgentLead[]): Record<UrgencyReasonKey, number> {
  return queue.reduce(
    (acc, item) => {
      acc[item.reasonKey] += 1;
      return acc;
    },
    { followUpDue: 0, claimExpiring: 0, stalled: 0 } as Record<UrgencyReasonKey, number>
  );
}
