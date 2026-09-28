import assert from "node:assert/strict";
import test from "node:test";
import {
  GROK_COMPLETION_SCHEMA,
  GROK_MODEL_ID,
  GROK_POLICY,
  RECEIPT_SIGNATURE_UNSIGNED,
  XAI_CHAT_COMPLETIONS_URL,
  backoffMs,
  completeGrok,
  parseRetryAfterMs,
  resolveGrokPolicy,
  type GrokDeps,
  type GrokRequest,
} from "./grok-client.ts";
import { GROK_MODEL_LABEL } from "./grok-model.ts";
import { assertEnvelopeHolds, sha256Hex } from "../frontier/receipt-envelope.ts";

const KEY = "xai-test-key-never-echoed";
const PROMPT = "Project: szl-frontier\nTheme: private design notes";
const REQUEST: GrokRequest = {
  maxTokens: 700,
  temperature: 0.4,
  messages: [
    { role: "system", content: "system prompt" },
    { role: "user", content: PROMPT },
  ],
};

type Step = (init: RequestInit) => Response | Promise<Response>;

/** Scripted fetch plus a fake clock whose sleep advances time without waiting. */
function harness(steps: Step[], extra: Partial<GrokDeps> = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const sleeps: number[] = [];
  let t = 1_000_000;
  const deps: GrokDeps = {
    env: { XAI_API_KEY: KEY },
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const step = steps[calls.length - 1];
      if (!step) throw new Error("unexpected extra fetch");
      return step(init ?? {});
    }) as typeof fetch,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    now: () => t,
    random: () => 0.5,
    ...extra,
  };
  return { deps, calls, sleeps, advance: (ms: number) => (t += ms) };
}

const ok =
  (content = "## RFC\nBody.", finish: string | null = "stop"): Step =>
  () =>
    new Response(
      JSON.stringify({
        model: GROK_MODEL_ID,
        choices: [{ message: { role: "assistant", content }, finish_reason: finish }],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
const status =
  (code: number, headers: Record<string, string> = {}): Step =>
  () =>
    new Response(`{"error":"provider said ${KEY}"}`, { status: code, headers });
/** Never answers; only the request's own timeout signal can end it. */
const hang: Step = (init) =>
  new Promise<Response>((_, reject) => {
    const signal = init.signal;
    if (!signal) return reject(new Error("request carried no timeout signal"));
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
const networkError: Step = () => {
  throw new TypeError("fetch failed");
};

test("the model pin is the single configured id", async () => {
  assert.equal(GROK_MODEL_ID, "grok-4.7");
  assert.equal(GROK_MODEL_LABEL, "Grok 4.7");
  const h = harness([ok()]);
  await completeGrok(REQUEST, h.deps);
  const sent = JSON.parse(String(h.calls[0].init.body));
  assert.equal(sent.model, GROK_MODEL_ID);
  assert.equal(sent.stream, false);
  assert.equal(h.calls[0].url, XAI_CHAT_COMPLETIONS_URL);
});

test("the request never carries parameters xAI rejects on reasoning models", async () => {
  // xAI documents that stop, presence_penalty and frequency_penalty return an
  // error on reasoning models, so the body is locked to exactly these keys.
  const h = harness([ok()]);
  await completeGrok(REQUEST, h.deps);
  const sent = JSON.parse(String(h.calls[0].init.body));
  assert.deepEqual(Object.keys(sent).sort(), [
    "max_tokens",
    "messages",
    "model",
    "stream",
    "temperature",
  ]);
});

test("missing or blank key fails closed without calling the provider", async () => {
  for (const env of [{}, { XAI_API_KEY: "" }, { XAI_API_KEY: "   " }]) {
    const h = harness([ok()], { env });
    const res = await completeGrok(REQUEST, h.deps);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "NO_API_KEY");
    assert.match(res.error, /XAI_API_KEY is not configured/);
    assert.equal(res.attempts, 0);
    assert.equal(h.calls.length, 0);
  }
});

test(
  "every request carries a timeout signal and a timeout is an error, not a retry",
  { timeout: 10_000 },
  async () => {
    const h = harness([hang, ok()], { policy: { attemptTimeoutMs: 25 } });
    const res = await completeGrok(REQUEST, h.deps);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "TIMEOUT");
    assert.equal(res.attempts, 1);
    assert.equal(h.calls.length, 1);
    assert.ok(h.calls[0].init.signal instanceof AbortSignal);
    assert.deepEqual(h.sleeps, []);
  },
);

test("429 then 200 succeeds after one jittered backoff", async () => {
  const h = harness([status(429), ok()]);
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, true);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.sleeps, [backoffMs(1, resolveGrokPolicy(), () => 0.5)]);
  if (res.ok) assert.equal(res.receipt.payload.attempts, 2);
});

test("5xx and network errors are retried", async () => {
  const h = harness([status(503), networkError, ok()]);
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, true);
  assert.equal(h.calls.length, 3);
  assert.equal(h.sleeps.length, 2);
});

