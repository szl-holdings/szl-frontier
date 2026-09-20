import { createServerFn } from "@tanstack/react-start";
import { SOURCE } from "./source";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12000;
const UA = "SZL-Frontier-Operator/1.0 (+https://github.com/szl-holdings/szl-frontier)";

type ProbeStatus = "MEASURED" | "UNAVAILABLE";

async function boundedGet(url: string): Promise<{ status: ProbeStatus; http: number | null; json: unknown; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": UA },
      redirect: "error",
      signal: ctrl.signal,
    });
    const raw = await res.arrayBuffer();
    if (raw.byteLength === 0 || raw.byteLength > MAX_BYTES) {
      return { status: "UNAVAILABLE", http: res.status, json: null, error: "SIZE" };
    }
    if (!res.ok) {
      return { status: "UNAVAILABLE", http: res.status, json: null, error: `HTTP_${res.status}` };
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
    return { status: "MEASURED", http: res.status, json: JSON.parse(text) };
  } catch (err) {
    return {
      status: "UNAVAILABLE",
      http: null,
      json: null,
      error: err instanceof Error ? err.name : "PROBE_FAILED",
    };
  } finally {
    clearTimeout(timer);
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

export const observeEstate = createServerFn({ method: "GET" }).handler(async () => {
  const started = new Date().toISOString();
  const [gh1, gh2, models, datasets, spaces] = await Promise.all([
    boundedGet("https://api.github.com/orgs/szl-holdings/repos?per_page=100&page=1&type=public&sort=full_name"),
    boundedGet("https://api.github.com/orgs/szl-holdings/repos?per_page=100&page=2&type=public&sort=full_name"),
    boundedGet("https://huggingface.co/api/models?author=SZLHOLDINGS&limit=100"),
    boundedGet("https://huggingface.co/api/datasets?author=SZLHOLDINGS&limit=100"),
    boundedGet("https://huggingface.co/api/spaces?author=SZLHOLDINGS&limit=100"),
  ]);

  const ghOk = gh1.status === "MEASURED";
  const ghItems = ghOk ? [...asArray(gh1.json), ...(gh2.status === "MEASURED" ? asArray(gh2.json) : [])] : [];
  const github = {
    family: "github" as const,
    status: ghOk ? ("MEASURED" as const) : ("UNAVAILABLE" as const),
    authenticated: false,
    itemsObserved: ghOk ? ghItems.length : null,
    paginationComplete: ghOk && gh2.status === "MEASURED" && asArray(gh2.json).length < 100,
    error: ghOk ? (gh2.status === "MEASURED" ? null : gh2.error ?? "PAGE_2") : gh1.error ?? "UNAVAILABLE",
    items: ghItems.slice(0, 160).map((r) => ({
      id: String(r.full_name ?? ""),
      private: Boolean(r.private),
      archived: Boolean(r.archived),
      defaultBranch: typeof r.default_branch === "string" ? r.default_branch : null,
      pushedAt: typeof r.pushed_at === "string" ? r.pushed_at : null,
      openIssues: typeof r.open_issues_count === "number" ? r.open_issues_count : null,
      description: typeof r.description === "string" ? r.description : null,
    })),
  };

  function hfFamily(
    name: "models" | "datasets" | "spaces",
    probe: Awaited<ReturnType<typeof boundedGet>>,
  ) {
    const ok = probe.status === "MEASURED";
    const rows = ok ? asArray(probe.json) : [];
    return {
      family: name,
      status: ok ? ("MEASURED" as const) : ("UNAVAILABLE" as const),
      itemsObserved: ok ? rows.length : null,
      error: ok ? null : probe.error ?? "UNAVAILABLE",
      items: rows.slice(0, 100).map((r) => ({
        id: String(r.id ?? r.modelId ?? ""),
        likes: typeof r.likes === "number" ? r.likes : null,
        downloads: typeof r.downloads === "number" ? r.downloads : null,
        runtime: typeof r.runtime === "string" ? r.runtime : r.runtime && typeof r.runtime === "object" ? "reported" : null,
        lastModified: typeof r.lastModified === "string" ? r.lastModified : null,
      })),
      note:
        name === "spaces"
          ? "RUNNING is not runtime-verified and is not production-ready."
          : "Membership is not qualification.",
    };
  }

  const huggingface = {
    models: hfFamily("models", models),
    datasets: hfFamily("datasets", datasets),
    spaces: hfFamily("spaces", spaces),
    kernels: {
      family: "kernels" as const,
      status: "UNAVAILABLE" as const,
      itemsObserved: null,
      error: "NO_PUBLIC_KERNELS_MEMBERSHIP_API",
      items: [],
      note: "Kernels family is UNKNOWN, not zero.",
    },
  };

  const frontier = github.items.find((r) => r.id === SOURCE.repository);

  return {
    schema: "szl.frontier.estate-observation/v1",
    startedAt: started,
    finishedAt: new Date().toISOString(),
    productionAuthorization: false,
    semanticReviewComplete: false,
    runtimeVerified: false,
    sourceContentFilesRead: 0,
    authenticatedScope: false,
    github,
    huggingface,
    counterparty: frontier
      ? {
          ok: frontier.id === SOURCE.repository && Boolean(frontier.defaultBranch),
          status: "MEASURED" as const,
          defaultBranch: frontier.defaultBranch,
          pushedAt: frontier.pushedAt,
        }
      : {
          ok: false,
          status: github.status,
          defaultBranch: null as string | null,
          error: github.error ?? "FRONTIER_REPO_NOT_IN_PAGE",
        },
    note: "Public metadata only. Tree hashing, LFS, private assets, and semantic review were not performed.",
  };
});

export const observeFrontierRepo = createServerFn({ method: "GET" }).handler(async () => {
  const probe = await boundedGet("https://api.github.com/repos/szl-holdings/szl-frontier");
  if (probe.status !== "MEASURED" || !probe.json || typeof probe.json !== "object") {
    return {
      ok: false,
      status: "UNAVAILABLE" as const,
      defaultBranch: null as string | null,
      sha: null as string | null,
      error: probe.error ?? "UNAVAILABLE",
    };
  }
  const data = probe.json as Record<string, unknown>;
  const ok = data.full_name === "szl-holdings/szl-frontier";
  return {
    ok,
    status: "MEASURED" as const,
    defaultBranch: typeof data.default_branch === "string" ? data.default_branch : null,
    pushedAt: typeof data.pushed_at === "string" ? data.pushed_at : null,
    sha: null,
    error: ok ? null : "NAME_MISMATCH",
  };
});
