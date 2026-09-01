"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

const VARIANT: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; className: string }
> = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-[var(--surface)] text-[var(--text-primary)] dark:border-emerald-800 [&_svg]:text-emerald-600",
  },
  error: {
    icon: XCircle,
    className:
      "border-red-200 bg-[var(--surface)] text-[var(--text-primary)] dark:border-red-800 [&_svg]:text-red-600",
  },
  info: {
    icon: Info,
    className:
      "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] [&_svg]:text-[var(--brand-text)]",
  },
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--safe-bottom))] z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((item) => {
        const v = VARIANT[item.variant];
        const Icon = v.icon;
        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 shadow-[var(--shadow-lg)] backdrop-blur-sm",
              v.className,
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded-lg p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
