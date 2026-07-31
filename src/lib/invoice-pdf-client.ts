export type InvoicePdfDeliveryResult =
  | { method: "share" }
  | { method: "download" }
  | { method: "open" }
  | { method: "cancelled" };

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function openPdfBlobUrl(url: string) {
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
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

  // iOS/Android ignore <a download> for blob URLs — open the PDF so the user can save or share.
  if (isMobileDevice()) {
    openPdfBlobUrl(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return { method: "open" };
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { method: "download" };
}
