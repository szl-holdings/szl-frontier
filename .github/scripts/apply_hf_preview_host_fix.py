#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Apply the bounded Hugging Face preview-host repair.

The public Space currently reaches Vite preview but is rejected with HTTP 403.
This change permits only the authoritative SZLHOLDINGS Space hostname and adds a
runtime regression proving that unrelated Host headers remain denied.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VITE = ROOT / "vite.config.ts"
WITNESS = ROOT / "scripts" / "check-hf-preview-host.mjs"
WORKFLOW = ROOT / ".github" / "workflows" / "frontier-proof.yml"

PREVIEW_OLD = '''  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },'''
PREVIEW_NEW = '''  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
    // Vite rejects unknown Host headers by design. Permit only the canonical
    // Hugging Face Space hostname; never use `true` or a broad wildcard.
    allowedHosts: ["szlholdings-szl-frontier.hf.space"],
  },'''

PROOF_OLD = '''      - name: Build exact source
        run: npm run build
      - name: Emit proof-carrying release witness
'''
PROOF_NEW = '''      - name: Build exact source
        run: npm run build
      - name: Prove Hugging Face preview host contract
        run: node scripts/check-hf-preview-host.mjs
      - name: Emit proof-carrying release witness
'''

WITNESS_CONTENT = r'''#!/usr/bin/env node
// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
// Runtime proof that the exact HF Space Host is admitted and lookalikes remain denied.
import { spawn } from "node:child_process";
import { request } from "node:http";

const PORT = Number(process.env.HF_HOST_PROOF_PORT || "7861");
const ALLOWED_HOST = "szlholdings-szl-frontier.hf.space";
const DENIED_HOST = "szlholdings-szl-frontier.hf.space.attacker.invalid";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function probe(hostHeader) {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/",
        method: "GET",
        headers: {
          Host: hostHeader,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
        timeout: 3000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: Number(res.statusCode || 0),
            contentType: String(res.headers["content-type"] || ""),
            bodyBytes: Buffer.concat(chunks).length,
          });
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("preview probe timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function waitForAllowedHost(child) {
  let lastError = "preview did not answer";
  for (let attempt = 1; attempt <= 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`preview exited before verification (code ${child.exitCode})`);
    }
    try {
      const result = await probe(ALLOWED_HOST);
      if (
        result.status >= 200 &&
        result.status < 400 &&
        result.contentType.toLowerCase().includes("text/html") &&
        result.bodyBytes > 0
      ) {
        return result;
      }
      lastError = `allowed host returned ${result.status} ${result.contentType}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(lastError);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(3000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const child = spawn(
  process.execPath,
  [
    "scripts/with-app-env.mjs",
    "vite",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let output = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    output = (output + chunk.toString("utf8")).slice(-8000);
  });
}

try {
  const allowed = await waitForAllowedHost(child);
  const denied = await probe(DENIED_HOST);
  if (denied.status !== 403) {
    throw new Error(`lookalike Host was not rejected: HTTP ${denied.status}`);
  }
  console.log(
    JSON.stringify(
      {
        schema: "szl.hf-preview-host-proof/v1",
        allowed_host: ALLOWED_HOST,
        allowed_status: allowed.status,
        denied_lookalike_host: DENIED_HOST,
        denied_status: denied.status,
        fail_closed: true,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(output);
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
} finally {
  await stop(child);
}
'''


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"expected exactly one anchor in {path}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def main() -> int:
    replace_once(VITE, PREVIEW_OLD, PREVIEW_NEW)
    replace_once(WORKFLOW, PROOF_OLD, PROOF_NEW)
    if WITNESS.exists():
        raise RuntimeError(f"refusing to overwrite existing {WITNESS}")
    WITNESS.write_text(WITNESS_CONTENT, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