test("a local failure after the provider answered is not retried as a network error", async () => {
  // The provider already answered (and billed) this request; a fault while
  // reading its answer must not trigger another provider call.
  const answered: Step = () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            finish_reason: "stop",
            get message(): never {
              throw new TypeError("local fault");
            },
          },
        ],
      }),
    }) as unknown as Response;
  const h = harness([answered, ok()]);
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.equal(res.code, "BAD_RESPONSE");
  assert.equal(res.attempts, 1);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.sleeps, []);
});

test("Retry-After is honoured in seconds and as an HTTP-date", async () => {
  const seconds = harness([status(429, { "Retry-After": "3" }), ok()]);
  assert.equal((await completeGrok(REQUEST, seconds.deps)).ok, true);
  assert.deepEqual(seconds.sleeps, [3000]);

  const date = harness([
    status(503, { "Retry-After": new Date(1_000_000 + 7_000).toUTCString() }),
    ok(),
  ]);
  // HTTP-dates have one-second resolution; the fake clock starts on a whole second.
  assert.equal((await completeGrok(REQUEST, date.deps)).ok, true);
  assert.deepEqual(date.sleeps, [7000]);
});

test("Retry-After is capped and invalid values fall back to backoff", async () => {
  const capped = harness([status(429, { "Retry-After": "600" }), ok()]);
  assert.equal((await completeGrok(REQUEST, capped.deps)).ok, true);
  assert.deepEqual(capped.sleeps, [GROK_POLICY.retryAfterCapMs]);

  for (const bad of ["-5", "soon", "Infinity", ""]) {
    const h = harness([status(429, { "Retry-After": bad }), ok()]);
    assert.equal((await completeGrok(REQUEST, h.deps)).ok, true);
    assert.deepEqual(h.sleeps, [backoffMs(1, resolveGrokPolicy(), () => 0.5)], bad);
  }
  assert.equal(parseRetryAfterMs(null, 0), null);
  assert.equal(parseRetryAfterMs("1.5", 0), 1500);
  assert.equal(parseRetryAfterMs("-5", 0), null);
  assert.equal(parseRetryAfterMs("2001", 0), 2_001_000);
});

test("4xx other than 429 is never retried and never echoes the key or body", async () => {
  for (const code of [400, 401, 403, 404, 422]) {
    const h = harness([status(code), ok()]);
    const res = await completeGrok(REQUEST, h.deps);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "HTTP_STATUS");
    assert.equal(res.error, `AI provider returned HTTP ${code}`);
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.sleeps, []);
    assert.ok(!JSON.stringify(res).includes(KEY));
  }
});

test("retries exhausted is an error and the final attempt never sleeps", async () => {
  const h = harness([status(503), status(502), status(429)]);
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, false);
  if (res.ok) return;
  assert.equal(res.code, "RETRIES_EXHAUSTED");
  assert.equal(res.attempts, GROK_POLICY.maxAttempts);
  assert.equal(h.calls.length, GROK_POLICY.maxAttempts);
  assert.equal(h.sleeps.length, GROK_POLICY.maxAttempts - 1);
  assert.ok(!res.error.includes(KEY));
});

test("the ceilings are pinned; loosening one is a reviewed change", () => {
  assert.deepEqual(
    { ...GROK_POLICY },
    {
      maxAttempts: 3,
      attemptTimeoutMs: 60_000,
      totalDeadlineMs: 90_000,
      backoffBaseMs: 500,
      backoffMaxMs: 4_000,
      retryAfterCapMs: 20_000,
    },
  );
  assert.ok(Object.isFrozen(GROK_POLICY));
});

test("overrides can only tighten the attempt and time ceilings", async () => {
  const loose = resolveGrokPolicy({
    maxAttempts: 50,
    totalDeadlineMs: 10_000_000,
    retryAfterCapMs: 1e9,
  });
  assert.equal(loose.maxAttempts, GROK_POLICY.maxAttempts);
  assert.equal(loose.totalDeadlineMs, GROK_POLICY.totalDeadlineMs);
  assert.equal(loose.retryAfterCapMs, GROK_POLICY.retryAfterCapMs);
  assert.equal(resolveGrokPolicy({ maxAttempts: 0 }).maxAttempts, GROK_POLICY.maxAttempts);
  assert.equal(resolveGrokPolicy({ maxAttempts: 1 }).maxAttempts, 1);

  const h = harness([status(503), status(503), status(503), status(503), ok()], {
    policy: { maxAttempts: 50 },
  });
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, false);
  assert.equal(h.calls.length, GROK_POLICY.maxAttempts);
});

