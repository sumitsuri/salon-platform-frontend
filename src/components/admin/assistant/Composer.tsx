"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export const MAX_CHARS = 4000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
};

export type ComposerHandle = { focus: () => void };

/** The message box: grows with the text, Enter sends, Shift+Enter adds a line, the button becomes Stop while answering. */
export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { value, onChange, onSend, onStop, streaming, disabled },
  handleRef
) {
  const t = useTranslations("admin.assistant");
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(handleRef, () => ({ focus: () => ref.current?.focus() }), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled && !streaming;
  const nearLimit = value.length > MAX_CHARS * 0.85;

  return (
    <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-6">
      <form
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 pl-4 shadow-sm transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-ring)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSend();
        }}
      >
        <textarea
          ref={ref}
          value={value}
          rows={1}
          disabled={disabled}
          maxLength={MAX_CHARS}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          enterKeyHint="send"
          className="max-h-[200px] min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50"
        />
        {streaming ? (
          <button type="button" onClick={onStop} aria-label={t("stop")} title={t("stop")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--surface)] transition-opacity hover:opacity-85">
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t("send")}
            title={t("send")}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
              canSend ? "bg-[var(--brand)] text-[var(--brand-on-brand)] hover:opacity-90" : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
            )}
          >
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        )}
      </form>
      <p className="mx-auto mt-1.5 flex max-w-3xl items-center justify-between gap-3 px-2 text-[11px] text-[var(--text-tertiary)]">
        <span className="max-sm:hidden">{t("hint")}</span>
        <span className="sm:text-right">{nearLimit ? `${value.length}/${MAX_CHARS}` : t("disclaimer")}</span>
      </p>
    </div>
  );
});
