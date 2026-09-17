import type { ScratchCardStatus } from "@/lib/api";

/** Scratch attempt on this bill is done (no second card or re-scratch). */
export function isScratchAttemptFinished(status?: ScratchCardStatus): boolean {
  return status === "REDEEMED" || status === "SCRATCHED" || status === "EXPIRED";
}

export function canResumeScratchSession(status?: ScratchCardStatus): boolean {
  return status === "ISSUED" || status === "UNLOCKED";
}