test(
  "the total wall-clock deadline stops retries instead of sleeping past it",
  { timeout: 10_000 },
  async () => {
    const h = harness([status(429, { "Retry-After": "15" }), ok()], {
      policy: { totalDeadlineMs: 10_000 },
    });
    const res = await completeGrok(REQUEST, h.deps);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "DEADLINE");
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.sleeps, []);

    // A retry whose backoff would land past the deadline is refused without sleeping.
    const nearEnd = harness([], { policy: { totalDeadlineMs: 10_000 } });
    let nearEndCalls = 0;
    nearEnd.deps.fetch = (async () => {
      nearEndCalls += 1;
      nearEnd.advance(9_999);
      return new Response("", { status: 503 });
    }) as typeof fetch;
    const late = await completeGrok(REQUEST, nearEnd.deps);
    assert.equal(late.ok, false);
    if (!late.ok) assert.equal(late.code, "DEADLINE");
    assert.equal(nearEndCalls, 1);
    assert.deepEqual(nearEnd.sleeps, []);

    // A slow first attempt shrinks the next attempt's timeout to the remaining budget:
    // 10_000 total - 9_000 spent - 375 backoff = 625 ms left for attempt two.
    const slow = harness([], { policy: { totalDeadlineMs: 10_000 } });
    let slowCalls = 0;
    slow.deps.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      slowCalls += 1;
      if (slowCalls === 1) {
        slow.advance(9_000);
        return new Response("", { status: 503 });
      }
      return hang(init ?? {});
    }) as typeof fetch;
    const timedOut = await completeGrok(REQUEST, slow.deps);
    assert.equal(timedOut.ok, false);
    if (timedOut.ok) return;
    assert.equal(timedOut.code, "TIMEOUT");
    assert.equal(timedOut.error, "AI provider timed out after 625 ms");
    assert.equal(timedOut.attempts, 2);
    assert.deepEqual(slow.sleeps, [375]);
  },
);

test("a completion is accepted only with finish_reason stop, and is not retried", async () => {
  for (const finish of ["length", null, "content_filter"]) {
    const h = harness([ok("partial", finish), ok()]);
    const res = await completeGrok(REQUEST, h.deps);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.code, "INCOMPLETE");
    assert.match(res.error, new RegExp(`finish_reason=${finish ?? "missing"}`));
    assert.equal(h.calls.length, 1);
  }
  const empty = harness([ok("   ")]);
  const res = await completeGrok(REQUEST, empty.deps);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.code, "EMPTY");

  const garbled = harness([() => new Response("not json", { status: 200 })]);
  const bad = await completeGrok(REQUEST, garbled.deps);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.code, "BAD_RESPONSE");
});

test("receipt binds the completion by hash, is UNSIGNED_HONEST, and holds no prompt or key", async () => {
  const h = harness([status(500), ok("  ## RFC\nThe answer.  ")]);
  const res = await completeGrok(REQUEST, h.deps);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.text, "## RFC\nThe answer.");
  const { receipt } = res;
  assertEnvelopeHolds(receipt);
  assert.equal(receipt.kind, "completion");
  assert.equal(receipt.authority, "NONE");
  assert.equal(receipt.productionAuthorization, false);
  assert.equal(receipt.digestSha256.length, 64);
  const p = receipt.payload;
  assert.equal(p.schema, GROK_COMPLETION_SCHEMA);
  assert.equal(p.signature, RECEIPT_SIGNATURE_UNSIGNED);
  assert.equal(p.signature, "UNSIGNED_HONEST");
  assert.equal(p.model, GROK_MODEL_ID);
  assert.equal(p.providerModel, GROK_MODEL_ID);
  assert.equal(p.finishReason, "stop");
  assert.equal(p.attempts, 2);
  assert.equal(p.productionAuthorization, false);
  assert.equal(typeof p.latencyMs, "number");
  assert.ok(p.latencyMs >= 0);
  // The request hash covers the exact bytes sent; the response hash covers the returned text.
  assert.equal(p.requestSha256, await sha256Hex(String(h.calls[0].init.body)));
  assert.equal(String(h.calls[0].init.body), String(h.calls[1].init.body));
  assert.equal(p.responseSha256, await sha256Hex(res.text));
  const serialized = JSON.stringify(receipt);
  assert.ok(!serialized.includes(KEY));
  assert.ok(!serialized.includes("private design notes"));
  assert.ok(!serialized.includes("The answer."));
  // The key travels only in the Authorization header, never in the body.
  const headers = h.calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Bearer ${KEY}`);
  assert.ok(!String(h.calls[0].init.body).includes(KEY));
});
