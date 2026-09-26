/**
 * Hardened xAI (Grok) chat-completions call. Framework-free so it runs under
 * `node --experimental-strip-types --test`.
 *
 * - Every request carries AbortSignal.timeout; the whole call has a hard
 *   wall-clock deadline and a hard attempt cap.
 * - Retries only on 429, 5xx and network errors, with exponential backoff and
 *   jitter; Retry-After is honoured but capped. A timed-out attempt is not
 *   retried. The final attempt never sleeps.
 * - A completion is accepted only with finish_reason "stop".
 * - Each accepted completion is bound to an UNSIGNED_HONEST receipt that holds
 *   hashes only: never prompts, completions or keys. Presence is not authority.
 */
import { GROK_MODEL_ID } from "./grok-model.ts";
import {
  sealReceipt,
  sha256Hex,
  stableCanonical,
  type ReceiptEnvelope,
} from "../frontier/receipt-envelope.ts";

export { GROK_MODEL_ID };
export const XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions";
export const GROK_COMPLETION_SCHEMA = "szl.frontier.grok-completion/v1";
export const RECEIPT_SIGNATURE_UNSIGNED = "UNSIGNED_HONEST";

/** Ceilings. Per-call overrides may only tighten these, never loosen them. */
export const GROK_POLICY = Object.freeze({
  maxAttempts: 3,
  attemptTimeoutMs: 60_000,
  totalDeadlineMs: 90_000,
  backoffBaseMs: 500,
  backoffMaxMs: 4_000,
  retryAfterCapMs: 20_000,
});
export type GrokPolicy = { -readonly [K in keyof typeof GROK_POLICY]: number };

export type GrokMsg = { role: "system" | "user" | "assistant"; content: string };
export type GrokRequest = { messages: GrokMsg[]; maxTokens: number; temperature: number };

export type GrokErrorCode =
  | "NO_API_KEY"
  | "TIMEOUT"
  | "DEADLINE"
  | "HTTP_STATUS"
  | "RETRIES_EXHAUSTED"
  | "BAD_RESPONSE"
  | "INCOMPLETE"
  | "EMPTY";

export type GrokCompletionReceipt = {
  schema: typeof GROK_COMPLETION_SCHEMA;
  model: string;
  providerModel: string | null;
  requestSha256: string;
  responseSha256: string;
  finishReason: "stop";
  latencyMs: number;
  attempts: number;
  signature: typeof RECEIPT_SIGNATURE_UNSIGNED;
  productionAuthorization: false;
};

export type GrokOk = {
  ok: true;
  text: string;
  receipt: ReceiptEnvelope<GrokCompletionReceipt>;
};
export type GrokErr = { ok: false; code: GrokErrorCode; error: string; attempts: number };
export type GrokResult = GrokOk | GrokErr;

export type GrokDeps = {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  policy?: Partial<GrokPolicy>;
};

/** Merge overrides into the ceilings; an override can only lower a value. */
export function resolveGrokPolicy(overrides: Partial<GrokPolicy> = {}): GrokPolicy {
  const out = { ...GROK_POLICY } as GrokPolicy;
  for (const key of Object.keys(out) as (keyof GrokPolicy)[]) {
    const value = overrides[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      out[key] = Math.min(out[key], value);
    }
  }
  out.maxAttempts = Math.max(1, Math.floor(out.maxAttempts));
  return out;
}

/**
 * Retry-After as milliseconds: delta-seconds or an HTTP-date. Missing, invalid,
 * negative or nonfinite values return null so the caller falls back to backoff.
 */
export function parseRetryAfterMs(value: string | null, nowMs: number): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
  }
  // Date.parse is lenient ("-5" parses as a year), so only GMT HTTP-dates are read.
  if (!/^[A-Za-z]{3},? .* GMT$/.test(raw)) return null;
  const at = Date.parse(raw);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, at - nowMs);
}

