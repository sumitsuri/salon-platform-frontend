"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, Mic, Square } from "lucide-react";
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

export type ComposerHandle = { focus: () => void };

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
  });
  const server = useServerSpeech(
    { onDone: useCallback((spoken: string) => finishSpeech(spoken, serverSpeech?.engine ?? "server"), [finishSpeech, serverSpeech?.engine]) },
    serverSpeech?.maxSeconds ?? 30,
  );
  // Antra's own engine, when on, is used wherever the phone can record; otherwise the built-in recogniser.
  const useServer = !!serverSpeech && server.supported;
  const speech = useServer
    ? { supported: true, listening: server.listening, working: server.working, problem: server.problem, problemText: server.problemText, start: (l: string) => void server.start(l), stop: server.stop }
    : { supported: browser.supported, listening: browser.listening, working: false, problem: browser.problem, problemText: null as string | null, start: browser.start, stop: browser.stop };

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
      {(speech.listening || speech.working || speech.problem || (speech.supported && !noticeSeen)) && (
        <div className="mx-auto mb-2 max-w-3xl px-1 text-[13px]" role="status" aria-live="polite">
          {speech.listening ? (
            <p className="flex items-center gap-2 font-medium text-red-700 dark:text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden />
              {t("voice.listening")}
            </p>
          ) : speech.working ? (
            <p className="text-[var(--text-secondary)]">{t("voice.working")}</p>
          ) : speech.problem ? (
            <p className="text-amber-800 dark:text-amber-300">{speech.problemText ?? t(`voice.problem.${speech.problem}`)}</p>
          ) : (
            <p className="text-[var(--text-secondary)]">{useServer ? t("voice.noticeServer") : t("voice.notice")}</p>
          )}
        </div>
      )}
      <form
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] p-2 pl-4 shadow-sm transition-shadow focus-within:border-[var(--brand)] focus-within:shadow-[0_0_0_3px_var(--brand-ring)]"
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
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          enterKeyHint="send"
          className="max-h-[200px] min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] disabled:opacity-50"
        />
        {speech.supported && !streaming && (
          <>
            <select
              value={voiceLang}
              onChange={(e) => {
                const v = e.target.value;
                if (isVoiceLang(v)) {
                  setVoiceLang(v);
                  write(LANG_KEY, v);
                }
              }}
              disabled={disabled || speech.listening || speech.working}
              aria-label={t("voice.language")}
              title={t("voice.language")}
              className="h-10 max-w-[5.5rem] shrink-0 cursor-pointer rounded-full border-0 bg-transparent px-1 text-[12px] font-medium text-[var(--text-secondary)] outline-none hover:bg-[var(--surface-muted)] disabled:opacity-50 sm:max-w-[9rem]"
            >
              {VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleMic}
              disabled={disabled || speech.working}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? t("voice.stop") : t("voice.start")}
              title={speech.listening ? t("voice.stop") : t("voice.start")}
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
                speech.listening ? "bg-red-600 text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden />}
              <Mic className="relative h-5 w-5" aria-hidden />
            </button>
          </>
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
              canSend ? "bg-[var(--brand)] text-[var(--brand-on-brand)] hover:opacity-90" : "bg-[var(--surface-muted)] text-[var(--text-tertiary)]"
            )}
          >
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        )}
      </form>
      <p className="mx-auto mt-1.5 flex max-w-3xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-2 text-[11px] text-[var(--text-tertiary)]">
        {speech.supported ? (
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => {
                setAutoSend(e.target.checked);
                write(AUTO_SEND_KEY, e.target.checked ? "on" : "off");
              }}
              className="h-3.5 w-3.5 accent-[var(--brand)]"
            />
            {t("voice.autoSend")}
          </label>
        ) : (
          <span className="max-sm:hidden">{t("hint")}</span>
        )}
        <span className="sm:text-right">{nearLimit ? `${value.length}/${MAX_CHARS}` : t("disclaimer")}</span>
      </p>
    </div>
  );
});
