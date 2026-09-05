// Copyright 2026 SZL Holdings — SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  FRONTIER_CATALOG_EVALUATED_AT,
  FRONTIER_RELEASES,
  evaluationDecision,
  isMaterialRelease,
  materialityScore,
  productionDisposition,
} from "../src/lib/frontier/release-catalog.js";

const HF_ORIGIN = "https://huggingface.co";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const RELEASE_WORDS = [
  "release", "released", "introducing", "announce", "announcing", "available now",
  "open weights", "checkpoint", "inference", "serving", "runtime", "framework",
];
const FRONTIER_WORDS = [
  "agent", "agents", "kernel", "webgpu", "triton", "flash attention", "inference engine",
  "vllm", "sglang", "text generation inference", "retrieval", "rerank", "reranker",
  "embedding", "multimodal", "vision language", "world model", "speech", "audio", "tts",
  "asr", "training", "post-training", "trl", "dpo", "grpo", "distillation", "quantization",
  "deployment", "kserve", "time series", "forecast", "anomaly detection",
];
const LOW_SIGNAL_WORDS = [
  "meetup", "conference", "workshop", "course", "tutorial", "opinion", "interview", "community event",
];
const TRUSTED_AUTHORS = new Set([
  "huggingface", "qdrant", "ibm-research", "kangliao", "nvidia", "qwen", "qwenlm",
  "deepseek-ai", "mistralai", "meta-llama", "cohere", "baai", "jinaai", "kyutai",
  "sentence-transformers", "mixedbread-ai", "microsoft", "google", "salesforce",
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableStringify(value)).digest("hex");
}

function decodeXml(value) {
  return value
    .replaceAll("<![CDATA[", "")
    .replaceAll("]]>", "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .trim();
}

function tag(block, name) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

export function parseHuggingFaceFeed(xml) {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi), ({ 0: block }) => {
    const primarySource = tag(block, "link") || tag(block, "guid");
    const path = (() => {
      try {
        return new URL(primarySource).pathname.split("/").filter(Boolean);
      } catch {
        return [];
      }
    })();
    const author = path[0] === "blog" && path.length > 2 ? path[1] : "huggingface";
    return {
      title: tag(block, "title"),
      primarySource,
      publishedAt: tag(block, "pubDate") || tag(block, "dc:date"),
      description: tag(block, "description"),
      author,
    };
  }).filter((item) => item.title && item.primarySource.startsWith(`${HF_ORIGIN}/blog/`));
}

export function editorialMateriality(item, cursor = FRONTIER_CATALOG_EVALUATED_AT) {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  let score = 20;
  const reasons = ["primary Hugging Face article"];
  if (TRUSTED_AUTHORS.has(String(item.author).toLowerCase())) {
    score += 20;
    reasons.push("trusted publisher");
  }
  if (RELEASE_WORDS.some((word) => haystack.includes(word))) {
    score += 20;
    reasons.push("release or availability signal");
  }
  const matchedFrontier = FRONTIER_WORDS.filter((word) => haystack.includes(word));
  if (matchedFrontier.length) {
    score += Math.min(35, 15 + matchedFrontier.length * 4);
    reasons.push(`frontier domains: ${matchedFrontier.slice(0, 5).join(", ")}`);
  }
  if (LOW_SIGNAL_WORDS.some((word) => haystack.includes(word))) {
    score -= 25;
    reasons.push("low-signal editorial/event penalty");
  }
  const published = Date.parse(item.publishedAt);
  const cutoff = Date.parse(cursor);
  const recent = Number.isFinite(published) && Number.isFinite(cutoff) && published > cutoff;
  if (recent) {
    score += 10;
    reasons.push("newer than admitted cursor");
  }
  return { score: Math.max(0, Math.min(100, score)), recent, reasons };
}

