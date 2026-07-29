"use client";

import { useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { LeadStage } from "@/modules/sales/api/salesApi";
import {
  getAvailableStageActions,
  getStageRequirements,
  STAGE_DESCRIPTIONS,
  StageAction,
} from "@/modules/sales/lib/stage-utils";
import { SideSheet, btnPrimary, btnSecondary, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";

interface StageActionPanelProps {
  currentStage: LeadStage;
  activityCount: number;
  onAdvance: (stage: LeadStage, notes?: string, lostReason?: string) => void;
  isPending?: boolean;
}

export function StageActionPanel({
  currentStage,
  activityCount,
  onAdvance,
  isPending,
}: StageActionPanelProps) {
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [confirmAction, setConfirmAction] = useState<StageAction | null>(null);
  const [notes, setNotes] = useState("");

  const actions = getAvailableStageActions(currentStage, activityCount);
  const requirements = getStageRequirements(
    actions.find((a) => a.variant === "primary")?.stage ?? currentStage
  );

  if (currentStage === "WON" || currentStage === "LOST") {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg bg-[var(--brand-light)] px-4 py-3 dark:bg-[color-mix(in_srgb,var(--brand)_20%,transparent)]">
          <p className="text-sm font-medium text-[var(--brand-text)]">
            You are here: {STAGE_DESCRIPTIONS[currentStage]}
          </p>
          {requirements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-xs text-[var(--brand-text)] dark:text-[var(--brand-text)]">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]">
            What&apos;s next?
          </p>
          {actions.map((action) => (
            <button
              key={`${action.stage}-${action.label}`}
              type="button"
              disabled={isPending}
              onClick={() => {
                if (action.stage === "LOST") {
                  setLostOpen(true);
                } else {
                  setConfirmAction(action);
                }
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:shadow-sm",
                action.variant === "primary" &&
                  "border-[var(--brand-ring)] bg-white hover:border-[var(--brand)] dark:bg-[var(--surface)]",
                action.variant === "secondary" &&
                  "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--brand-ring)]",
                action.variant === "danger" &&
                  "border-red-200 bg-red-50/50 hover:border-red-300 dark:bg-red-950/20"
              )}
            >
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    action.variant === "danger" ? "text-red-700" : "text-[var(--ink)]"
                  )}
                >
                  {action.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{action.description}</p>
              </div>
              {action.variant !== "danger" && (
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand-text)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <SideSheet
        open={lostOpen}
        onClose={() => {
          setLostOpen(false);
          setLostReason("");
        }}
        title="Mark lead as lost"
        subtitle="Help the team learn — why isn't this lead moving forward?"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setLostOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!lostReason.trim() || isPending}
              onClick={() => {
                onAdvance("LOST", undefined, lostReason.trim());
                setLostOpen(false);
                setLostReason("");
              }}
            >
              Confirm lost
            </button>
          </>
        }
      >
        <label className="block text-sm">
          Lost reason <span className="text-red-500">*</span>
          <textarea
            className={`${inputClass} mt-1.5`}
            rows={4}
            placeholder="e.g. Already using competitor, budget constraints, not interested…"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
          />
        </label>
      </SideSheet>

      <SideSheet
        open={!!confirmAction}
        onClose={() => {
          setConfirmAction(null);
          setNotes("");
        }}
        title={confirmAction?.label ?? "Confirm stage change"}
        subtitle={confirmAction?.description}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={
                isPending ||
                (confirmAction?.requiresNotes && !notes.trim())
              }
              onClick={() => {
                if (confirmAction) {
                  onAdvance(confirmAction.stage, notes || undefined);
                  setConfirmAction(null);
                  setNotes("");
                }
              }}
            >
              Confirm move
            </button>
          </>
        }
      >
        <label className="block text-sm">
          {confirmAction?.requiresNotes ? (
            <>
              Deal notes <span className="text-red-500">*</span>
            </>
          ) : (
            "Notes (optional)"
          )}
          <textarea
            className={`${inputClass} mt-1.5`}
            rows={3}
            placeholder={
              confirmAction?.requiresNotes
                ? "e.g. Customer agreed to Growth plan at ₹4,999/mo…"
                : "What happened in this step?"
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </SideSheet>
    </>
  );
}
