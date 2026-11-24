"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { speechProblem, type SpeechProblem } from "./voice";

/** The small part of the browser's speech recognition interface that is used here. */
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [i: number]: RecognitionResult };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechUpdate = { finalText: string; interimText: string };

/**
 * Speaking into the message box, using the speech service built into the phone or browser. Nothing is sent to Antra's servers
 * until the person sends the text, so spoken words go through the same checks as typed ones. Not every browser has it
 * (Firefox and some in-app browsers do not), so `supported` says whether to show the microphone at all.
 */
export function useSpeechInput(handlers: { onUpdate: (u: SpeechUpdate) => void; onDone: (finalText: string) => void }) {
  // Not supported while rendering on the server, so the first render matches in the browser too.
  const supported = useSyncExternalStore(
    () => () => {},
    () => recognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<SpeechProblem | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(
    () => () => {
      recRef.current?.abort();
    },
    [],
  );

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback((lang: string) => {
    const Ctor = recognitionCtor();
    if (!Ctor || recRef.current) return;
    setProblem(null);
    finalRef.current = "";
    interimRef.current = "";
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false; // one utterance: stops by itself when the person pauses, which is steadier on phones
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      finalRef.current = finalText;
      interimRef.current = interimText;
      handlersRef.current.onUpdate({ finalText, interimText });
    };
    rec.onerror = (e) => {
      const p = speechProblem(e.error);
      if (p) setProblem(p);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      // some browsers stop with the last words still unconfirmed; they were spoken, so keep them
      handlersRef.current.onDone(finalRef.current || interimRef.current);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setProblem("other");
    }
  }, []);

  return { supported, listening, problem, start, stop, clearProblem: () => setProblem(null) };
}
