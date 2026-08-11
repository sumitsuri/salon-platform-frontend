export type CustomerLookupField = "phone" | "visitPass";

export type AutoFilledLookupFields = {
  phone: boolean;
  visitPass: boolean;
};

/** Increment to invalidate in-flight customer lookups. Returns the new generation. */
export function bumpLookupGeneration(generationRef: { current: number }) {
  generationRef.current += 1;
  return generationRef.current;
}

/** True when an async lookup completed after the session was invalidated. */
export function isLookupGenerationStale(
  generationRef: { current: number },
  generationAtStart: number
) {
  return generationRef.current !== generationAtStart;
}

export function emptyAutoFilledFields(): AutoFilledLookupFields {
  return { phone: false, visitPass: false };
}

/**
 * Pick which identifier drives lookup. Uses the field the user edited last;
 * falls back to whichever valid identifier remains.
 */
export function resolveLookupField(
  searchField: CustomerLookupField | null,
  phoneValid: boolean,
  passValid: boolean
): CustomerLookupField | null {
  if (searchField === "phone" && phoneValid) return "phone";
  if (searchField === "visitPass" && passValid) return "visitPass";
  if (phoneValid) return "phone";
  if (passValid) return "visitPass";
  return null;
}
