import { getStoredUser } from "@/lib/auth-session";
import { resolveClientApiBase } from "@/lib/client-api-base";
import {
  featureKeyForRoute,
  type ProductAnalyticsPortal,
} from "@/lib/product-analytics/route-feature-map";
import { normalizeNavPath } from "@/components/app-nav";

const STORAGE_KEY = "product-telemetry:queue";
const FLUSH_INTERVAL_MS = 10_000;
const MAX_QUEUE = 100;

type QueuedEvent = {
  clientEventId: string;
  eventName: string;
  occurredAt: string;
  sessionId: string;
  portal: ProductAnalyticsPortal;
  featureKey?: string;
  route?: string;
  properties?: Record<string, string | number | boolean>;
  client: string;
};

function telemetryEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PRODUCT_TELEMETRY_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_PRODUCT_TELEMETRY_ENABLED === "true") return true;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

let portal: ProductAnalyticsPortal | null = null;
let sessionId: string | null = null;
let flushTimer: number | null = null;
let lastScreenKey = "";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    // ignore quota errors
  }
}

function enqueue(event: QueuedEvent) {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue.slice(-MAX_QUEUE));
}

async function flush() {
  if (!telemetryEnabled()) return;
  const token = getStoredUser()?.accessToken;
  if (!token) return;

  const queue = readQueue();
  if (queue.length === 0) return;

  const body = JSON.stringify({ events: queue });
  const url = `${resolveClientApiBase()}/api/v1/telemetry/events`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      keepalive: true,
    });
    if (!res.ok) {
      writeQueue([...readQueue(), ...queue].slice(-MAX_QUEUE));
      return;
    }
    writeQueue([]);
  } catch {
    writeQueue([...readQueue(), ...queue].slice(-MAX_QUEUE));
  }
}

function ensureFlushLoop() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
}

function track(
  eventName: QueuedEvent["eventName"],
  opts: {
    featureKey?: string;
    route?: string;
    properties?: Record<string, string | number | boolean>;
  } = {},
) {
  if (!telemetryEnabled() || !portal || !sessionId) return;

  enqueue({
    clientEventId: newSessionId(),
    eventName,
    occurredAt: new Date().toISOString(),
    sessionId,
    portal,
    featureKey: opts.featureKey,
    route: opts.route,
    properties: opts.properties,
    client: "web",
  });
}

export type { ProductAnalyticsPortal } from "@/lib/product-analytics/route-feature-map";

export const productAnalytics = {
  configure(nextPortal: ProductAnalyticsPortal) {
    if (!telemetryEnabled()) return;
    portal = nextPortal;
    ensureFlushLoop();
  },

  resetSession() {
    sessionId = newSessionId();
    lastScreenKey = "";
  },

  trackSessionStarted() {
    track("session_started", { featureKey: `${portal ?? "app"}.session` });
  },

  trackScreen(pathname: string) {
    if (!portal) return;
    const route = normalizeNavPath(pathname);
    const featureKey = featureKeyForRoute(portal, route);
    const dedupeKey = `${route}|${featureKey}`;
    if (dedupeKey === lastScreenKey) return;
    lastScreenKey = dedupeKey;
    track("screen_viewed", { featureKey, route });
  },

  trackFeature(featureKey: string, properties?: Record<string, string | number | boolean>) {
    track("feature_used", { featureKey, properties });
  },

  flush,
};
