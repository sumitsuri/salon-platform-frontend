#!/usr/bin/env node
/**
 * Sync employee portal i18n: auth portal strings + employee namespace from en-IN.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, "../messages");
const en = JSON.parse(fs.readFileSync(path.join(messagesDir, "en-IN.json"), "utf8"));

const AUTH_KEYS = [
  "employeeSignInTitle",
  "employeeSignInHint",
  "managerSignInTitle",
  "managerSignInHint",
  "useEmployeeSignIn",
  "useManagerSignIn",
  "employeePortalBadge",
  "employeeSignInCta",
  "employeeLoginFeatureTime",
  "employeeLoginFeatureLeave",
  "employeeLoginManagerHint",
  "managerLoginEmployeeHint",
  "managerSignInShort",
  "employeeSignInShort",
];

const locales = fs
  .readdirSync(messagesDir)
  .filter((f) => f.endsWith(".json") && f !== "en-IN.json");

for (const file of locales) {
  const p = path.join(messagesDir, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  data.auth = data.auth ?? {};
  for (const key of AUTH_KEYS) {
    if (data.auth[key] === undefined && en.auth[key] !== undefined) {
      data.auth[key] = en.auth[key];
    }
  }
  if (data.staff && !data.employee) {
    data.employee = data.staff;
    delete data.staff;
  }
  if (!data.employee && en.employee) {
    data.employee = en.employee;
  }
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Updated ${file}`);
}
