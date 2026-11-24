"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { SpeechProblem } from "./voice";

export function canRecordAudio(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** The first recording format this browser can make: Chrome and Android give webm, Safari and iPhone give mp4. */
function pickMime(): string | undefined {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

/**
 * Speaking into the message box through Antra's own speech engine: the phone records a short clip, the server turns it into
 * text and forgets the audio. Used only when the server says an engine is on; it works in app-store wrappers and browsers
 * that lack the built-in recogniser. Same shape as the built-in one, so the message box treats them alike.
 */
export function useServerSpeech(handlers: { onDone: (text: string) => void; onCancel?: () => void }, maxSeconds = 30) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => canRecordAudio(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<SpeechProblem | null>(null);
  const [problemText, setProblemText] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(
    () => () => {
      const rec = recRef.current;
      if (rec) {
        rec.onstop = null; // leaving the page: do not upload a half recording
        if (rec.state !== "inactive") rec.stop();
      }
      release();
    },
    [release],
  );

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  /** Stop and throw the recording away without sending it. */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const start = useCallback(
    async (lang: string) => {
      if (recRef.current || !canRecordAudio()) return;
      setProblem(null);
      setProblemText(null);
      cancelledRef.current = false;
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setProblem(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "noMic" : "other");
        return;
      }
      streamRef.current = stream;
      const mime = pickMime();
      const chunks: Blob[] = [];
      const began = Date.now();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = async () => {
        recRef.current = null;
        setListening(false);
        release();
        if (cancelledRef.current) {
          handlersRef.current.onCancel?.();
          return;
        }
        const blob = new Blob(chunks, { type: rec.mimeType || mime || "audio/webm" });
        if (blob.size < 1500) {
          setProblem("noSpeech"); // a few hundred milliseconds of nothing
          return;
        }
        setWorking(true);
        try {
          const r = await api.transcribeSpeech(blob, lang, (Date.now() - began) / 1000);
          handlersRef.current.onDone(r.text);
        } catch (e) {
          setProblem("server");
          setProblemText(e instanceof Error ? e.message : null);
        } finally {
          setWorking(false);
        }
      };
      recRef.current = rec;
      rec.start();
      setListening(true);
      timerRef.current = setTimeout(stop, maxSeconds * 1000);
    },
    [maxSeconds, release, stop],
  );

  return { supported, listening, working, problem, problemText, start, stop, cancel };
}
