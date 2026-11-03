/** Live selfie looks. CSS filter strings are also what the canvas uses when the photo is saved. */

export const SELFIE_FILTERS = [
  { id: "normal", css: "none" },
  { id: "warm", css: "sepia(0.35) saturate(1.35) contrast(1.05) brightness(1.04)" },
  { id: "cool", css: "saturate(0.85) hue-rotate(18deg) contrast(1.05) brightness(1.06)" },
  { id: "mono", css: "grayscale(1) contrast(1.15) brightness(1.02)" },
  { id: "fade", css: "contrast(0.88) saturate(0.72) brightness(1.12)" },
  { id: "vivid", css: "saturate(1.65) contrast(1.12)" },
  { id: "glow", css: "brightness(1.16) saturate(1.2) contrast(0.92)" },
  { id: "drama", css: "contrast(1.4) saturate(0.78) brightness(0.92)" },
] as const;

export type SelfieFilterId = (typeof SELFIE_FILTERS)[number]["id"];

export function selfieFilterCss(id: SelfieFilterId): string {
  return SELFIE_FILTERS.find((filter) => filter.id === id)?.css ?? "none";
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("PHOTO_DECODE_FAILED"));
    img.src = dataUrl;
  });
}

/**
 * Bake the selected look into the jpeg the punch uploads.
 * The on-screen preview is mirrored separately; the file stays the real camera orientation.
 * If the browser cannot apply canvas filters, the original frame is returned so punch still works.
 */
export async function bakeSelfieJpeg(dataUrl: string, filterId: SelfieFilterId): Promise<string> {
  if (filterId === "normal") return dataUrl;
  const css = selfieFilterCss(filterId);
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) return dataUrl;
  try {
    ctx.filter = css;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
  } catch {
    ctx.filter = "none";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL("image/jpeg", 0.85);
}
