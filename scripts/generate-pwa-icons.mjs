#!/usr/bin/env node
/** Generate PNG PWA icons from SVG (iOS install + manifest). */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svg = path.join(root, "public/icons/icon.svg");
const outDir = path.join(root, "public/icons");

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

await mkdir(outDir, { recursive: true });

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(path.join(outDir, name));
  console.log(`wrote ${name}`);
}
