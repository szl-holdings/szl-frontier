// SPDX-License-Identifier: Apache-2.0
// Offline proof that source, checked-in JSON and the Python consumer agree.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildFrontierReleaseManifest } from "../src/lib/frontier/release-catalog.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = "public/frontier/release-evaluation-manifest.v1.json";
const GENERATOR = "scripts/generate-frontier-release-manifest.mjs";
const CATALOG = "src/lib/frontier/release-catalog.js";

function run(command, args, cwd = ROOT, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8", timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null, "child process must terminate normally");
  return result;
}

function isolatedGenerator(callback) {
  const root = mkdtempSync(join(tmpdir(), "szl-frontier-projection-"));
  try {
    writeFileSync(join(root, "package.json"), '{"type":"module"}\n');
    for (const relative of [GENERATOR, CATALOG]) {
      mkdirSync(dirname(join(root, relative)), { recursive: true });
      copyFileSync(join(ROOT, relative), join(root, relative));
    }
    mkdirSync(dirname(join(root, MANIFEST)), { recursive: true });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function summary(row) {
  return Object.fromEntries(["id", "title", "category", "releasedAt", "materialityScore", "evaluationDecision", "productionDisposition", "primarySource", "targetOrgans"].map(key => [key, row[key]]));
}

const byId = (a, b) => a.id.localeCompare(b.id);

test("the checked-in public bytes exactly equal the current canonical catalog", () => {
  assert.equal(readFileSync(join(ROOT, MANIFEST), "utf8"), JSON.stringify(buildFrontierReleaseManifest(), null, 2) + "\n");
});

test("the actual Python CLI agrees with all JS-manifest policy summaries", () => {
  const child = run(process.env.PYTHON || "python3", ["-m", "szl_frontier", "list", "--min-score", "0"], ROOT,
    { ...process.env, PYTHONPATH: join(ROOT, "python"), PYTHONDONTWRITEBYTECODE: "1" });
  assert.equal(child.status, 0, child.stderr);
  const allPython = JSON.parse(child.stdout);
  assert.ok(Array.isArray(allPython));
  const python = allPython.filter(row => row.origin === "js-manifest").map(summary).sort(byId);
  const js = buildFrontierReleaseManifest().releases.map(summary).sort(byId);
  assert.ok(js.length > 0);
  assert.deepEqual(python, js, "a nonempty CLI output is not sufficient policy parity");
});

test("check-only rejects stale data without rewriting it into a pass", () => {
  isolatedGenerator(root => {
    const before = '{"releaseCount":7,"releases":[]}\n';
    writeFileSync(join(root, MANIFEST), before);
    const child = run(process.execPath, [GENERATOR, "--check"], root);
    assert.equal(child.status, 1);
    assert.match(child.stderr, /checked-in release manifest is stale/);
    assert.equal(readFileSync(join(root, MANIFEST), "utf8"), before);
  });
});

test("check-only rejects a missing projection without creating one", () => {
  isolatedGenerator(root => {
    const child = run(process.execPath, [GENERATOR, "--check"], root);
    assert.equal(child.status, 1);
    assert.match(child.stderr, /FRONTIER_MANIFEST_FAIL missing/);
    assert.equal(existsSync(join(root, MANIFEST)), false);
  });
});

test("explicit generation then check is deterministic in an isolated fixture", () => {
  isolatedGenerator(root => {
    assert.equal(run(process.execPath, [GENERATOR], root).status, 0);
    const bytes = readFileSync(join(root, MANIFEST), "utf8");
    assert.equal(bytes, readFileSync(join(ROOT, MANIFEST), "utf8"));
    assert.equal(run(process.execPath, [GENERATOR, "--check"], root).status, 0);
    assert.equal(readFileSync(join(root, MANIFEST), "utf8"), bytes);
  });
});