export function fingerprintCandidate(candidate) {
  return sha256({
    id: candidate.id,
    source: candidate.primarySource,
    revision: candidate.sourceSnapshot?.revision ?? null,
    lastModified: candidate.sourceSnapshot?.lastModified ?? null,
    inventoryCount: candidate.sourceSnapshot?.inventoryCount ?? null,
    observedKey: candidate.observedKey ?? null,
  });
}

function artifactRows(payload) {
  return (Array.isArray(payload?.siblings) ? payload.siblings : [])
    .filter((item) => item && typeof item.rfilename === "string")
    .map((item) => ({
      name: item.rfilename,
      size: item.size ?? item.lfs?.size ?? null,
      oid: item.lfs?.oid ?? item.blobId ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function snapshotHubAsset(kind, repoId, payload) {
  return {
    kind,
    repoId,
    revision: payload?.sha ?? null,
    createdAt: payload?.createdAt ?? null,
    lastModified: payload?.lastModified ?? null,
    private: Boolean(payload?.private),
    gated: Boolean(payload?.gated),
    disabled: Boolean(payload?.disabled),
    downloads: Number.isFinite(payload?.downloads) ? payload.downloads : null,
    likes: Number.isFinite(payload?.likes) ? payload.likes : null,
    pipelineTag: payload?.pipeline_tag ?? null,
    libraryName: payload?.library_name ?? null,
    license: payload?.cardData?.license ?? null,
    artifactFingerprint: sha256(artifactRows(payload)),
  };
}

export function snapshotHuggingFaceBlog(release, html, metadata = {}) {
  if (typeof html !== "string" || !html.trim()) throw new Error("blog response is empty");
  if (!/<html\b/i.test(html)) throw new Error("blog response is not HTML");
  const titleMatch = html.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
  const publishedMatch = html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
  const mainMatch = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  if (!mainMatch) throw new Error("blog response is missing canonical main content");
  const artifactFingerprint = sha256(mainMatch[0]);
  return {
    kind: "blog",
    repoId: release.watch.repoId ?? null,
    title: titleMatch ? decodeXml(titleMatch[1]).replace(/\s+/g, " ").trim() : null,
    catalogReleasedAt: release.releasedAt ?? null,
    publishedAt: publishedMatch ? publishedMatch[1] : null,
    lastModified: metadata.lastModified ?? null,
    finalUrl: metadata.finalUrl ?? release.artifactSource,
    contentBytes: Buffer.byteLength(mainMatch[0]),
    revision: artifactFingerprint,
    artifactFingerprint,
    private: false,
    gated: false,
    disabled: false,
  };
}

function changedAfterCursor(snapshot, cursor) {
  const modified = Date.parse(snapshot.lastModified ?? snapshot.createdAt ?? "");
  const cutoff = Date.parse(cursor);
  return Number.isFinite(modified) && Number.isFinite(cutoff) && modified > cutoff;
}

export function catalogCandidate(release, sourceSnapshot, cursor = FRONTIER_CATALOG_EVALUATED_AT) {
  const publicAndUsable = !sourceSnapshot.private && !sourceSnapshot.gated && !sourceSnapshot.disabled;
  const inventoryExpanded =
    release.watch.kind === "model-inventory" &&
    Number(sourceSnapshot.inventoryCount) > Number(release.watch.baselineCount ?? 0);
  const blogContentChanged =
    release.watch.kind === "blog" &&
    sourceSnapshot.artifactFingerprint !== release.watch.baselineFingerprint;
  const changed = inventoryExpanded || blogContentChanged || changedAfterCursor(sourceSnapshot, cursor);
  const score = materialityScore(release);
  const candidate = {
    id: release.id,
    title: release.title,
    publisher: release.publisher,
    category: release.category,
    primarySource: release.primarySource,
    artifactSource: release.artifactSource,
    whyItMatters: release.whyItMatters,
    operationalTarget: release.operationalTarget,
    targetOrgans: release.targetOrgans,
    maturity: release.maturity,
    license: release.license,
    licensePosture: release.licensePosture,
    evaluationDecision: evaluationDecision(release),
    productionDisposition: productionDisposition(release),
    materialityScore: score,
    sourceSnapshot,
    observedKey: `${sourceSnapshot.revision ?? "none"}:${sourceSnapshot.artifactFingerprint ?? "none"}:${sourceSnapshot.inventoryCount ?? "none"}`,
    material: isMaterialRelease(release) && publicAndUsable && changed,
    reasons: [
      `catalog score ${score}/100`,
      blogContentChanged
        ? "blog content fingerprint changed from the admitted baseline"
        : changed
          ? "upstream source changed after the admitted cursor"
          : "no upstream change after the admitted cursor",
      publicAndUsable ? "source is public and ungated" : "source is private, gated, disabled, or unavailable",
    ],
  };
  return { ...candidate, fingerprint: fingerprintCandidate(candidate) };
}

async function readBounded(response) {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_RESPONSE_BYTES) throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
  return text;
}

async function fetchBoundedResource(
  url,
  {
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    accept = "application/json",
    allowedOrigin = null,
  } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: accept, "User-Agent": "SZL-Frontier-Watch/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    if (allowedOrigin) {
      const finalOrigin = new URL(response.url || url).origin;
      if (finalOrigin !== allowedOrigin) throw new Error(`response left allowed origin: ${finalOrigin}`);
    }
    return {
      body: await readBounded(response),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      finalUrl: response.url || String(url),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchBounded(url, options = {}) {
  return (await fetchBoundedResource(url, options)).body;
}

async function probeRelease(release, fetchImpl) {
  const watch = release.watch;
  if (watch.kind === "model" || watch.kind === "dataset") {
    const plural = watch.kind === "model" ? "models" : "datasets";
    const url = `${HF_ORIGIN}/api/${plural}/${watch.repoId}`;
    const payload = JSON.parse(await fetchBounded(url, { fetchImpl }));
    return snapshotHubAsset(watch.kind, watch.repoId, payload);
  }
  if (watch.kind === "model-inventory") {
    const query = new URLSearchParams({
      author: watch.author,
      limit: "1000",
      full: "false",
      config: "false",
    });
    const payload = JSON.parse(
      await fetchBounded(`${HF_ORIGIN}/api/models?${query}`, { fetchImpl }),
    );
    if (!Array.isArray(payload)) throw new Error("model inventory response is not an array");
    const rows = payload
      .map((item) => ({
        id: item.id ?? item.modelId,
        sha: item.sha ?? null,
        lastModified: item.lastModified ?? null,
      }))
      .filter((item) => item.id)
      .sort((left, right) => left.id.localeCompare(right.id));
    return {
      kind: "model-inventory",
      author: watch.author,
      inventoryCount: rows.length,
      lastModified: rows.map((item) => item.lastModified).filter(Boolean).sort().at(-1) ?? null,
      revision: sha256(rows),
      artifactFingerprint: sha256(rows),
      private: false,
      gated: false,
      disabled: false,
    };
  }
  if (watch.kind === "blog") {
    if (!/^[a-f0-9]{64}$/.test(watch.baselineFingerprint ?? "")) {
      throw new Error("blog watch is missing an admitted content fingerprint baseline");
    }
    const source = new URL(release.artifactSource);
    if (source.origin !== HF_ORIGIN || !source.pathname.startsWith("/blog/")) {
      throw new Error("blog source must be an official Hugging Face blog URL");
    }
    const resource = await fetchBoundedResource(source, {
      fetchImpl,
      accept: "text/html, application/xhtml+xml",
      allowedOrigin: HF_ORIGIN,
    });
    return snapshotHuggingFaceBlog(release, resource.body, resource);
  }
  throw new Error(`unsupported watch kind: ${watch.kind}`);
}

export function feedCandidate(item, cursor = FRONTIER_CATALOG_EVALUATED_AT) {
  const assessment = editorialMateriality(item, cursor);
  const id = `hf-blog-${sha256(item.primarySource).slice(0, 16)}`;
  const candidate = {
    id,
    title: item.title,
    publisher: item.author,
    category: "frontier-discovery",
    primarySource: item.primarySource,
    artifactSource: item.primarySource,
    whyItMatters: assessment.reasons.join("; "),
    operationalTarget:
      "Review the primary source, identify the exact Hub artifact, and admit it to a bounded evaluation lane before execution.",
    targetOrgans: ["szl-frontier"],
    maturity: "unclassified",
    license: "review-required",
    licensePosture: "review-required",
    evaluationDecision: "REVIEW",
    productionDisposition: "HOLD",
    materialityScore: assessment.score,
    observedKey: item.publishedAt || item.primarySource,
    sourceSnapshot: { publishedAt: item.publishedAt, author: item.author },
    material: assessment.recent && assessment.score >= 70,
    reasons: assessment.reasons,
  };
  return { ...candidate, fingerprint: fingerprintCandidate(candidate) };
}

export async function runWatch({ fetchImpl = fetch, live = false } = {}) {
  const evaluatedThrough = new Date().toISOString();
  const sourceResults = [];
  const errors = [];
  const candidates = [];

  for (const release of FRONTIER_RELEASES) {
    if (!live) {
      sourceResults.push({ id: release.id, status: "dry", source: release.artifactSource });
      continue;
    }
    try {
      const snapshot = await probeRelease(release, fetchImpl);
      const candidate = catalogCandidate(release, snapshot);
      sourceResults.push({
        id: release.id,
        status: "ok",
        source: release.artifactSource,
        snapshot,
      });
      if (candidate.material) candidates.push(candidate);
    } catch (error) {
      errors.push({
        id: release.id,
        source: release.artifactSource,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (live) {
    try {
      const feed = await fetchBounded(`${HF_ORIGIN}/blog/feed.xml`, {
        fetchImpl,
        accept: "application/rss+xml, application/xml, text/xml",
      });
      const items = parseHuggingFaceFeed(feed);
      sourceResults.push({
        id: "hugging-face-blog-feed",
        status: "ok",
        source: `${HF_ORIGIN}/blog/feed.xml`,
        itemCount: items.length,
      });
      for (const item of items) {
        const candidate = feedCandidate(item);
        if (candidate.material) candidates.push(candidate);
      }
    } catch (error) {
      errors.push({
        id: "hugging-face-blog-feed",
        source: `${HF_ORIGIN}/blog/feed.xml`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const materialCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.fingerprint, candidate])).values(),
  ).sort(
    (left, right) =>
      right.materialityScore - left.materialityScore || left.title.localeCompare(right.title),
  );

  return {
    schema: "szl.frontier.watch-output.v1",
    evaluatedThrough,
    admittedCursor: FRONTIER_CATALOG_EVALUATED_AT,
    live,
    sourceCount: FRONTIER_RELEASES.length + 1,
    successfulSources: sourceResults.filter((item) => item.status === "ok").length,
    materialCandidates,
    sourceResults,
    errors,
    productionPromotion: false,
  };
}

export function hasCompleteSourceCoverage(report) {
  if (!report?.live || !Number.isInteger(report.sourceCount) || report.sourceCount < 1) return false;
  if (!Array.isArray(report.sourceResults) || !Array.isArray(report.errors)) return false;
  const successfulSources = report.sourceResults.filter((item) => item.status === "ok").length;
  return (
    report.errors.length === 0 &&
    successfulSources === report.sourceCount &&
    report.successfulSources === report.sourceCount
  );
}

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

async function main() {
  const live = process.argv.includes("--live");
  const output = argumentValue("--output", "frontier-watch-output.json");
  const report = await runWatch({ live });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      output,
      live,
      materialCandidates: report.materialCandidates.length,
      errors: report.errors.length,
    }),
  );
  if (live && !hasCompleteSourceCoverage(report)) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