/** Exponential backoff with equal jitter: half fixed, half random. */
export function backoffMs(attempt: number, policy: GrokPolicy, random: () => number): number {
  const ceiling = Math.min(policy.backoffMaxMs, policy.backoffBaseMs * 2 ** (attempt - 1));
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function isAbort(err: unknown): boolean {
  const name = (err as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

/** Only short enum-like provider values are echoed back; anything else is withheld. */
function safeToken(value: unknown): string {
  return typeof value === "string" && /^[a-z_]{1,32}$/.test(value) ? value : "missing";
}

export async function completeGrok(req: GrokRequest, deps: GrokDeps = {}): Promise<GrokResult> {
  const env = deps.env ?? process.env;
  const apiKey = env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      code: "NO_API_KEY",
      error: "AI is unavailable in this environment: XAI_API_KEY is not configured",
      attempts: 0,
    };
  }
  const policy = resolveGrokPolicy(deps.policy);
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const random = deps.random ?? Math.random;
  const fail = (code: GrokErrorCode, error: string, attempts: number): GrokErr => ({
    ok: false,
    code,
    error,
    attempts,
  });

  // The exact bytes sent are the bytes hashed into the receipt.
  const requestText = stableCanonical({
    model: GROK_MODEL_ID,
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    messages: req.messages,
    stream: false,
  });
  const requestSha256 = await sha256Hex(requestText);
  const started = now();
  const deadline = started + policy.totalDeadlineMs;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      return fail("DEADLINE", "AI request exceeded its total time budget", attempt - 1);
    }
    const timeoutMs = Math.min(policy.attemptTimeoutMs, remaining);
    const signal = AbortSignal.timeout(timeoutMs);

    let reason: string;
    let retryAfterMs: number | null = null;
    let answered = false;
    try {
      const res = await fetchImpl(XAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: requestText,
        signal,
      });
      answered = true;
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        if (!isRetryableStatus(res.status)) {
          return fail("HTTP_STATUS", `AI provider returned HTTP ${res.status}`, attempt);
        }
        reason = `HTTP ${res.status}`;
        retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"), now());
      } else {
        let body: unknown;
        try {
          body = await res.json();
        } catch (err) {
          if (isAbort(err) || signal.aborted) {
            return fail("TIMEOUT", `AI provider timed out after ${timeoutMs} ms`, attempt);
          }
          return fail("BAD_RESPONSE", "AI provider returned an unreadable response", attempt);
        }
        const parsed = body as {
          model?: unknown;
          choices?: { message?: { content?: unknown }; finish_reason?: unknown }[];
        } | null;
        const choices = parsed?.choices;
        const choice = Array.isArray(choices) ? choices[0] : undefined;
        const finishReason = choice?.finish_reason;
        if (finishReason !== "stop") {
          return fail(
            "INCOMPLETE",
            `AI completion not accepted: finish_reason=${safeToken(finishReason)}`,
            attempt,
          );
        }
        const content = choice?.message?.content;
        const text = typeof content === "string" ? content.trim() : "";
        if (!text) return fail("EMPTY", "AI provider returned no completion", attempt);
        const payload: GrokCompletionReceipt = {
          schema: GROK_COMPLETION_SCHEMA,
          model: GROK_MODEL_ID,
          providerModel:
            typeof parsed?.model === "string" && parsed.model.length <= 128 ? parsed.model : null,
          requestSha256,
          responseSha256: await sha256Hex(text),
          finishReason: "stop",
          latencyMs: Math.max(0, now() - started),
          attempts: attempt,
          signature: RECEIPT_SIGNATURE_UNSIGNED,
          productionAuthorization: false,
        };
        return { ok: true, text, receipt: await sealReceipt({ kind: "completion", payload }) };
      }
    } catch (err) {
      if (isAbort(err) || signal.aborted) {
        return fail("TIMEOUT", `AI provider timed out after ${timeoutMs} ms`, attempt);
      }
      // Once the provider has answered, a local fault is not a network error:
      // retrying would bill another request for an answer already received.
      if (answered) {
        return fail("BAD_RESPONSE", "AI provider response could not be processed", attempt);
      }
      // Provider exceptions are not echoed: they can carry request details.
      reason = "network error";
    }

    if (attempt >= policy.maxAttempts) {
      return fail(
        "RETRIES_EXHAUSTED",
        `AI provider unavailable after ${attempt} attempts (last: ${reason})`,
        attempt,
      );
    }
    const delay =
      retryAfterMs !== null
        ? Math.min(retryAfterMs, policy.retryAfterCapMs)
        : backoffMs(attempt, policy, random);
    if (now() + delay >= deadline) {
      return fail(
        "DEADLINE",
        `AI provider unavailable within the time budget (last: ${reason})`,
        attempt,
      );
    }
    await sleep(delay);
  }
  // Unreachable: the loop returns on its final attempt.
  return fail("RETRIES_EXHAUSTED", "AI provider unavailable", policy.maxAttempts);
}
