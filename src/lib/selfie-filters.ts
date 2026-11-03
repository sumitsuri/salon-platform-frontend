/** Live selfie looks. CSS filter strings are also what the canvas uses when the photo is saved. */

export const SELFIE_FILTERS = [
  { id: "normal", css: "none" },
  { id: "warm", css: "sepia(0.45) saturate(1.45) contrast(1.06) brightness(1.06)" },
  { id: "cool", css: "saturate(0.9) hue-rotate(28deg) contrast(1.08) brightness(1.05)" },
  { id: "mono", css: "grayscale(1) contrast(1.2) brightness(1.04)" },
  { id: "fade", css: "contrast(0.82) saturate(0.6) brightness(1.16)" },
  { id: "vivid", css: "saturate(1.85) contrast(1.14) brightness(1.02)" },
  { id: "glow", css: "brightness(1.2) saturate(1.15) contrast(0.9)" },
  { id: "drama", css: "contrast(1.45) saturate(0.7) brightness(0.9)" },
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
