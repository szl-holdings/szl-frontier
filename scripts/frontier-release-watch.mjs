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
import {
  ALERTABLE,
  classifyHubFiles,
  materialArtifactDelta,
} from "../src/lib/frontier/watch-materiality.js";

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
  return Array.from(xml.matchAll(/<item\\b[\\s\\S]*?<\\/item>/gi), ({ 0: block }) => {
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
