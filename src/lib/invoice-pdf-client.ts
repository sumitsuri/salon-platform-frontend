export type InvoicePdfDeliveryResult =
  | { method: "share" }
  | { method: "download" }
  | { method: "open" }
  | { method: "cancelled" };

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Trigger download/open via a transient anchor — never mutates the current route. */
function deliverBlobViaAnchor(url: string, filename: string, mode: "download" | "new-tab"): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  if (mode === "new-tab") {
    anchor.target = "_blank";
  } else {
    anchor.download = filename;
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function deliverInvoicePdf(
  blob: Blob,
  filename: string,
  options?: {
    title?: string;
    text?: string;
    action?: "auto" | "download" | "share";
  },
): Promise<InvoicePdfDeliveryResult> {
  const action = options?.action ?? "auto";
  const file = new File([blob], filename, { type: "application/pdf" });
  const wantsShare = action === "share" || action === "auto";

  if (
    wantsShare &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: options?.title ?? "Bill",
        text: options?.text,
      });
      return { method: "share" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { method: "cancelled" };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const revokeLater = () => window.setTimeout(() => URL.revokeObjectURL(url), 120_000);

  // iOS ignores <a download> on blob URLs — open in a new tab so the walk-in flow stays put.
  if (isIOS() || (action !== "download" && isMobileDevice())) {
    deliverBlobViaAnchor(url, filename, "new-tab");
    revokeLater();
    return { method: "open" };
  }

  deliverBlobViaAnchor(url, filename, "download");
  revokeLater();
  return { method: "download" };
}
