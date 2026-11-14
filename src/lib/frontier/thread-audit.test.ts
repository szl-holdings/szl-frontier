import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  deploymentSourceRequestUrl,
  fetchDeploymentSourceRevision,
  sourcePayload,
} from "./source.ts";
import {
  MODELED_CENSUS,
  MODELED_TABS,
  THREAD_AUDIT_HOLD,
  THREAD_GAPS,
  THIS_ORGAN_LANES,
  ThreadAuditError,
  WIRED_TABS,
  assertThreadAuditHold,
  threadAuditContract,
} from "./thread-audit.ts";

test("thread audit hold cannot authorize or complete a file audit", () => {
  assertThreadAuditHold();
  assert.equal(THREAD_AUDIT_HOLD.productionAuthorization, false);
  assert.equal(THREAD_AUDIT_HOLD.optionalEvaluationLiftsHold, false);
  assert.equal(THREAD_AUDIT_HOLD.fileAuditComplete, false);
  assert.equal(THREAD_AUDIT_HOLD.sourceContentFilesRead, 0);
  assert.equal(THREAD_AUDIT_HOLD.envelopeAuthority, "NONE");
});

test("encoded census keeps kernels distinct from models and UNKNOWN off zero", () => {
  assert.notEqual(MODELED_CENSUS.hfKernels, MODELED_CENSUS.hfModels);
  assert.equal(MODELED_CENSUS.filesRead, 0);
  assert.equal(MODELED_CENSUS.fileAuditComplete, false);
  assert.equal(MODELED_CENSUS.qualification, "HOLD");
});

test("this organ set and gaps stay complete", () => {
  const doc = threadAuditContract();
  assert.deepEqual(doc.thisOrganLanes, [...THIS_ORGAN_LANES]);
  assert.equal(doc.handoffLaneCount, 17);
  assert.equal(doc.workstreamCount, 34);
  assert.equal(doc.turns.length, 10);
  assert.equal(doc.gaps.length, 8);
  assert.equal(THREAD_GAPS.find((row) => row.id === "G02")?.encoded, "REFUSED");
  assert.equal(THREAD_GAPS.find((row) => row.id === "G08")?.encoded, "UNKNOWN");
  assert.equal(doc.execution.mergeProtectedMain, false);
  assert.equal(doc.execution.networkInThisPayload, false);
  assert.equal(doc.liveGitHubHeadClass, "UNAVAILABLE");
});

test("wired tabs include modeled ten plus optional and audit", () => {
  assert.equal(MODELED_TABS.length, 10);
  assert.ok(WIRED_TABS.includes("optional"));
  assert.ok(WIRED_TABS.includes("audit"));
  assert.ok(threadAuditContract().apis.includes("/api/thread-audit"));
});

test("source identity labels modeled pin separately from deployment", () => {
  const bare = sourcePayload();
  assert.equal(bare.reconciledHeadClass, "MODELED");
  assert.equal(bare.liveGitHubHeadClass, "UNAVAILABLE");
  assert.equal(bare.deploymentSourceRevisionClass, "UNAVAILABLE");
  assert.equal(bare.headMatch, "UNAVAILABLE");
  assert.equal(bare.fileAuditComplete, false);

  const match = sourcePayload({
    deploymentSourceRevision: "b3aee6443b484768d1de107449918a050fe8528d",
  });
  assert.equal(match.deploymentSourceRevisionClass, "REACHABLE");
  assert.equal(match.deploymentSourceBound, true);
  assert.equal(match.reconciledPinMatch, "MATCH");
  assert.equal(match.headMatch, "UNAVAILABLE");

  const drift = sourcePayload({
    deploymentSourceRevision: "d47c988647641fbdd20711aac6148a34fcb97ef8",
  });
  assert.equal(drift.reconciledPinMatch, "DRIFT");
  assert.equal(drift.headMatch, "UNAVAILABLE");
  assert.equal(drift.runtimeVerified, false);

  const junk = sourcePayload({ deploymentSourceRevision: "not-a-sha" });
  assert.equal(junk.deploymentSourceRevisionClass, "UNAVAILABLE");
});

test("source readback uses the canonical Space only for that provider host", () => {
  const local = new Request("http://127.0.0.1:8080/api/source", {
    headers: { host: "127.0.0.1:8080" },
  });
  assert.equal(deploymentSourceRequestUrl(local), local.url);

  const provider = new Request("http://internal:7860/api/source", {
    headers: {
      host: "internal:7860",
      "x-forwarded-host": "szlholdings-szl-frontier.hf.space",
    },
  });
  assert.equal(
    deploymentSourceRequestUrl(provider),
    "https://szlholdings-szl-frontier.hf.space/api/source",
  );

  const product = new Request("https://frontier.a-11-oy.com/api/source", {
    headers: { host: "frontier.a-11-oy.com" },
  });
  assert.equal(
    deploymentSourceRequestUrl(product),
    "https://szlholdings-szl-frontier.hf.space/api/source",
  );

  const otherDeployment = new Request("https://preview.example/api/source", {
    headers: { host: "preview.example" },
  });
  assert.equal(deploymentSourceRequestUrl(otherDeployment), otherDeployment.url);
});

