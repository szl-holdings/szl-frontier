// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
// Frontier release witness: fail closed and bind evidence to exact source bytes.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const CRITICAL_PATHS = [
  "package-lock.json",
  "Dockerfile",
  "src/lib/covenant/engine.ts",
  "src/lib/covenant/gates.ts",
  "src/lib/covenant/types.ts",
  "src/lib/brain/index.ts",
  "src/stores/orchestrator.ts",
];

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

const missing = CRITICAL_PATHS.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error(`FRONTIER_PROOF_FAIL missing critical paths: ${missing.join(", ")}`);
  process.exit(1);
}

const files = CRITICAL_PATHS.map((path) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
});

const manifestBody = files
  .map(({ path, bytes, sha256: digest }) => `${path}\0${bytes}\0${digest}`)
  .join("\n");

const receipt = {
  schema: "szl.frontier.release-witness.v1",
  source_sha: process.env.GITHUB_SHA ?? "LOCAL",
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  doctrine: "v11",
  lambda_status: "Conjecture 1",
  fail_closed: true,
  critical_files: files,
  manifest_sha256: sha256(Buffer.from(manifestBody, "utf8")),
};

console.log(JSON.stringify(receipt, null, 2));
