"use client";

import { useEffect, useState } from "react";
import { Moon, Palette, RotateCcw, Sun, X } from "lucide-react";
import {
  ACCENT_PRESETS,
  applyThemeToDocument,
  ensureReadableAccent,
  resolveAccentColor,
  useThemeStore,
} from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary } from "@/components/ui";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors shrink-0",
        enabled ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
          enabled && "translate-x-5"
        )}
      />
    </button>
  );
}

function ThemePreview({
  darkMode,
  accent,
}: {
  darkMode: boolean;
  accent: string;
}) {
  const surface = darkMode ? "#1e293b" : "#ffffff";
  const muted = darkMode ? "#0f172a" : "#f8fafc";
  const text = darkMode ? "#f1f5f9" : "#0f172a";
  const subtext = darkMode ? "#94a3b8" : "#64748b";
  const border = darkMode ? "#334155" : "#e2e8f0";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: muted, borderColor: border }}
    >
      <div className="px-3 py-2 flex items-center gap-2 border-b" style={{ borderColor: border, background: surface }}>
        <div className="w-6 h-6 rounded-lg text-[10px] font-bold text-white flex items-center justify-center" style={{ background: accent }}>
          S
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold truncate" style={{ color: text }}>Salon Platform</p>
          <p className="text-[9px] truncate" style={{ color: subtext }}>Live preview</p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: darkMode ? "#334155" : "#f1f5f9" }}>
          <div className="flex-1 text-center py-1.5 rounded-md text-[9px] font-semibold text-white" style={{ background: accent }}>
            Active
          </div>
          <div className="flex-1 text-center py-1.5 text-[9px] font-medium" style={{ color: subtext }}>
            Tab
          </div>
        </div>
        <div className="rounded-lg p-2.5 border" style={{ background: surface, borderColor: border }}>
          <p className="text-[10px] font-semibold" style={{ color: text }}>₹1,416</p>
          <p className="text-[9px]" style={{ color: subtext }}>Facial Classic · Completed</p>
        </div>
        <button
          type="button"
          className="w-full py-2 rounded-lg text-[10px] font-semibold text-white"
          style={{ background: accent }}
        >
          Primary action
        </button>
      </div>
    </div>
  );
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const tenantColor = useAuthStore((s) => s.user?.primaryColor);
  const darkMode = useThemeStore((s) => s.darkMode);
  const customAccentEnabled = useThemeStore((s) => s.customAccentEnabled);
  const customAccentColor = useThemeStore((s) => s.customAccentColor);
  const setDarkMode = useThemeStore((s) => s.setDarkMode);
  const setCustomAccentEnabled = useThemeStore((s) => s.setCustomAccentEnabled);
  const setCustomAccentColor = useThemeStore((s) => s.setCustomAccentColor);
  const resetTheme = useThemeStore((s) => s.resetTheme);

  const [previewDark, setPreviewDark] = useState(darkMode);
  const [previewAccentEnabled, setPreviewAccentEnabled] = useState(customAccentEnabled);
  const [previewAccentColor, setPreviewAccentColor] = useState(customAccentColor);

  useEffect(() => {
    if (open) {
      setPreviewDark(darkMode);
      setPreviewAccentEnabled(customAccentEnabled);
      setPreviewAccentColor(customAccentColor);
    }
  }, [open, darkMode, customAccentEnabled, customAccentColor]);

  const previewAccent = ensureReadableAccent(
    resolveAccentColor(
      { darkMode: previewDark, customAccentEnabled: previewAccentEnabled, customAccentColor: previewAccentColor },
      tenantColor
    )
  );

  function applySettings() {
    const safeColor = ensureReadableAccent(previewAccentColor);
    setDarkMode(previewDark);
    setCustomAccentEnabled(previewAccentEnabled);
    setCustomAccentColor(safeColor);
    applyThemeToDocument(
      { darkMode: previewDark, customAccentEnabled: previewAccentEnabled, customAccentColor: safeColor },
      tenantColor
    );
    onClose();
  }

  function handleReset() {
    resetTheme();
    setPreviewDark(false);
    setPreviewAccentEnabled(false);
    setPreviewAccentColor(ACCENT_PRESETS[0].color);
    applyThemeToDocument(
      { darkMode: false, customAccentEnabled: false, customAccentColor: ACCENT_PRESETS[0].color },
      tenantColor
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close settings" />
      <div className="relative w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="font-bold text-[var(--text-primary)]">Settings</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Appearance & theme</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center">
                  {previewDark ? <Moon className="w-4 h-4 text-[var(--text-primary)]" /> : <Sun className="w-4 h-4 text-[var(--text-primary)]" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Dark mode</p>
                  <p className="text-xs text-[var(--text-secondary)]">Easier on eyes in low light</p>
                </div>
              </div>
              <Toggle enabled={previewDark} onChange={setPreviewDark} label="Toggle dark mode" />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-muted)] flex items-center justify-center">
                  <Palette className="w-4 h-4 text-[var(--text-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Custom accent color</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {previewAccentEnabled ? "Using your pick" : `Using brand default${tenantColor ? "" : " (indigo)"}`}
                  </p>
                </div>
              </div>
              <Toggle enabled={previewAccentEnabled} onChange={setPreviewAccentEnabled} label="Toggle custom accent" />
            </div>

            {previewAccentEnabled && (
              <div className="space-y-3 pl-12">
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPreviewAccentColor(preset.color)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition scale-100 hover:scale-110",
                        previewAccentColor === preset.color ? "border-[var(--text-primary)] ring-2 ring-offset-2 ring-[var(--brand)]" : "border-transparent"
                      )}
                      style={{ background: preset.color }}
                      title={preset.label}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={previewAccentColor}
                    onChange={(e) => setPreviewAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                  />
                  <span className="text-xs font-mono text-[var(--text-secondary)]">{previewAccentColor}</span>
                </div>
              </div>
            )}

            {!previewAccentEnabled && tenantColor && (
              <div className="pl-12 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="w-5 h-5 rounded-md border border-[var(--border)]" style={{ background: tenantColor }} />
                Brand color from your account
              </div>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Preview</p>
            <ThemePreview darkMode={previewDark} accent={previewAccent} />
          </section>
        </div>

        <div className="p-4 border-t border-[var(--border)] space-y-2 bg-[var(--surface-muted)]">
          <button onClick={applySettings} className={`${btnPrimary} w-full`}>
            Apply changes
          </button>
          <div className="flex gap-2">
            <button onClick={handleReset} className={`${btnSecondary} flex-1 text-xs`}>
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button onClick={onClose} className={`${btnSecondary} flex-1 text-xs`}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-light)] transition"
      aria-label="Settings"
    >
      <Palette className="w-5 h-5" />
    </button>
  );
}
