import type { ScalpCaptureZone, ScalpConcernCode, ScalpLightMode } from "@/lib/api";

export const SCALP_CAPTURE_ZONES: ScalpCaptureZone[] = [
  "CROWN",
  "HAIRLINE",
  "PARTING",
  "LEFT_TEMPLE",
  "RIGHT_TEMPLE",
];

export const SCALP_LIGHT_MODES: ScalpLightMode[] = ["WHITE", "CROSS_POLARIZED", "UV"];

export const STAFF_CONCERN_OPTIONS: ScalpConcernCode[] = [
  "DANDRUFF",
  "OILY_SCALP",
  "DRY_SCALP",
  "SCALP_IRRITATION",
  "HAIR_THINNING",
  "HAIR_BREAKAGE",
  "PRODUCT_BUILDUP",
];

export const MIN_CAPTURES = 1;
