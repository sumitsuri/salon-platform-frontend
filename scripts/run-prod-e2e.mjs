#!/usr/bin/env node
/**
 * Production smoke + e2e checks (no browser required).
 * Usage: node scripts/run-prod-e2e.mjs
 */
const MARKETING = "https://antrahq.com";
const APP = "https://app.antrahq.com";
const API = "https://api.antrahq.com";

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  return { res, text };
}

async function run() {
  try {
    const { res, text } = await fetchText(MARKETING);
    if (!res.ok) fail("marketing homepage HTTP", String(res.status));
    else if (text.includes("Marketing site placeholder")) fail("marketing homepage content", "still placeholder");
    else if (!/<title>[^<]*Antrahq/i.test(text)) fail("marketing homepage title", "missing Antrahq");
    else pass("marketing homepage", res.status);
  } catch (e) {
    fail("marketing homepage", e.message);
  }

  try {
    const { res, text } = await fetchText("https://www.antrahq.com");
    if (!res.ok || text.includes("Marketing site placeholder")) fail("www marketing", String(res.status));
    else pass("www marketing", res.status);
  } catch (e) {
    fail("www marketing", e.message);
  }

  for (const path of ["/pricing/", "/demo/", "/products/"]) {
    try {
      const { res, text } = await fetchText(`${MARKETING}${path}`);
      if (!res.ok || text.includes("Marketing site placeholder")) fail(`marketing ${path}`, String(res.status));
      else pass(`marketing ${path}`, res.status);
    } catch (e) {
      fail(`marketing ${path}`, e.message);
    }
  }

  try {
    const { res, text } = await fetchText(`${APP}/login/`);
    if (!res.ok) fail("app login page", String(res.status));
    else if (text.includes("Marketing site placeholder")) fail("app login page", "served marketing placeholder");
    else if (!/Sign in|signIn/i.test(text)) fail("app login page", "missing sign-in UI");
    else pass("app login page", res.status);
  } catch (e) {
    fail("app login page", e.message);
  }

  try {
    const res = await fetch(`${API}/api/v1/meta/locales`);
    const body = await res.json();
    if (!res.ok || !body.success) fail("API locales", JSON.stringify(body).slice(0, 80));
    else pass("API locales", `${body.data?.length ?? 0} locales`);
  } catch (e) {
    fail("API locales", e.message);
  }

  try {
    const res = await fetch(`${API}/api/v1/meta/locales`, {
      method: "OPTIONS",
      headers: { Origin: APP, "Access-Control-Request-Method": "GET" },
    });
    const acao = res.headers.get("access-control-allow-origin");
    if (res.status !== 200 || acao !== APP) fail("CORS app origin", `${res.status} acao=${acao}`);
    else pass("CORS app origin");
  } catch (e) {
    fail("CORS app origin", e.message);
  }

  try {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP },
      body: JSON.stringify({ email: "ceo@demo-brand.local", password: "ceo123" }),
    });
    const body = await res.json();
    if (!res.ok || !body.success || !body.data?.accessToken) {
      fail("CEO login API", body.message || res.status);
    } else {
      pass("CEO login API", "token issued");
      const token = body.data.accessToken;
      const me = await fetch(`${API}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}`, Origin: APP },
      });
      const meBody = await me.json();
      if (!me.ok || !meBody.success) fail("CEO /auth/me", me.status);
      else pass("CEO /auth/me", meBody.data?.email || "ok");
    }
  } catch (e) {
    fail("CEO login API", e.message);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

run();
