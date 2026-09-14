export type ManagerHomeWalkInMotionId =
  | "register-open"
  | "counter-spotlight"
  | "queue-heartbeat"
  | "receipt-stream"
  | "tap-to-bill"
  | "cash-ready"
  | "mint-ticket"
  | "live-floor"
  | "checkout-lane"
  | "front-desk-hero"
  | "terminal-ready"
  | "invoice-sweep"
  | "guest-arrived"
  | "bill-pipeline"
  | "settle-accent"
  | "shift-counter"
  | "service-desk"
  | "fast-checkout"
  | "open-visit-ring"
  | "collect-path";

export type ManagerHomeWalkInMotionOption = {
  id: ManagerHomeWalkInMotionId;
  label: string;
  hint: string;
};

export const MANAGER_HOME_WALKIN_MOTION_STORAGE_KEY = "manager-home-walkin-motion-v3";

export const MANAGER_HOME_WALKIN_MOTIONS: ManagerHomeWalkInMotionOption[] = [
  {
    id: "register-open",
    label: "01 · Emerald register",
    hint: "One soft green arc · full edge lap",
  },
  {
    id: "counter-spotlight",
    label: "02 · Pearl spotlight",
    hint: "Wide white highlight · slow lap",
  },
  {
    id: "queue-heartbeat",
    label: "03 · Queue pulse",
    hint: "Green arc · steady billing pulse",
  },
  {
    id: "receipt-stream",
    label: "04 · Slate receipt",
    hint: "Cool gray shimmer arc",
  },
  {
    id: "tap-to-bill",
    label: "05 · Tap to bill",
    hint: "Bright green arc · faster lap",
  },
  {
    id: "cash-ready",
    label: "06 · Cash ready",
    hint: "Gold-to-green gradient arc",
  },
  {
    id: "mint-ticket",
    label: "07 · Mint ticket",
    hint: "Mint arc on light ticket surface",
  },
  {
    id: "live-floor",
    label: "08 · Live floor",
    hint: "Live dot + green edge arc",
  },
  {
    id: "checkout-lane",
    label: "09 · Sky checkout",
    hint: "Sky-blue arc · path to payment",
  },
  {
    id: "front-desk-hero",
    label: "10 · Coral front desk",
    hint: "Coral arc on bright hero card",
  },
  {
    id: "terminal-ready",
    label: "11 · Terminal ready",
    hint: "Dark card · neon green arc",
  },
  {
    id: "invoice-sweep",
    label: "12 · Invoice silver",
    hint: "Silver-white arc · invoice cue",
  },
  {
    id: "guest-arrived",
    label: "13 · Peach welcome",
    hint: "Warm peach arc · guest arrived",
  },
  {
    id: "bill-pipeline",
    label: "14 · Bill pipeline",
    hint: "Long green arc · slow lap",
  },
  {
    id: "settle-accent",
    label: "15 · Settle gold",
    hint: "Dark green card · gold arc",
  },
  {
    id: "shift-counter",
    label: "16 · Teal shift",
    hint: "Teal arc · shift in progress",
  },
  {
    id: "service-desk",
    label: "17 · Amber service desk",
    hint: "Navy card · amber light arc",
  },
  {
    id: "fast-checkout",
    label: "18 · Fast checkout",
    hint: "Tight green arc · quick lap",
  },
  {
    id: "open-visit-ring",
    label: "19 · Open visit",
    hint: "Emerald arc · new visit cue",
  },
  {
    id: "collect-path",
    label: "20 · Collect path",
    hint: "Teal→green arc · collect later",
  },
];

export const DEFAULT_MANAGER_HOME_WALKIN_MOTION: ManagerHomeWalkInMotionId = "service-desk";

export function isManagerHomeWalkInMotionId(value: string): value is ManagerHomeWalkInMotionId {
  return MANAGER_HOME_WALKIN_MOTIONS.some((m) => m.id === value);
}

export function normalizeManagerHomeWalkInMotion(stored: string | null): ManagerHomeWalkInMotionId {
  if (stored && isManagerHomeWalkInMotionId(stored)) return stored;
  return DEFAULT_MANAGER_HOME_WALKIN_MOTION;
}

export const MANAGER_HOME_QUICK_ACTIONS_THEME = "salon-classic" as const;
