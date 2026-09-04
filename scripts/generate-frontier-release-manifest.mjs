// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFrontierReleaseManifest } from "../src/lib/frontier/release-catalog.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "public/frontier/release-evaluation-manifest.v1.json");
const serialized = `${JSON.stringify(buildFrontierReleaseManifest(), null, 2)}\n`;
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(OUTPUT, "utf8");
  } catch (error) {
    console.error(`FRONTIER_MANIFEST_FAIL missing ${OUTPUT}: ${String(error)}`);
    process.exit(1);
  }
  if (current !== serialized) {
    console.error("FRONTIER_MANIFEST_FAIL checked-in release manifest is stale");
    process.exit(1);
  }
  console.log("FRONTIER_MANIFEST_OK release manifest matches canonical catalog");
} else {
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, serialized, "utf8");
  console.log(`FRONTIER_MANIFEST_WRITTEN ${OUTPUT}`);
}
