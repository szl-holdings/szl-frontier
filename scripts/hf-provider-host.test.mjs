// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

test("preview permits the Hugging Face provider suffix without an open wildcard", () => {
  const previewBlock = config.match(/preview:\s*\{[\s\S]*?\n\s*\},\n\s*resolve:/)?.[0];
  assert.ok(previewBlock, "vite preview configuration must remain explicit");
  const hostList = previewBlock.match(/allowedHosts:\s*(\[[^\]]*\])/);
  assert.ok(hostList, "preview must use a bounded host list");
  assert.deepEqual(JSON.parse(hostList[1]), [".hf.space", "frontier.a-11-oy.com"]);
  assert.doesNotMatch(previewBlock, /allowedHosts:\s*true/);
});
