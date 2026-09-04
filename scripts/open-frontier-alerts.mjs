// Copyright 2026 SZL Holdings - SPDX-License-Identifier: Apache-2.0
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const REPORT_SCHEMA = "szl.frontier.watch-output.v1";
const RESULT_SCHEMA = "szl.frontier.alert-result.v1";
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const MAX_CANDIDATES = 25;
const MAX_ISSUE_PAGES = 10;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function safeText(value, maxLength) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, " ")
    .replaceAll("<!--", "&lt;!--")
    .replaceAll("-->", "--&gt;")
    .replaceAll("@", "@\u200b")
    .trim()
    .slice(0, maxLength);
}

function safeInline(value, maxLength) {
  return safeText(value, maxLength).replace(/\s+/gu, " ");
}

function validatedSource(value) {
  let source;
  try {
    source = new URL(value);
  } catch {
    throw new Error("candidate primarySource must be an absolute URL");
  }
  const providerOwned =
    source.hostname === "huggingface.co" || source.hostname.endsWith(".huggingface.co");
  if (
    source.protocol !== "https:" ||
    !providerOwned ||
    source.username ||
    source.password ||
    (source.port && source.port !== "443")
  ) {
    throw new Error("candidate primarySource must use provider-owned Hugging Face HTTPS");
  }
  return source.toString();
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("material candidate must be an object");
  }
  if (candidate.material !== true) throw new Error("candidate must remain material");
  if (candidate.productionDisposition !== "HOLD") {
    throw new Error("candidate productionDisposition must remain HOLD");
  }
  if (!FINGERPRINT_PATTERN.test(candidate.fingerprint ?? "")) {
    throw new Error("candidate fingerprint must be a lowercase SHA-256");
  }
  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    throw new Error("candidate title is required");
  }
  if (
    !Number.isInteger(candidate.materialityScore) ||
    candidate.materialityScore < 0 ||
    candidate.materialityScore > 100
  ) {
    throw new Error("candidate materialityScore must be an integer from 0 through 100");
  }
  if (!Array.isArray(candidate.reasons) || candidate.reasons.length > 20) {
    throw new Error("candidate reasons must be an array with at most 20 entries");
  }
  return {
    fingerprint: candidate.fingerprint,
    title: safeInline(candidate.title, 180),
    primarySource: validatedSource(candidate.primarySource),
    materialityScore: candidate.materialityScore,
    reasons: candidate.reasons.map((reason) => safeInline(reason, 500)).filter(Boolean),
  };
}

export function validateAlertReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("frontier report must be an object");
  }
  if (report.schema !== REPORT_SCHEMA) throw new Error(`frontier report schema must be ${REPORT_SCHEMA}`);
  if (report.live !== true) throw new Error("alerts require a live frontier report");
  if (report.productionPromotion !== false) {
    throw new Error("frontier report must explicitly prohibit production promotion");
  }
  if (!Array.isArray(report.materialCandidates)) {
    throw new Error("frontier report materialCandidates must be an array");
  }
  if (report.materialCandidates.length > MAX_CANDIDATES) {
    throw new Error(`frontier report exceeds the ${MAX_CANDIDATES}-candidate safety cap`);
  }
  const unique = new Map();
  for (const rawCandidate of report.materialCandidates) {
    const candidate = validateCandidate(rawCandidate);
    unique.set(candidate.fingerprint, candidate);
  }
  return Array.from(unique.values());
}

function marker(fingerprint) {
  return `<!-- szl-frontier-candidate:${fingerprint} -->`;
}

function issueBody(candidate) {
  const reasons = candidate.reasons.length
    ? candidate.reasons.map((reason) => `- ${reason}`)
    : ["- Materiality threshold met by the deterministic watcher."];
  return [
    marker(candidate.fingerprint),
    "## Governed frontier review",
    "",
    `**Primary source:** ${candidate.primarySource}`,
    `**Materiality score:** ${candidate.materialityScore}/100`,
    "**Production disposition:** HOLD",
    "**Production promotion:** false",
    "",
    "### Deterministic reasons",
    ...reasons,
    "",
    "This issue is evaluation intake only. It authorizes no code execution, weight download, training, deployment, credential expansion, or production promotion.",
    "",
  ].join("\n");
}

