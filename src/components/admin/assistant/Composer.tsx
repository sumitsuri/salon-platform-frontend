"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, Check, Globe, Loader2, Mic, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServerSpeech } from "./useServerSpeech";
import { useSpeechInput } from "./useSpeechInput";
import { VOICE_LANGUAGES, defaultVoiceLang, isVoiceLang, joinTranscript, type VoiceLang, type VoiceMeta } from "./voice";

const LANG_KEY = "antra.assistant.voiceLang";
const AUTO_SEND_KEY = "antra.assistant.voiceAutoSend";
const NOTICE_KEY = "antra.assistant.voiceNoticeSeen";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice just is not remembered */
  }
}

export const MAX_CHARS = 4000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Sends the box's text, or {@code text} when it is given (voice sends what was just spoken before the box has updated). */
  onSend: (text?: string, voice?: VoiceMeta) => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
  /** Set when Antra's own speech engine is switched on; the microphone then records and sends audio to it. */
  serverSpeech?: { engine: string; maxSeconds?: number } | null;
};

export type ComposerHandle = { focus: () => void; startVoice: () => void };

/** The message box: grows with the text, Enter sends, Shift+Enter adds a line, the button becomes Stop while answering. */
export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { value, onChange, onSend, onStop, streaming, disabled, serverSpeech },
  handleRef
) {
  const t = useTranslations("admin.assistant");
  const appLocale = useLocale();
  const ref = useRef<HTMLTextAreaElement>(null);
  const baseRef = useRef("");
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en-IN");
  const [autoSend, setAutoSend] = useState(true);
  const [noticeSeen, setNoticeSeen] = useState(true);
  const valueRef = useRef(value);
  valueRef.current = value;
  const guardRef = useRef({ streaming, disabled });
  guardRef.current = { streaming, disabled };

  // Remembered choices are read after mount (not during render) so the server and browser render the same first.
  useEffect(() => {
    const saved = read(LANG_KEY);
    setVoiceLang(isVoiceLang(saved) ? saved : defaultVoiceLang(appLocale));
    setAutoSend(read(AUTO_SEND_KEY) !== "off");
    setNoticeSeen(read(NOTICE_KEY) === "1");
  }, [appLocale]);

  const voiceLangRef = useRef<VoiceLang>("en-IN");
  voiceLangRef.current = voiceLang;

  // How the next question was entered, so the answer can be rated together with whether the microphone heard it right.
  const voiceRef = useRef<VoiceMeta | null>(null);
  const sendNow = useCallback(
    (text?: string) => {
      onSend(text, voiceRef.current ?? undefined);
      voiceRef.current = null;
    },
    [onSend],
  );
  const finishSpeech = useCallback(
    (spoken: string, engine: string) => {
      const text = joinTranscript(baseRef.current, spoken);
      if (!spoken.trim()) return;
      voiceRef.current = { engine, lang: voiceLangRef.current };
      onChange(text);
      if (autoSend && !guardRef.current.streaming && !guardRef.current.disabled && text.trim()) sendNow(text);
      else ref.current?.focus();
    },
    [autoSend, onChange, sendNow],
  );
  const browser = useSpeechInput({
    onUpdate: useCallback(({ finalText, interimText }) => onChange(joinTranscript(baseRef.current, finalText + interimText)), [onChange]),
    onDone: useCallback((spoken: string) => finishSpeech(spoken, "browser"), [finishSpeech]),
    onCancel: useCallback(() => onChange(baseRef.current), [onChange]),
  });
  const server = useServerSpeech(
    {
      onDone: useCallback((spoken: string) => finishSpeech(spoken, serverSpeech?.engine ?? "server"), [finishSpeech, serverSpeech?.engine]),
      onCancel: useCallback(() => onChange(baseRef.current), [onChange]),
    },
    serverSpeech?.maxSeconds ?? 30,
  );
  // Antra's own engine, when on, is used wherever the phone can record; otherwise the built-in recogniser.
  const useServer = !!serverSpeech && server.supported;
  const speech = useServer
    ? { supported: true, listening: server.listening, working: server.working, problem: server.problem, problemText: server.problemText, start: (l: string) => void server.start(l), stop: server.stop, cancel: server.cancel }
    : { supported: browser.supported, listening: browser.listening, working: false, problem: browser.problem, problemText: null as string | null, start: browser.start, stop: browser.stop, cancel: browser.cancel };

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
      return;
    }
    baseRef.current = valueRef.current;
    setNoticeSeen(true);
    write(NOTICE_KEY, "1");
    speech.start(voiceLang);
  };
  const toggleMicRef = useRef(toggleMic);
  toggleMicRef.current = toggleMic;
  useImperativeHandle(
    handleRef,
    () => ({
      focus: () => ref.current?.focus(),
      startVoice: () => {
        if (!guardRef.current.streaming && !guardRef.current.disabled) toggleMicRef.current();
      },
    }),
    [],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !disabled && !streaming;
  const nearLimit = value.length > MAX_CHARS * 0.85;
  const capturing = speech.listening || speech.working;
  const showNotice = speech.supported && !noticeSeen && !capturing;

  return (
    <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 sm:px-6">
      <div className="mx-auto w-full max-w-[45rem] space-y-2">
        {(speech.problem || showNotice) && (
          <p className={cn("px-1 text-[13px]", speech.problem ? "text-amber-800 dark:text-amber-300" : "text-[var(--text-secondary)]")} role="status" aria-live="polite">
            {speech.problem ? speech.problemText ?? t(`voice.problem.${speech.problem}`) : useServer ? t("voice.noticeServer") : t("voice.notice")}
          </p>
        )}

        {speech.supported && !streaming && !capturing && (
          <div className="flex flex-wrap items-center gap-2 px-1">
            <label className="relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-2.5 pr-1 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t("voice.language")}</span>
              <select
                value={voiceLang}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isVoiceLang(v)) {
                    setVoiceLang(v);
                    write(LANG_KEY, v);
                  }
                }}
                disabled={disabled}
                title={t("voice.language")}
                className="h-8 max-w-[10.5rem] cursor-pointer appearance-none truncate bg-transparent pr-4 text-[12px] font-medium outline-none disabled:opacity-50"
              >
                {VOICE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-pressed={autoSend}
              title={t("voice.autoSend")}
              aria-label={t("voice.autoSend")}
              onClick={() => {
                setAutoSend(!autoSend);
                write(AUTO_SEND_KEY, autoSend ? "off" : "on");
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
                autoSend ? "border-[var(--border-brand)] bg-[var(--brand-light)] text-[var(--brand-text)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
              )}
            >
              {autoSend && <Check className="h-3.5 w-3.5" aria-hidden />}
              {t("voice.autoSendShort")}
            </button>
          </div>
        )}

        {capturing ? (
          <div className="flex items-center gap-3 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 shadow-sm" role="status" aria-live="polite">
            <button
              type="button"
              onClick={speech.cancel}
              disabled={speech.working}
              aria-label={t("voice.cancel")}
              title={t("voice.cancel")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 text-center">
              {speech.working ? (
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--text-tertiary)]" aria-hidden />
              ) : (
                <span className="voice-wave" aria-hidden>
                  {Array.from({ length: 11 }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              )}
              <p className="mt-0.5 line-clamp-3 break-words text-[15px] leading-6 text-[var(--text-primary)]">
                {speech.working ? t("voice.working") : value.trim() ? value : t("voice.listening")}
              </p>
            </div>
            <button
              type="button"
              onClick={speech.stop}
              disabled={speech.working}
              aria-label={t("voice.stop")}
              title={t("voice.stop")}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-40"
            >
              {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden />}
              <Square className="relative h-4 w-4 fill-current" aria-hidden />
            </button>
          </div>
        ) : (
          <form
            className="flex items-end gap-2 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-1.5 pl-4 shadow-sm transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-ring)]"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSend) sendNow();
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
                  if (canSend) sendNow();
                }
              }}
              placeholder={speech.supported ? t("placeholderVoice") : t("placeholderShort")}
              aria-label={t("placeholder")}
              enterKeyHint="send"
              className="max-h-[200px] min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent py-2 text-[16px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50 sm:text-[15px]"
            />
            {speech.supported && !streaming && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={disabled}
                aria-label={t("voice.start")}
                title={t("voice.start")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <Mic className="h-5 w-5" aria-hidden />
              </button>
            )}
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
                  canSend ? "bg-[var(--brand)] text-[var(--brand-on-brand)] hover:opacity-90" : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]",
                )}
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            )}
          </form>
        )}
        {nearLimit && !capturing && <p className="px-2 text-right text-[11px] text-[var(--text-tertiary)]">{`${value.length}/${MAX_CHARS}`}</p>}
      </div>
    </div>
  );
});
