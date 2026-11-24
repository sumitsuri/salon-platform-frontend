"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowLeftRight, ChevronLeft, Clock, IndianRupee, Maximize2, Menu, Mic, Minimize2, Package, PanelLeft, Plus, Sparkles, TrendingUp, Users, X } from "lucide-react";
import Link from "next/link";
import { api, streamAssistantChat, type AssistantMessage } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { AlertBanner } from "@/components/ui";
import { ChatSidebar } from "./ChatSidebar";
import { Composer, type ComposerHandle } from "./Composer";
import { MessageItem } from "./MessageItem";
import {
  greetingKey,
  loadConversations,
  saveConversations,
  takePrefill,
  titleFrom,
  uid,
  type ChatMsg,
  type Conversation,
} from "./conversations";
import { useFillViewport } from "./useFillViewport";
import type { VoiceMeta } from "./voice";
import { useVoiceAvailable } from "./useSpeechInput";

const SUGGESTIONS = [
  { key: "sales", icon: TrendingUp },
  { key: "compare", icon: ArrowLeftRight },
  { key: "busy", icon: Clock },
  { key: "staff", icon: Users },
  { key: "stock", icon: Package },
  { key: "profit", icon: IndianRupee },
] as const;

export function AssistantChat() {
  const t = useTranslations("admin.assistant");
  const user = useAuthStore((s) => s.user);
  const storageKey = `antra.assistant.v1.${user?.userId ?? "anon"}`;
  const firstName = user?.name?.trim().split(/\s+/)[0];

  const status = useQuery({ queryKey: ["assistant-status"], queryFn: () => api.getAssistantStatus(), staleTime: 60_000 });
  const disabled = !!status.data && !status.data.enabled;
  const serverSpeech = status.data?.speech?.server ? { engine: status.data.speech.engine ?? "server", maxSeconds: status.data.speech.maxSeconds } : null;
  const voiceAvailable = useVoiceAvailable(!!serverSpeech);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [showLatest, setShowLatest] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  // Which storage key the conversations in memory were loaded from; saving is only safe once it matches the
  // current key, otherwise a stale empty list could overwrite the saved chats when the user id arrives late.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const composerRef = useRef<ComposerHandle>(null);
  // The chat fills the whole page, so nothing is left under it; restore the shell's padding on leaving.
  useLayoutEffect(() => {
    const main = document.getElementById("app-mobile-scroll");
    if (!main) return;
    const previous = main.style.paddingBottom;
    main.style.paddingBottom = "0px"; // the composer keeps its own safe-area margin
    return () => {
      main.style.paddingBottom = previous;
    };
  }, []);
  const fillRef = useFillViewport(fullScreen);

  // ---- history: load once the user is known, save whenever an answer is not being written ----
  useEffect(() => {
    const saved = loadConversations(storageKey).sort((a, b) => b.updatedAt - a.updatedAt);
    setConversations(saved);
    setActiveId(saved[0]?.id ?? null);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey === storageKey && !streaming) saveConversations(storageKey, conversations);
  }, [conversations, streaming, storageKey, loadedKey]);

  // A question handed over by another page (the forecast) only fills the box; the person decides whether to send it.
  useEffect(() => {
    const q = takePrefill();
    if (q) {
      setDraft(q);
      setTimeout(() => composerRef.current?.focus(), 50);
    }
  }, []);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const messages = useMemo(() => active?.messages ?? [], [active]);

  const updateConv = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  }, []);
  const patchMsg = useCallback(
    (convId: string, msgId: string, fn: (m: ChatMsg) => ChatMsg) =>
      updateConv(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? fn(m) : m)) })),
    [updateConv]
  );

  // ---- scrolling: follow the answer unless the reader scrolled up ----
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = messages.length === 0 ? 0 : el.scrollHeight;
  }, [messages, streaming]);

  // Content growing under a streaming answer also looks like "scrolled up"; only treat it as the reader
  // leaving the bottom when they just used the wheel, touch, keys or the scrollbar.
  const lastUserInput = useRef(0);
  const markUserInput = () => {
    lastUserInput.current = performance.now();
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < 80) {
      stickRef.current = true;
      setShowLatest(false);
    } else if (performance.now() - lastUserInput.current < 800) {
      stickRef.current = false;
      setShowLatest(distance > 240);
    }
  };
  const scrollToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // ---- one model turn: stream text (painted once per frame), step labels, and the end state ----
  const runTurn = useCallback(
    async (convId: string, history: AssistantMessage[], assistantId: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      let buffer = "";
      let frame = 0;
      const flush = () => {
        frame = 0;
        if (!buffer) return;
        const chunk = buffer;
        buffer = "";
        patchMsg(convId, assistantId, (m) => ({ ...m, content: m.content + chunk }));
      };
      try {
        await streamAssistantChat(
          history,
          (event) => {
            if (event.type === "text") {
              buffer += event.t;
              if (!frame) frame = requestAnimationFrame(flush);
            } else if (event.type === "tool") {
              patchMsg(convId, assistantId, (m) => {
                const tools = [...(m.tools ?? [])];
                if (event.phase === "start") {
                  tools.push({ name: event.name, label: event.label ?? event.name, status: "running" });
                } else {
                  const idx = tools.map((x) => x.name).lastIndexOf(event.name);
                  if (idx >= 0) tools[idx] = { ...tools[idx], status: event.ok ? "ok" : "failed", ms: event.ms };
                }
                return { ...m, tools };
              });
            } else if (event.type === "truncated") {
              patchMsg(convId, assistantId, (m) => ({ ...m, truncated: true }));
            } else if (event.type === "replace") {
              // The gateway swapped the answer for a safe one: show that, and drop anything still waiting to be painted.
              buffer = "";
              patchMsg(convId, assistantId, (m) => ({ ...m, content: event.text }));
            } else if (event.type === "blocked") {
              updateConv(convId, (c) => {
                const at = c.messages.findIndex((m) => m.id === assistantId);
                const refused = at > 0 ? c.messages[at - 1] : undefined;
                // The chat must never be named after a message that was refused (it may hold a password).
                const title = refused && refused.role === "user" && c.title === titleFrom(refused.content) ? "" : c.title;
                return {
                  ...c,
                  title,
                  messages: c.messages.map((m, i) => {
                    if (i === at) return { ...m, blocked: event.reason };
                    if (event.discardUserMessage && i === at - 1 && m.role === "user") {
                      return { ...m, content: t("removedMessage"), removed: true };
                    }
                    return m;
                  }),
                };
              });
            } else if (event.type === "error") {
              patchMsg(convId, assistantId, (m) => ({ ...m, error: event.message }));
            }
          },
          controller.signal
        );
      } catch (e) {
        patchMsg(convId, assistantId, (m) =>
          controller.signal.aborted
            ? { ...m, stopped: true }
            : { ...m, error: e instanceof Error ? e.message : t("errorGeneric") }
        );
      } finally {
        if (frame) cancelAnimationFrame(frame);
        flush();
        patchMsg(convId, assistantId, (m) => ({
          ...m,
          tools: (m.tools ?? []).map((x) => (x.status === "running" ? { ...x, status: "failed" as const } : x)),
        }));
        setStreaming(false);
        abortRef.current = null;
        composerRef.current?.focus();
      }
    },
    [patchMsg, updateConv, t]
  );

  /** Starts an answer to {@code base} (the conversation so far, ending with a question). */
  const startAnswer = useCallback(
    (conv: Conversation, base: ChatMsg[]) => {
      const assistantMsg: ChatMsg = { id: uid(), role: "assistant", content: "", tools: [] };
      const next: Conversation = { ...conv, messages: [...base, assistantMsg], updatedAt: Date.now() };
      setConversations((prev) => (prev.some((c) => c.id === next.id) ? prev.map((c) => (c.id === next.id ? next : c)) : [next, ...prev]));
      setActiveId(next.id);
      stickRef.current = true;
      const history = base.filter((m) => m.content.trim() && !m.error && !m.removed).map(({ role, content }) => ({ role, content }));
      void runTurn(next.id, history, assistantMsg.id);
    },
    [runTurn]
  );

  const send = useCallback(
    (raw: string, voice?: VoiceMeta) => {
      const text = raw.trim();
      if (!text || streaming || disabled) return;
      setDraft("");
      const userMsg: ChatMsg = { id: uid(), role: "user", content: text, ...(voice ? { voice } : {}) };
      const existing: Conversation = active ?? { id: uid(), title: "", messages: [], updatedAt: Date.now() };
      // Named after the first question; taken back if that question turns out to be refused.
      const conv = existing.title ? existing : { ...existing, title: titleFrom(text) };
      startAnswer(conv, [...conv.messages, userMsg]);
    },
    [active, disabled, startAnswer, streaming]
  );

  const regenerate = useCallback(() => {
    if (!active || streaming) return;
    const lastUser = [...active.messages].map((m) => m.role).lastIndexOf("user");
    if (lastUser < 0) return;
    startAnswer(active, active.messages.slice(0, lastUser + 1));
  }, [active, startAnswer, streaming]);

  const editAndResend = useCallback(
    (msgId: string, text: string) => {
      if (!active || streaming) return;
      const idx = active.messages.findIndex((m) => m.id === msgId);
      if (idx < 0) return;
      startAnswer(active, [...active.messages.slice(0, idx), { ...active.messages[idx], content: text }]);
    },
    [active, startAnswer, streaming]
  );

  const stop = () => abortRef.current?.abort();

  /** Saves what the reader said about an answer, then tells the server (which stores ratings, never the text). */
  const giveFeedback = useCallback(
    (msgId: string, patch: NonNullable<ChatMsg["feedback"]>) => {
      if (!active) return;
      const idx = active.messages.findIndex((m) => m.id === msgId);
      if (idx < 0) return;
      const merged = { ...active.messages[idx].feedback, ...patch };
      patchMsg(active.id, msgId, (m) => ({ ...m, feedback: merged }));
      const voice = [...active.messages.slice(0, idx)].reverse().find((m) => m.role === "user")?.voice;
      void api
        .sendAssistantFeedback({
          messageId: msgId,
          rating: patch.rating,
          reasons: patch.rating === "DOWN" ? merged.reasons ?? [] : undefined,
          heardCorrectly: patch.heard,
          inputMode: voice ? "VOICE" : "TYPED",
          voiceEngine: voice?.engine,
          voiceLang: voice?.lang,
        })
        .catch(() => {
          /* feedback is a courtesy: never interrupt the chat if it cannot be saved */
        });
    },
    [active, patchMsg],
  );

  const newChat = useCallback(() => {
    if (streaming) return;
    setActiveId(null);
    setDrawerOpen(false);
    setDraft("");
    setTimeout(() => composerRef.current?.focus(), 0);
  }, [streaming]);

  const selectChat = (id: string) => {
    if (streaming) return;
    setActiveId(id);
    setDrawerOpen(false);
    stickRef.current = true;
  };
  const renameChat = (id: string, title: string) => updateConv(id, (c) => ({ ...c, title }));
  const deleteChat = (id: string) => {
    const rest = conversations.filter((c) => c.id !== id);
    setConversations(rest);
    if (id === activeId) setActiveId(rest[0]?.id ?? null);
  };

  // ---- full screen, keyboard shortcuts ----
  useEffect(() => {
    if (!fullScreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullScreen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT" || e.target.isContentEditable);
      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        else if (fullScreen) setFullScreen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        newChat();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        composerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, fullScreen, newChat]);

  const sidebar = (
    <ChatSidebar
      conversations={conversations}
      activeId={activeId}
      disabled={streaming}
      onSelect={selectChat}
      onNew={newChat}
      onRename={renameChat}
      onDelete={deleteChat}
    />
  );

  const lastUserId = [...messages].reverse().find((m) => m.role === "user")?.id;
  const greeting = firstName ? t(greetingKey(), { name: firstName }) : t("greetingNoName");

  const chat = (
    <div
      ref={fillRef}
      className={cn(
        "flex w-full min-w-0 overflow-hidden bg-[var(--surface)]",
        fullScreen && "fixed inset-0 z-[150] h-dvh"
      )}
    >
      <aside className={cn("hidden w-72 shrink-0 border-r border-[var(--border)] bg-[var(--surface-muted)]", !sidebarHidden && "lg:block")}>{sidebar}</aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-1 border-b border-[var(--border)] px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-3">
          <Link href="/admin" aria-label={t("back")} title={t("back")} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] nav:hidden">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarHidden((v) => !v)}
            aria-label={sidebarHidden ? t("showSidebar") : t("hideSidebar")}
            aria-pressed={!sidebarHidden}
            className="hidden rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] lg:block"
          >
            <PanelLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="flex min-w-0 flex-1 items-center gap-2 px-1 text-[15px] font-semibold text-[var(--text-primary)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden />
            <span className="truncate">{active ? active.title || t("newChat") : t("title")}</span>
          </h1>
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label={t("openChats")} title={t("openChats")} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] lg:hidden">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={newChat} disabled={streaming} aria-label={t("newChat")} title={`${t("newChat")} (Ctrl+Shift+O)`} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-50 sm:px-3">
            <Plus className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden />
            <span className="max-sm:hidden">{t("newChat")}</span>
          </button>
          <button
            type="button"
            onClick={() => setFullScreen((v) => !v)}
            aria-label={fullScreen ? t("exitFullScreen") : t("fullScreen")}
            title={fullScreen ? `${t("exitFullScreen")} (Esc)` : t("fullScreen")}
            className="hidden rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] sm:block"
          >
            {fullScreen ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
          </button>
        </header>

        <div ref={scrollRef} onScroll={onScroll} onWheel={markUserInput} onTouchMove={markUserInput} onPointerDown={markUserInput} onKeyDown={markUserInput} role="log" aria-busy={streaming} aria-label={t("conversation")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-[45rem] flex-col items-center justify-center py-4 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-light)] text-[var(--brand-text)]" aria-hidden>
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="text-balance text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{greeting}</h2>
              <p className="mt-2 max-w-md text-[14px] text-[var(--text-secondary)]">{t("emptyHint")}</p>
              {voiceAvailable && !disabled && (
                <div className="mt-6 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={() => composerRef.current?.startVoice()}
                    className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[var(--brand)] px-6 py-3.5 text-[16px] font-semibold text-[var(--brand-on-brand)] shadow-sm transition-opacity hover:opacity-90"
                  >
                    <Mic className="h-5 w-5" aria-hidden /> {t("voice.tapToSpeak")}
                  </button>
                  <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">{t("voice.speakHint")}</p>
                </div>
              )}
              {disabled && (
                <div className="mt-5 w-full text-left">
                  <AlertBanner variant="warning">{t("notEnabled")}</AlertBanner>
                </div>
              )}
              <div className="mt-7 grid w-full gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => send(t(`suggestions.${key}`))}
                    className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left text-[14px] text-[var(--text-primary)] transition-colors hover:border-[var(--border-brand)] hover:bg-[var(--brand-light)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-text)]" aria-hidden />
                    <span>{t(`suggestions.${key}`)}</span>
                  </button>
                ))}
              </div>
              <p className="mt-5 max-w-md text-[13px] leading-6 text-[var(--text-tertiary)]">
                {t("hinglishTip")}{" "}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => send(t("hinglishExample"))}
                  className="font-medium text-[var(--brand-text)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &ldquo;{t("hinglishExample")}&rdquo;
                </button>
              </p>
              <p className="mt-3 max-w-md text-[12px] text-[var(--text-tertiary)]">{t("disclaimer")}</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[45rem] space-y-7">
              {messages.map((m, idx) => (
                <MessageItem
                  key={m.id}
                  msg={m}
                  isLast={idx === messages.length - 1}
                  streaming={streaming}
                  canEdit={!streaming && m.id === lastUserId}
                  onEdit={editAndResend}
                  onRegenerate={regenerate}
                  onContinue={() => send(t("continueMessage"))}
                  voice={m.role === "assistant" ? messages[idx - 1]?.voice : undefined}
                  onFeedback={giveFeedback}
                />
              ))}
            </div>
          )}
        </div>

        {showLatest && messages.length > 0 && (
          <button
            type="button"
            onClick={scrollToLatest}
            aria-label={t("scrollToLatest")}
            className="absolute bottom-28 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] shadow-md hover:text-[var(--text-primary)] max-sm:bottom-32"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden /> {t("scrollToLatest")}
          </button>
        )}

        <Composer ref={composerRef} value={draft} onChange={setDraft} onSend={(text, voice) => send(text ?? draft, voice)} onStop={stop} streaming={streaming} disabled={disabled} serverSpeech={serverSpeech} />
      </section>
    </div>
  );

  const drawer =
    drawerOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[160] lg:hidden" role="dialog" aria-modal="true" aria-label={t("history")}>
            <button type="button" aria-label={t("closeChats")} onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] shadow-xl">
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="text-[15px] font-semibold">{t("history")}</span>
                <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("closeChats")} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]">
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {fullScreen && typeof document !== "undefined" ? createPortal(chat, document.body) : chat}
      {drawer}
    </>
  );
}
