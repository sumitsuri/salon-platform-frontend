import type { FaceCaptureZone, FaceConcernCode, FaceLightMode } from "@/lib/api";

export const FACE_CAPTURE_ZONES: FaceCaptureZone[] = [
  "FULL_FACE",
  "FOREHEAD",
  "LEFT_CHEEK",
  "RIGHT_CHEEK",
  "NOSE",
  "CHIN",
];

export const FACE_LIGHT_MODES: FaceLightMode[] = ["WHITE", "CROSS_POLARIZED", "UV"];

export const STAFF_FACE_CONCERN_OPTIONS: FaceConcernCode[] = [
  "OILY_SKIN",
  "DRY_DEHYDRATED",
  "REDNESS_SENSITIVITY",
  "UNEVEN_TEXTURE",
  "DULLNESS",
  "ACNE_BLEMISH",
  "COMBINATION_SKIN",
];

export const MIN_FACE_CAPTURES = 1;
