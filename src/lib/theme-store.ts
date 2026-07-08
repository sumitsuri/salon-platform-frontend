"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_BOOT_SCRIPT } from "./theme-boot";

export const ACCENT_PRESETS = [
  { id: "indigo", label: "Indigo", color: "#4f46e5" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "amber", label: "Amber", color: "#d97706" },
] as const;

export interface ThemeSettings {
  darkMode: boolean;
  customAccentEnabled: boolean;
  customAccentColor: string;
}

interface ThemeStore extends ThemeSettings {
  hydrated: boolean;
  setDarkMode: (enabled: boolean) => void;
  setCustomAccentEnabled: (enabled: boolean) => void;
  setCustomAccentColor: (color: string) => void;
  resetTheme: () => void;
}

const DEFAULTS: ThemeSettings = {
  darkMode: false,
  customAccentEnabled: false,
  customAccentColor: ACCENT_PRESETS[0].color,
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      setDarkMode: (darkMode) => set({ darkMode }),
      setCustomAccentEnabled: (customAccentEnabled) => set({ customAccentEnabled }),
      setCustomAccentColor: (customAccentColor) => set({ customAccentColor }),
      resetTheme: () => set({ ...DEFAULTS }),
    }),
    {
      name: "salon-theme",
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    }
  )
);

export function useThemeHydrated() {
  return useThemeStore((s) => s.hydrated);
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

function hexToRgb(hex: string) {
  const h = (hex || "#4f46e5").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return { r: 79, g: 70, b: 229 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("")}`;
}

export function darken(hex: string, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

export function lighten(hex: string, amount = 0.85) {
  const { r, g, b } = hexToRgb(hex);
  const f = amount;
  return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/** WCAG relative luminance — values above ~0.45 read as "light". */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rs, gs, bs] = [r, g, b].map(transform);
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.45;
}

/** Darken until accent is always suitable for white text on buttons/hero. */
export function ensureReadableAccent(hex: string): string {
  let color = hex || ACCENT_PRESETS[0].color;
  let guard = 0;
  while (isLightColor(color) && guard < 12) {
    color = darken(color, 0.12);
    guard++;
  }
  return color;
}

export function resolveAccentColor(
  settings: ThemeSettings,
  tenantColor?: string | null
): string {
  const raw = settings.customAccentEnabled
    ? settings.customAccentColor
    : tenantColor || ACCENT_PRESETS[0].color;
  return ensureReadableAccent(raw);
}

export function applyThemeToDocument(
  settings: ThemeSettings,
  tenantColor?: string | null
) {
  const root = document.documentElement;
  const accent = resolveAccentColor(settings, tenantColor);
  const accentDark = darken(accent, 0.22);
  const accentText = isLightColor(accent) ? darken(accent, 0.55) : accent;
  const isDark = settings.darkMode;

  root.dataset.theme = isDark ? "dark" : "light";
  root.style.setProperty("--brand", accent);
  root.style.setProperty("--brand-dark", accentDark);
  root.style.setProperty("--brand-text", accentText);
  root.style.setProperty("--brand-on-brand", "#ffffff");
  root.style.setProperty(
    "--brand-light",
    isDark ? `color-mix(in srgb, ${accent} 20%, #0f172a)` : lighten(accent, 0.9)
  );
  root.style.setProperty("--brand-muted", isDark ? `${accent}33` : `${accent}1f`);
  root.style.setProperty("--brand-ring", `${accent}55`);
  root.style.setProperty("--hero-from", accent);
  root.style.setProperty("--hero-to", darken(accent, 0.32));
  root.style.setProperty("--hero-text", "#ffffff");
}

/** Inline boot script — must mirror applyThemeToDocument for no flash. */
export function buildThemeBootScript(): string {
  return THEME_BOOT_SCRIPT;
}
