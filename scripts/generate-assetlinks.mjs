#!/usr/bin/env node
/**
 * Writes public/.well-known/assetlinks.json for Android TWA verification.
 * Set SHA-256 cert fingerprints (colon-free or colon-separated) before production deploy:
 *   ANDROID_SHA256_EMPLOYEE, ANDROID_SHA256_MANAGER, ANDROID_SHA256_PLATFORM
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../public/.well-known");
const outFile = path.join(outDir, "assetlinks.json");

const PACKAGES = [
  { env: "ANDROID_SHA256_EMPLOYEE", package: "com.antrahq.employee" },
  { env: "ANDROID_SHA256_MANAGER", package: "com.antrahq.manager" },
  { env: "ANDROID_SHA256_PLATFORM", package: "com.antrahq.platform" },
];

function normalizeFingerprint(raw) {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/"/g, "");
  if (!trimmed || trimmed === "REPLACE_ME") return null;
  return trimmed.replace(/:/g, "").toUpperCase().match(/.{1,2}/g)?.join(":") ?? trimmed;
}

const statements = [];
for (const { env, package: packageName } of PACKAGES) {
  const fp = normalizeFingerprint(process.env[env]);
  if (!fp) {
    console.warn(`skip assetlinks entry for ${packageName} (${env} not set)`);
    continue;
  }
  statements.push({
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [fp],
    },
  });
}

await mkdir(outDir, { recursive: true });

if (statements.length === 0) {
  await writeFile(
    outFile,
    `${JSON.stringify([], null, 2)}\n`,
    "utf8"
  );
  console.warn("wrote empty assetlinks.json — set ANDROID_SHA256_* env vars before Play Store TWA verification");
} else {
  await writeFile(outFile, `${JSON.stringify(statements, null, 2)}\n`, "utf8");
  console.log(`wrote assetlinks.json with ${statements.length} app(s)`);
}