async function requestJson(
  url,
  { token, method = "GET", body, fetchImpl = fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method,
      redirect: "error",
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "SZL-Frontier-Alerts/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) {
      throw new Error(`GitHub API response exceeds ${MAX_RESPONSE_BYTES} bytes`);
    }
    if (!response.ok) {
      throw new Error(
        `GitHub API ${method} ${new URL(url).pathname} returned ${response.status}: ${safeInline(text, 200)}`,
      );
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

async function existingFingerprints(apiRoot, repository, token, fetchImpl) {
  const [owner, name] = repository.split("/").map(encodeURIComponent);
  const fingerprints = new Set();
  for (let page = 1; page <= MAX_ISSUE_PAGES; page += 1) {
    const url =
      `${apiRoot}/repos/${owner}/${name}/issues` +
      `?state=all&per_page=100&page=${page}&sort=created&direction=desc`;
    const rows = await requestJson(url, { token, fetchImpl });
    if (!Array.isArray(rows)) throw new Error("GitHub issue inventory response must be an array");
    for (const row of rows) {
      const body = typeof row?.body === "string" ? row.body : "";
      for (const match of body.matchAll(/<!-- szl-frontier-candidate:([0-9a-f]{64}) -->/gu)) {
        fingerprints.add(match[1]);
      }
    }
    if (rows.length < 100) return fingerprints;
  }
  throw new Error(`GitHub issue inventory exceeds ${MAX_ISSUE_PAGES * 100}; deduplication failed closed`);
}

export async function openFrontierAlerts(
  report,
  {
    token = process.env.GITHUB_TOKEN,
    repository = process.env.GITHUB_REPOSITORY,
    apiBase = process.env.GITHUB_API_URL ?? "https://api.github.com",
    fetchImpl = fetch,
  } = {},
) {
  const candidates = validateAlertReport(report);
  if (!candidates.length) {
    return { schema: RESULT_SCHEMA, candidates: 0, created: 0, duplicates: 0, issues: [] };
  }
  if (!token) throw new Error("GITHUB_TOKEN is required when material candidates exist");
  if (!REPOSITORY_PATTERN.test(repository ?? "")) {
    throw new Error("GITHUB_REPOSITORY must be an owner/name pair");
  }
  const parsedApiBase = new URL(apiBase);
  if (parsedApiBase.protocol !== "https:") throw new Error("GITHUB_API_URL must use HTTPS");
  const apiRoot = parsedApiBase.toString().replace(/\/$/u, "");
  const existing = await existingFingerprints(apiRoot, repository, token, fetchImpl);
  const [owner, name] = repository.split("/").map(encodeURIComponent);
  const issues = [];
  let duplicates = 0;
  for (const candidate of candidates) {
    if (existing.has(candidate.fingerprint)) {
      duplicates += 1;
      continue;
    }
    const created = await requestJson(`${apiRoot}/repos/${owner}/${name}/issues`, {
      token,
      method: "POST",
      fetchImpl,
      body: {
        title: `Frontier review: ${candidate.title}`,
        body: issueBody(candidate),
      },
    });
    if (!Number.isInteger(created?.number) || typeof created?.html_url !== "string") {
      throw new Error("GitHub issue creation response lacks immutable issue identity");
    }
    existing.add(candidate.fingerprint);
    issues.push({
      number: created.number,
      url: created.html_url,
      fingerprint: candidate.fingerprint,
    });
  }
  return {
    schema: RESULT_SCHEMA,
    candidates: candidates.length,
    created: issues.length,
    duplicates,
    issues,
  };
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("usage: node scripts/open-frontier-alerts.mjs <watch-output.json>");
  const report = JSON.parse(await readFile(input, "utf8"));
  console.log(JSON.stringify(await openFrontierAlerts(report)));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await main();
  } catch (error) {
    console.error(`[frontier-alerts] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
