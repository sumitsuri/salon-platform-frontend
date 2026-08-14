const PRODUCTION_API_BASE = "https://api.antrahq.com";

/** Resolve API origin in the browser for static CloudFront and legacy nginx hosts. */
export function resolveClientApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL || "";
  const host = window.location.hostname;

  // app.antrahq.com is static S3 — never use same-origin relative /api (404). Always hit api.antrahq.com.
  if (host === "app.antrahq.com") {
    if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
      return configured;
    }
    return PRODUCTION_API_BASE;
  }

  // Legacy same-host nginx proxy: drop localhost when not on dev machine.
  if (
    configured &&
    (configured.includes("localhost") || configured.includes("127.0.0.1")) &&
    host !== "localhost" &&
    host !== "127.0.0.1"
  ) {
    return "";
  }

  return configured;
}

export function resolveServerApiBase(): string {
  return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
}
