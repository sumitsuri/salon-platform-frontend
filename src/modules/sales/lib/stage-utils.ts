import { ActivityType, LeadStage, STAGES } from "@/modules/sales/api/salesApi";

/** All 8 pipeline stages in order (including terminal WON/LOST). */
export const PIPELINE_STAGES: LeadStage[] = STAGES;

export const ACTIVE_PIPELINE_STAGES: LeadStage[] = STAGES.filter(
  (s) => s !== "WON" && s !== "LOST"
);

export const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PITCHED: "Pitched",
  INTERESTED: "Interested",
  FREE_TRIAL: "Free Trial",
  WON: "Won",
  LOST: "Lost",
};

export const STAGE_DESCRIPTIONS: Record<LeadStage, string> = {
  NEW: "Lead captured — schedule first touch",
  CONTACTED: "First call or visit done",
  QUALIFIED: "Locality, use case, and type confirmed",
  PITCHED: "Product demo or pitch delivered",
  INTERESTED: "Prospect wants to proceed",
  FREE_TRIAL: "Trial intent recorded — admin will provision",
  WON: "Converted to paying customer",
  LOST: "Not moving forward",
};

export const TERMINAL_STAGES: LeadStage[] = ["WON", "LOST"];

export function isTerminalStage(stage: LeadStage): boolean {
  return stage === "WON" || stage === "LOST";
}

export interface StageAction {
  stage: LeadStage;
  label: string;
  description: string;
  variant: "primary" | "secondary" | "danger";
  requiresNotes?: boolean;
}

function stageIndex(stage: LeadStage): number {
  return PIPELINE_STAGES.indexOf(stage);
}

/** Valid forward moves from the current stage (mirrors backend rules). */
export function getAvailableStageActions(
  current: LeadStage,
  activityCount: number
): StageAction[] {
  if (current === "WON" || current === "LOST") return [];

  const idx = stageIndex(current);
  if (idx === -1) return [];

  const actions: StageAction[] = [];
  const next = PIPELINE_STAGES[idx + 1];

  if (next && next !== "LOST") {
    actions.push({
      stage: next,
      label: `Move to ${STAGE_LABELS[next]}`,
      description: STAGE_DESCRIPTIONS[next],
      variant: "primary",
      requiresNotes: next === "WON",
    });
  }

  // NEW can skip CONTACTED when first touch was a pitch visit
  if (current === "NEW" && activityCount > 0) {
    actions.push({
      stage: "QUALIFIED",
      label: "Skip to Qualified",
      description: "Use when your first touch was a full pitch visit",
      variant: "secondary",
    });
  }

  actions.push({
    stage: "LOST",
    label: "Mark as Lost",
    description: "Record why this lead is not proceeding",
    variant: "danger",
  });

  return actions.filter(
    (a, i, arr) => arr.findIndex((x) => x.stage === a.stage) === i
  );
}

export function getStageRequirements(stage: LeadStage): string[] {
  switch (stage) {
    case "CONTACTED":
      return ["Log at least one visit, call, or WhatsApp activity"];
    case "QUALIFIED":
      return ["Locality filled in", "Use case filled in", "Lead type selected"];
    case "PITCHED":
      return ["Log a pitch or demo activity (recommended)"];
    case "INTERESTED":
      return ["Confirm prospect intent in activity notes"];
    case "FREE_TRIAL":
      return ["Prospect agreed to trial — admin will set up account later"];
    case "WON":
      return ["Add deal notes — customer agreed to subscribe"];
    default:
      return [];
  }
}

export const ACTIVITY_SUGGESTIONS: Partial<Record<LeadStage, ActivityType>> = {
  NEW: "VISIT",
  CONTACTED: "CALL",
  QUALIFIED: "NOTE",
  PITCHED: "PITCH",
  INTERESTED: "WHATSAPP",
  FREE_TRIAL: "NOTE",
  WON: "NOTE",
};
