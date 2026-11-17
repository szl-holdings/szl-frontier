// SPDX-License-Identifier: Apache-2.0
/**
 * Native HTTP regression: the public action-preview route must NOT silently
 * inherit the shared development-user identity when auth is disabled.
 *
 * Runs against the freshly built source-owned local preview only. Never sends
 * credentials, never calls an external host and never executes an action.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.FRONTIER_ACTION_PREVIEW_SMOKE_PORT || 7885);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("Invalid local preview smoke port");
}
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [
  join(root, "node_modules", "vite", "bin", "vite.js"),
  "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort",
], {
  cwd: root,
  env: {
    ...process.env,
    DATABASE_URL: "",
    VITE_AUTH_ENABLED: "false",
    // Never inherit an explicit deployment callback origin in a local smoke.
    BETTER_AUTH_URL: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
for (const channel of [child.stdout, child.stderr]) {
  channel?.on("data", (chunk) => {
    if (log.length < 12_000) log += String(chunk).slice(0, 12_000 - log.length);
  });
}

try {
  let healthy = false;
  for (let round = 0; round < 100; round++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${origin}/api/health`, {
        method: "GET", redirect: "error", signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) { healthy = true; break; }
    } catch { /* Startup is observed by bounded polling, not guessed. */ }
    await sleep(200);
  }
  assert.ok(healthy, "Built local preview must answer health before the auth check");
  const response = await fetch(`${origin}/api/action-preview`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    credentials: "omit",
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
    body: JSON.stringify({
      kind: "collect-observation",
      assumedApproval: "approved",
      assumedOrganPaint: "ALLOW",
    }),
  });
  assert.equal(response.status, 401, "anonymous preview must not inherit dev-user");
  assert.equal(response.headers.get("x-szl-production-authorization"), "false");
  assert.equal(response.headers.get("x-szl-execution-authorized"), "false");
  assert.equal(response.headers.get("x-szl-effect-committed"), "false");
  assert.equal(response.headers.get("x-szl-authority"), "NONE");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.schema, "szl.covenant.counterfactual/v1");
  assert.equal(body.state, "REJECTED");
  assert.equal(body.reason, "UNAUTHENTICATED");
  assert.equal(body.executionAuthorized, false);
  console.log(JSON.stringify({
    check: "anonymous-action-preview",
    state: "PASS",
    http: response.status,
    executionAuthorized: false,
    productionAuthorization: false,
    note: "Local built HTTP negative test, not an authenticated positive or deployed proof",
  }));
} catch (error) {
  console.error("Action preview HTTP identity regression FAILED:", error instanceof Error ? error.message : "UNKNOWN");
  console.error("Bounded local preview log:", log.slice(-2000));
  process.exitCode = 1;
} finally {
  if (child.exitCode === null) {
    const closed = once(child, "exit").catch(() => null);
    child.kill("SIGTERM");
    await Promise.race([closed, sleep(3_000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}
