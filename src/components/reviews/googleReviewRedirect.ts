/** Open Google review URL without losing the user-gesture chain (mobile popup blockers). */
export function preOpenGoogleReviewTab(): Window | null {
  if (typeof window === "undefined") return null;
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

export function navigateGoogleReviewTab(tab: Window | null, url: string): boolean {
  if (!tab || tab.closed) return false;
  try {
    tab.location.href = url;
    tab.focus?.();
    return true;
  } catch {
    return false;
  }
}

export function closeGoogleReviewTab(tab: Window | null) {
  if (!tab || tab.closed) return;
  try {
    tab.close();
  } catch {
    /* ignore */
  }
}

export async function copyReviewDraft(text: string | null | undefined) {
  if (!text || typeof navigator === "undefined") return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard may be denied on mobile — non-blocking */
  }
}