function deploymentResponse(opts?: {
  body?: string;
  contentType?: string;
  contentLength?: string | null;
  redirected?: boolean;
  status?: number;
  url?: string;
}) {
  const body =
    opts?.body ??
    JSON.stringify({
      schema: "szl.runtime-source/v1",
      source_repository: "szl-holdings/szl-frontier",
      source_revision: "d47c988647641fbdd20711aac6148a34fcb97ef8",
      surface: "SZLHOLDINGS/szl-frontier",
      authority: "protected-github-source",
    });
  const bytes = new TextEncoder().encode(body);
  const headers = new Map<string, string>([
    ["content-type", opts?.contentType ?? "application/json; charset=utf-8"],
  ]);
  if (opts?.contentLength !== null)
    headers.set("content-length", opts?.contentLength ?? String(bytes.byteLength));
  return {
    status: opts?.status ?? 200,
    redirected: opts?.redirected ?? false,
    url: opts?.url ?? "https://frontier.invalid/deployment.json",
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

test("deployment revision transport is bounded and redirect-intolerant", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const revision = await fetchDeploymentSourceRevision(
    "https://frontier.invalid/api/source?ignored=1",
    async (url, init) => {
      calls.push({ url: url.href, init });
      return deploymentResponse();
    },
  );
  assert.equal(revision, "d47c988647641fbdd20711aac6148a34fcb97ef8");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://frontier.invalid/deployment.json");
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.cache, "no-store");
  assert.deepEqual(calls[0].init.headers, { accept: "application/json" });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("deployment revision refuses redirected, off-target, oversized and malformed evidence", async () => {
  const cases = [
    deploymentResponse({ redirected: true }),
    deploymentResponse({ status: 302 }),
    deploymentResponse({ url: "https://elsewhere.invalid/deployment.json" }),
    deploymentResponse({ url: "https://frontier.invalid/other.json" }),
    deploymentResponse({ contentType: "text/html" }),
    deploymentResponse({ contentLength: "16385" }),
    deploymentResponse({ contentLength: "invalid" }),
    deploymentResponse({ contentLength: "1" }),
    deploymentResponse({ body: JSON.stringify({ source_revision: "ABC" }) }),
    deploymentResponse({ body: "[]" }),
  ];
  for (const response of cases) {
    assert.equal(
      await fetchDeploymentSourceRevision(
        "https://frontier.invalid/api/source",
        async () => response,
      ),
      null,
    );
  }
  assert.equal(
    await fetchDeploymentSourceRevision("file:///tmp/source", async () => deploymentResponse()),
    null,
  );
  assert.equal(
    await fetchDeploymentSourceRevision("not a URL", async () => deploymentResponse()),
    null,
  );
});

test("deployment revision requires the exact repository, surface, schema and authority", async () => {
  const identity = {
    schema: "szl.runtime-source/v1",
    source_repository: "szl-holdings/szl-frontier",
    source_revision: "d47c988647641fbdd20711aac6148a34fcb97ef8",
    surface: "SZLHOLDINGS/szl-frontier",
    authority: "protected-github-source",
  };
  const mismatches: Array<[keyof typeof identity, string]> = [
    ["schema", "szl.runtime-source/v2"],
    ["source_repository", "szl-holdings/another-repository"],
    ["surface", "SZLHOLDINGS/another-space"],
    ["authority", "unprotected-self-report"],
  ];
  for (const [field, value] of mismatches) {
    assert.equal(
      await fetchDeploymentSourceRevision("https://frontier.invalid/api/source", async () =>
        deploymentResponse({ body: JSON.stringify({ ...identity, [field]: value }) }),
      ),
      null,
      `accepted mismatched ${field}`,
    );
    const missing: Partial<typeof identity> = { ...identity };
    delete missing[field];
    assert.equal(
      await fetchDeploymentSourceRevision("https://frontier.invalid/api/source", async () =>
        deploymentResponse({ body: JSON.stringify(missing) }),
      ),
      null,
      `accepted missing ${field}`,
    );
  }
});

test("deployment revision refuses a body larger than its declared evidence limit", async () => {
  const body = JSON.stringify({ source_revision: "a".repeat(40), padding: "x".repeat(17_000) });
  assert.equal(
    await fetchDeploymentSourceRevision("https://frontier.invalid/api/source", async () =>
      deploymentResponse({ body, contentLength: null }),
    ),
    null,
  );
});

test("default fetch stops before a redirect destination is requested", async (context) => {
  let destinationHits = 0;
  const destination = createServer((_request, response) => {
    destinationHits += 1;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ source_revision: "f".repeat(40) }));
  });
  await new Promise<void>((resolve, reject) => {
    destination.once("error", reject);
    destination.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise<void>((resolve) => destination.close(() => resolve())));
  const destinationAddress = destination.address();
  assert.ok(destinationAddress && typeof destinationAddress === "object");

  let sourceHits = 0;
  const source = createServer((request, response) => {
    if (request.url !== "/deployment.json") {
      response.statusCode = 404;
      response.end();
      return;
    }
    sourceHits += 1;
    response.statusCode = 302;
    response.setHeader("location", `http://127.0.0.1:${destinationAddress.port}/redirected.json`);
    response.end();
  });
  await new Promise<void>((resolve, reject) => {
    source.once("error", reject);
    source.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise<void>((resolve) => source.close(() => resolve())));
  const sourceAddress = source.address();
  assert.ok(sourceAddress && typeof sourceAddress === "object");

  assert.equal(
    await fetchDeploymentSourceRevision(`http://127.0.0.1:${sourceAddress.port}/api/source`),
    null,
  );
  assert.equal(sourceHits, 1);
  assert.equal(destinationHits, 0);
});

test("assertThreadAuditHold is the fail-closed gate", () => {
  assert.equal(typeof assertThreadAuditHold, "function");
  assert.ok(ThreadAuditError.prototype instanceof Error);
});
