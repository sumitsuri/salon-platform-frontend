export type ShareOutcome = "shared" | "downloaded" | "cancelled";

function fileName(headline: string, type: string) {
  const base = headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "offer";
  return `${base}.${type.includes("png") ? "png" : "jpg"}`;
}

export function downloadPoster(blob: Blob, headline: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(headline, blob.type);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends the poster and its message on to WhatsApp. On phones the system share sheet attaches the image and the
 * text, so the owner just picks WhatsApp and a group. Where file sharing is not available (most desktops) the poster
 * is downloaded, the message copied, and WhatsApp opened so they can attach and paste.
 */
export async function sharePosterToWhatsApp(blob: Blob, headline: string, caption: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName(headline, blob.type), { type: blob.type || "image/jpeg" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      // Fall through to the download route if the share sheet failed for another reason.
    }
  }
  downloadPoster(blob, headline);
  await copyText(caption);
  window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
  return "downloaded";
}
